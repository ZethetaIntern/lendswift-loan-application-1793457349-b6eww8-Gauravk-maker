import { useEffect, useMemo, useRef, useState } from "react";
import { useAutoSave } from "./hooks/useAutoSave";
import StepFields from "./components/steps/StepFields";
import SignaturePad from "./components/common/SignaturePad";
import { useAuth } from "./context/AuthContext";
import { Link } from "react-router-dom";

import { getPinDetails } from "./utils/loan";

import {
  LOAN_LIMITS,
  calculateEMI,
  estimateProcessingFee,
  formatINR,
  getDocumentRequirements,
  getVisibleSteps,
  isValidAadhaar,
  needsCoApplicant,
  validatePan,
} from "./utils/loan";
import { decryptDraft, draftStorageKey } from "./utils/encryption";

const INITIAL = {
  loanType: "Personal",
  loanAmount: "300000",
  tenure: "36",
  loanPurpose: "Education",
  samePermanentAddress: true,
  employmentType: "Salaried",
  yearsAtAddress: "2",
  experienceYears: "2",
  documents: {},
  panVerified: false,
  aadhaarVerified: false,
};

const TITLES = {
  1: ["Loan details", "Tell us which loan works for you."],
  2: [
    "Personal information",
    "Enter your details exactly as they appear on your documents.",
  ],
  3: [
    "Identity verification",
    "This demo simulates identity checks. Never enter real identity numbers.",
  ],
  4: [
    "Address information",
    "We use your PIN code to simulate address assistance.",
  ],
  5: [
    "Employment & income",
    "Your employment type controls the fields and documents required.",
  ],
  6: ["Co-applicant", "Some loan applications require a co-applicant."],
  7: [
    "Documents & signature",
    "Upload the documents required for your selected loan.",
  ],
  8: [
    "Review & submit",
    "Review the indicative estimate and provide separate consents.",
  ],
};
const SIDEBAR_DESCRIPTIONS = {
  1: "Choose loan amount & repayment period",
  2: "Enter your personal details",
  3: "Verify PAN & Aadhaar details",
  4: "Provide your residential address",
  5: "Add employment & income details",
  6: "Provide co-applicant information",
  7: "Upload documents & add signature",
  8: "Review application & submit for approval",
};

const money = (value) => formatINR(Math.round(Number(value || 0)));
function getApplicantAge(dateValue) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const birthDate = new Date(year, month - 1, day);

  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - year;

  const birthdayNotReached =
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day);

  if (birthdayNotReached) age -= 1;

  return age;
}

function validateStep(step, data, verification) {
  const errors = {};

  const required = (name, label) => {
    if (!String(data[name] ?? "").trim()) {
      errors[name] = `${label} is required.`;
    }
  };

  if (step === 1) {
    required("loanType", "Loan type");
    required("loanAmount", "Loan amount");
    required("tenure", "Tenure");
    required("loanPurpose", "Loan purpose");

    const limits = LOAN_LIMITS[data.loanType] || LOAN_LIMITS.Personal;

    const amount = Number(data.loanAmount);

    if (data.loanAmount && (amount < limits.min || amount > limits.max)) {
      errors.loanAmount = `Enter an amount from ${money(limits.min)} to ${money(limits.max)}.`;
    }

    if (
      data.tenure &&
      (Number(data.tenure) < limits.minTenure ||
        Number(data.tenure) > limits.maxTenure)
    ) {
      errors.tenure = `Tenure must be ${limits.minTenure}–${limits.maxTenure} months.`;
    }

    if (data.dob && data.tenure) {
      const dob = new Date(`${data.dob}T00:00:00`);
      const today = new Date();

      let age = today.getFullYear() - dob.getFullYear();

      const birthdayNotReached =
        today.getMonth() < dob.getMonth() ||
        (today.getMonth() === dob.getMonth() &&
          today.getDate() < dob.getDate());

      if (birthdayNotReached) {
        age -= 1;
      }

      if (!Number.isNaN(dob.getTime()) && age >= 21 && age <= 65) {
        const maximumAgeBasedTenure = (65 - age) * 12;

        if (Number(data.tenure) > maximumAgeBasedTenure) {
          errors.tenure = `Based on your age, tenure cannot exceed ${maximumAgeBasedTenure} months.`;
        }
      }
    }

    if (data.referralCode && !/^[a-z0-9]{6,10}$/i.test(data.referralCode)) {
      errors.referralCode = "Referral code must be 6–10 letters or digits.";
    }
  }

  if (step === 2) {
    [
      "fullName",
      "dob",
      "gender",
      "maritalStatus",
      "fatherName",
      "motherName",
      "email",
      "mobile",
    ].forEach((key) => required(key, key.replace(/([A-Z])/g, " $1")));

    if (data.fullName && !/^[A-Za-z .'-]{2,100}$/.test(data.fullName)) {
      errors.fullName =
        "Use 2–100 letters, spaces, periods, apostrophes or hyphens.";
    }

    if (data.dob) {
      const age = getApplicantAge(data.dob);

      if (age === null || age < 21 || age > 65) {
        errors.dob = "Applicant age must be between 21 and 65 years.";
      } else if (data.tenure) {
        const limits = LOAN_LIMITS[data.loanType] || LOAN_LIMITS.Personal;

        const maxTenureByAge = Math.min(limits.maxTenure, (65 - age) * 12);

        if (
          Number(data.tenure) > maxTenureByAge ||
          maxTenureByAge < limits.minTenure
        ) {
          errors.tenure = `At age ${age}, the maximum eligible tenure for this loan is ${Math.max(
            0,
            maxTenureByAge,
          )} months. Please change your loan tenure.`;
        }
      }
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Enter a valid email address.";
    }

    if (data.mobile && !/^[6-9]\d{9}$/.test(data.mobile)) {
      errors.mobile =
        "Enter a 10-digit Indian mobile number starting with 6–9.";
    }

    if (
      data.alternateMobile &&
      (!/^[6-9]\d{9}$/.test(data.alternateMobile) ||
        data.alternateMobile === data.mobile)
    ) {
      errors.alternateMobile = "Enter a different valid mobile number.";
    }
  }

  if (step === 3) {
    required("pan", "PAN");
    required("aadhaar", "Aadhaar number");

    if (data.pan && validatePan(data.pan, data.loanType)) {
      errors.pan = validatePan(data.pan, data.loanType);
    }

    if (data.aadhaar && !isValidAadhaar(data.aadhaar)) {
      errors.aadhaar =
        "Enter a 12-digit number with a valid Verhoeff checksum.";
    }

    if (!data.aadhaarConsent) {
      errors.aadhaarConsent = "Consent is required.";
    }

    if (!data.panVerified || verification.pan !== "Verified") {
      errors.panVerification = "Verify PAN before continuing.";
    }

    if (!data.aadhaarVerified || verification.aadhaar !== "Verified") {
      errors.aadhaarVerification = "Verify Aadhaar before continuing.";
    }
  }

  if (data.voterId && !/^[A-Z]{3}\d{7}$/i.test(data.voterId.trim())) {
    errors.voterId = "Voter ID must contain 3 letters followed by 7 digits.";
  }

  if (data.loanType === "Home" && Number(data.loanAmount) > 5000000) {
    required("passport", "Passport number");

    if (data.passport && !/^[A-Z]\d{7}$/i.test(data.passport.trim())) {
      errors.passport = "Passport must contain 1 letter followed by 7 digits.";
    }
  }

  if (step === 4) {
    [
      "currentAddress1",
      "pinCode",
      "city",
      "state",
      "residenceType",
      "yearsAtAddress",
    ].forEach((key) => required(key, key));

    if (data.pinCode && !/^\d{6}$/.test(data.pinCode)) {
      errors.pinCode = "PIN code must be 6 digits.";
    }

    const pinDetails = getPinDetails(data.pinCode);

    if (pinDetails) {
      const [expectedCity, expectedState] = pinDetails;

      if (data.city?.trim().toLowerCase() !== expectedCity.toLowerCase()) {
        errors.city = `City must match PIN code ${data.pinCode}.`;
      }

      if (data.state !== expectedState) {
        errors.state = `State must match PIN code ${data.pinCode}.`;
      }
    }

    if (data.residenceType === "Rented") {
      required("rentAmount", "Monthly rent");

      const rent = Number(data.rentAmount);

      if (data.rentAmount !== "" && (!Number.isFinite(rent) || rent <= 0)) {
        errors.rentAmount = "Enter a valid monthly rent greater than zero.";
      }
    }

    if (data.yearsAtAddress !== "" && Number(data.yearsAtAddress) < 1) {
      required("previousAddress", "Previous address");
    }

    if (!data.samePermanentAddress) {
      [
        "permanentAddress1",
        "permanentPin",
        "permanentCity",
        "permanentState",
      ].forEach((key) => required(key, key));
    }

    if (data.permanentPin && !/^\d{6}$/.test(data.permanentPin)) {
      errors.permanentPin = "Permanent PIN code must be 6 digits.";
    }
  }

  if (step === 5) {
    required("employmentType", "Employment type");
    required("experienceYears", "Years of experience");

    if (data.loanType === "Business" && data.employmentType === "Salaried") {
      errors.employmentType =
        "Business loan requires Self-Employed or Business Owner.";
    }

    if (data.employmentType === "Salaried") {
      ["companyName", "designation", "monthlySalary"].forEach((key) =>
        required(key, key),
      );

      if (Number(data.monthlySalary) < 15000) {
        errors.monthlySalary = "Monthly net salary must be at least ₹15,000.";
      }
    } else if (data.employmentType) {
      [
        "businessName",
        "businessType",
        "annualTurnover",
        "yearsInBusiness",
        "monthlyIncome",
      ].forEach((key) => required(key, key));

      if (Number(data.annualTurnover) < 300000) {
        errors.annualTurnover = "Annual turnover must be at least ₹3,00,000.";
      }

      if (Number(data.yearsInBusiness) < 2) {
        errors.yearsInBusiness = "Must have at least 2 years in business.";
      }

      if (data.employmentType === "Business Owner") {
        required("gstNumber", "GST number");

        if (
          data.gstNumber &&
          !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(
            data.gstNumber.toUpperCase(),
          )
        ) {
          errors.gstNumber =
            "Enter a 15-character GST number in the expected format.";
        }
      }

      if (data.loanType === "Business") {
        required("businessAddress", "Office/business address");
      }
    }
  }

  if (step === 6 && needsCoApplicant(data)) {
    [
      "coApplicantName",
      "coApplicantRelationship",
      "coApplicantPan",
      "coApplicantIncome",
    ].forEach((key) => required(key, key));

    if (
      data.coApplicantPan &&
      validatePan(data.coApplicantPan, data.loanType)
    ) {
      errors.coApplicantPan = validatePan(data.coApplicantPan, data.loanType);
    }

    if (!data.coApplicantConsent) {
      errors.coApplicantConsent = "Co-applicant consent is required.";
    }
  }

  if (
    data.maritalStatus === "Married" &&
    data.coApplicantRelationship &&
    data.coApplicantRelationship !== "Spouse"
  ) {
    errors.coApplicantRelationship =
      "For a married applicant, select Spouse as the relationship.";
  }

  if (step === 7) {
    getDocumentRequirements(data)
      .filter((doc) => doc.required)
      .forEach((doc) => {
        if (!data.documents?.[doc.id]) {
          errors[doc.id] = `${doc.label} is required.`;
        }
      });

    if (!data.signature) {
      errors.signature = "Please capture your signature.";
    }
  }

  if (step === 8) {
    [
      "consentAccuracy",
      "consentCredit",
      "consentTerms",
      "consentCommunications",
    ].forEach((key) => {
      if (!data[key]) {
        errors[key] =
          "This consent is required to submit the demo application.";
      }
    });
  }

  return errors;
}

async function compressImage(file) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = objectUrl;

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const scale = Math.min(1, 1200 / image.width);
    const canvas = document.createElement("canvas");

    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Image processing is unavailable.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.7;

    let blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );

    while (blob && blob.size > 2 * 1024 * 1024 && quality > 0.3) {
      quality = Math.max(0.3, quality - 0.1);

      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
    }

    if (!blob) {
      return file;
    }

    return new File([blob], file.name.replace(/\.(png|jpe?g)$/i, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function App() {
  const headingRef = useRef(null);
  const resumeButtonRef = useRef(null);
  const successButtonRef = useRef(null);
  const [data, setData] = useState(INITIAL);
  const { user, signOut } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [verification, setVerification] = useState({
    pan: "",
    aadhaar: "",
  });
  const [notice, setNotice] = useState("");
  const [resumeDraft, setResumeDraft] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [submitted, setSubmitted] = useState("");
  const [uploading, setUploading] = useState("");

  const visibleSteps = useMemo(() => getVisibleSteps(data), [data]);

  useEffect(() => {
    if (!visibleSteps.includes(step)) {
      const previousVisibleStep = visibleSteps
        .filter((visibleStep) => visibleStep < step)
        .pop();

      setStep(previousVisibleStep ?? visibleSteps[0]);
      setErrors({});
      setNotice("");
    }
  }, [visibleSteps, step]);

  const currentIndex = visibleSteps.indexOf(step);

  const savedAt = useAutoSave(data, step, data.loanType, 30000);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (showResume) {
      resumeButtonRef.current?.focus();
    }
  }, [showResume]);

  useEffect(() => {
    if (submitted) {
      successButtonRef.current?.focus();
    }
  }, [submitted]);

  const limits = LOAN_LIMITS[data.loanType] || LOAN_LIMITS.Personal;

  const emi = calculateEMI(data.loanAmount, limits.rate, data.tenure);

  const income =
    Number(data.monthlySalary || data.monthlyIncome || 0) +
    Number(data.coApplicantIncome || 0);

  const affordability = income > 0 ? emi / income : null;

  // Resume only compatible, unexpired drafts.
  useEffect(() => {
    let active = true;

    async function findDraft() {
      const candidates = ["Personal", "Home", "Business"];

      for (const type of candidates) {
        const key = draftStorageKey(type);
        const raw = localStorage.getItem(key);

        if (!raw) continue;

        try {
          const draft = await decryptDraft(raw);

          const valid =
            draft.version === "2.0" &&
            draft.loanType === type &&
            draft.data &&
            typeof draft.data === "object" &&
            Number.isFinite(Number(draft.timestamp)) &&
            Date.now() - Number(draft.timestamp) < 72 * 60 * 60 * 1000;

          if (!valid) {
            localStorage.removeItem(key);
            continue;
          }

          if (active) {
            setResumeDraft(draft);
            setShowResume(true);
          }

          return;
        } catch {
          // An unreadable or old-format draft cannot be restored.
          localStorage.removeItem(key);
        }
      }
    }

    findDraft();

    return () => {
      active = false;
    };
  }, []);

  const setValue = (name, value) => {
    setData((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      if (name === "loanType") {
        next.loanAmount = "";
        next.tenure = "";
        next.loanPurpose = "";
        next.panVerified = false;
        next.aadhaarVerified = false;

        setVerification({
          pan: "",
          aadhaar: "",
        });
      }

      if (name === "samePermanentAddress" && value) {
        next.permanentAddress1 = previous.currentAddress1 || "";

        next.permanentAddress2 = previous.currentAddress2 || "";

        next.permanentPin = previous.pinCode || "";
        next.permanentCity = previous.city || "";
        next.permanentState = previous.state || "";
      }

      if (name === "pan" || name === "aadhaar") {
        next[name === "pan" ? "panVerified" : "aadhaarVerified"] = false;

        setVerification((previousVerification) => ({
          ...previousVerification,
          [name]: "",
        }));
      }

      return next;
    });

    setErrors((previous) => ({
      ...previous,
      [name]: "",
      panVerification: "",
      aadhaarVerification: "",
    }));

    setNotice("");
  };

  const verify = async (type) => {
    const value = String(data[type] || "")
      .toUpperCase()
      .trim();

    const error =
      type === "pan"
        ? validatePan(value, data.loanType)
        : !isValidAadhaar(value)
          ? "Aadhaar checksum/format invalid."
          : "";

    if (error || !value) {
      setVerification((previous) => ({
        ...previous,
        [type]: error || "Enter a value first.",
      }));

      return;
    }

    setVerification((previous) => ({
      ...previous,
      [type]: "Verifying…",
    }));

    // Simulated demo verification only.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setVerification((previous) => ({
      ...previous,
      [type]: "Verified",
    }));

    setData((previous) => ({
      ...previous,
      [type === "pan" ? "panVerified" : "aadhaarVerified"]: true,
    }));
  };

  const next = () => {
    const found = validateStep(step, data, verification);

    setErrors(found);

    if (step === 2 && found.tenure && Object.keys(found).length === 1) {
      setStep(1);
      setNotice(
        "Your age affects the maximum loan tenure. Please update the tenure.",
      );
      return;
    }

    if (Object.keys(found).length > 0) {
      setNotice("Please fix the highlighted fields before continuing.");
      return;
    }

    setNotice("");

    const index = visibleSteps.indexOf(step);

    if (index < visibleSteps.length - 1) {
      setStep(visibleSteps[index + 1]);
    }
  };

  const previous = () => {
    const index = visibleSteps.indexOf(step);

    if (index > 0) {
      setStep(visibleSteps[index - 1]);
      setErrors({});
      setNotice("");
    }
  };

  const upload = async (doc, file) => {
    
    if (!file) return;

    // Clear the previous error before validating a new selection.
    setErrors((previous) => ({
      ...previous,
      [doc.id]: "",
    }));

    const ext = `.${file.name.split(".").pop().toLowerCase()}`;

    const allowedFormats = doc.formats
      .split(",")
      .map((format) => format.trim().toLowerCase());

    if (!allowedFormats.includes(ext)) {
      setErrors((previous) => ({
        ...previous,
        [doc.id]: `Unsupported file format. Accepted: ${doc.formats}`,
      }));
      return;
    }

    // Check MIME type when the browser provides one.
    const mimeTypesByExtension = {
      ".pdf": ["application/pdf"],
      ".jpg": ["image/jpeg"],
      ".jpeg": ["image/jpeg"],
      ".png": ["image/png"],
      ".webp": ["image/webp"],
    };

    const allowedMimeTypes = allowedFormats.flatMap(
      (format) => mimeTypesByExtension[format] || []
    );

    if (
      file.type &&
      allowedMimeTypes.length > 0 &&
      !allowedMimeTypes.includes(file.type.toLowerCase())
    ) {
      setErrors((previous) => ({
        ...previous,
        [doc.id]: "The file content type does not match its extension.",
      }));
      return;
    }

    if (file.size === 0) {
      setErrors((previous) => ({
        ...previous,
        [doc.id]: "The selected file is empty. Please choose another file.",
      }));
      return;
    }

    if (file.size > doc.maxMB * 1024 * 1024) {
      setErrors((previous) => ({
        ...previous,
        [doc.id]: `File must be ${doc.maxMB} MB or smaller.`,
      }));
      return;
    }
    // Keep the existing try/catch/finally block below this point.
    setUploading(doc.id);

    try {
      const processed = await compressImage(file);

      const preview = processed.type.startsWith("image/")
        ? URL.createObjectURL(processed)
        : "";

      setData((previous) => {
        const oldPreview = previous.documents?.[doc.id]?.preview;

        if (oldPreview) {
          URL.revokeObjectURL(oldPreview);
        }

        return {
          ...previous,
          documents: {
            ...previous.documents,
            [doc.id]: {
              name: processed.name,
              size: processed.size,
              originalSize: file.size,
              type: processed.type,
              preview,
            },
          },
        };
      });

      setErrors((previous) => ({
        ...previous,
        [doc.id]: "",
      }));
    } catch {
      setErrors((previous) => ({
        ...previous,
        [doc.id]: "Could not process this file. Please try another file.",
      }));
    } finally {
      setUploading("");
    }
  };

  const submit = () => {
    const found = validateStep(8, data, verification);

    if (affordability !== null && affordability > 0.5) {
      if (!data.affordabilityConsent) {
        found.affordabilityConsent =
          "Please acknowledge the affordability warning before continuing.";
      }
    }

    setErrors(found);

    if (Object.keys(found).length > 0) {
      setNotice("Please review the errors before submitting.");
      return;
    }

    const reference = `LS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    setSubmitted(reference);
    localStorage.removeItem(draftStorageKey(data.loanType));
  };

  const startFresh = () => {
    if (resumeDraft?.loanType) {
      localStorage.removeItem(draftStorageKey(resumeDraft.loanType));
    }

    setData(INITIAL);
    setStep(1);
    setErrors({});
    setVerification({
      pan: "",
      aadhaar: "",
    });
    setNotice("");
    setShowResume(false);
    setResumeDraft(null);
  };

  const resume = () => {
    if (!resumeDraft?.data) {
      startFresh();
      return;
    }

    setData({
      ...INITIAL,
      ...resumeDraft.data,
      documents: {},
      signature: "",
      panVerified: false,
      aadhaarVerified: false,
    });

    setVerification({
      pan: "",
      aadhaar: "",
    });

    const resumedData = {
      ...INITIAL,
      ...resumeDraft.data,
      documents: {},
      signature: "",
      panVerified: false,
      aadhaarVerified: false,
    };

    setData(resumedData);

    setVerification({
      pan: "",
      aadhaar: "",
    });

    const requestedStep = Number(resumeDraft.step);
    const resumedVisibleSteps = getVisibleSteps(resumedData);

    const allowedStep = resumedVisibleSteps.includes(requestedStep)
      ? requestedStep
      : (resumedVisibleSteps
          .filter((visibleStep) => visibleStep < requestedStep)
          .pop() ?? 1);

    setStep(allowedStep);

    setErrors({});
    setNotice("");
    setShowResume(false);
    setResumeDraft(null);
  };

  const documentRequirements = getDocumentRequirements(data);

  const progress =
    visibleSteps.length > 0
      ? Math.round(((currentIndex + 1) / visibleSteps.length) * 100)
      : 0;

  return (
    <div className={`app-shell ${darkTheme ? "dark-theme" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to application
      </a>

      <header className="topbar">
        <a className="brand" href="/" aria-label="LendSwift home">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>

          <span>
            LendSwift
            <small>LOAN APPLICATION</small>
          </span>
        </a>

        <div className="topbar-right">
          <span className="secure-pill">
            <span className="secure-dot" aria-hidden="true" />
            Demo environment
          </span>

          <span className="saved-status" role="status" aria-live="polite">
            {savedAt
              ? `Privacy-filtered draft saved ${savedAt}`
              : "Local draft auto-save"}
          </span>

          <div className="account-menu-wrap">
            <button
              type="button"
              className="button button-primary account-menu-trigger"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              Account <span aria-hidden="true">⌄</span>
            </button>

            {accountMenuOpen && (
              <div className="account-dropdown" role="menu">
                <div className="account-menu-user">
                  <strong>
                    {user?.user_metadata?.full_name || "My Account"}
                  </strong>
                  <small>{user?.email}</small>
                </div>

                <Link
                  to="/settings?tab=profile"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  👤 User Profile
                </Link>

                <Link
                  to="/settings?tab=settings"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  ⚙️ Account Settings
                </Link>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDarkTheme((current) => !current);
                    setAccountMenuOpen(false);
                  }}
                >
                  🎨 Theme: {darkTheme ? "Dark" : "Light"}
                </button>

                <Link
                  to="/settings?tab=security"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  🔒 Security
                </Link>

                <Link
                  to="/settings?tab=notifications"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  🔔 Notifications
                </Link>

                <Link
                  to="/settings?tab=help"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  ❓ Help & Support
                </Link>

                <button
                  type="button"
                  className="account-logout"
                  role="menuitem"
                  onClick={async () => {
                    try {
                      await signOut();
                      setAccountMenuOpen(false);
                    } catch (error) {
                      console.error("Logout failed:", error);
                    }
                  }}
                >
                  ↪ Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="layout" id="main-content" tabIndex={-1}>
        <aside className="sidebar">
          <div className="sidebar-eyebrow">APPLICATION</div>

          <h2>One step closer to your goals.</h2>

          <p className="sidebar-copy">
            A simple, guided application. This demo saves a limited draft
            locally in this browser.
          </p>

          <nav className="step-list" aria-label="Application steps">
            {visibleSteps.map((stepNumber, index) => {
              const isCurrent = step === stepNumber;
              const isCompleted = stepNumber < step;

              return (
                <button
                  key={stepNumber}
                  type="button"
                  className={`step-item ${isCurrent ? "active" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => {
                    if (stepNumber < step) {
                      setStep(stepNumber);
                      setErrors({});
                      setNotice("");
                    }
                  }}
                  disabled={stepNumber > step}
                >
                  <span className="step-number" aria-hidden="true">
                    {isCompleted ? "✓" : index + 1}
                  </span>

                  <span className="step-info">
                    <strong>{TITLES[stepNumber]?.[0]}</strong>
                    <small>{SIDEBAR_DESCRIPTIONS[stepNumber]}</small>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="privacy-card">
            <span className="privacy-icon" aria-hidden="true">
              ✦
            </span>

            <strong>Your privacy matters</strong>

            <p>
              Use fictional test data only. This demo does not submit your
              application to a lender.
            </p>
          </div>
        </aside>

        <section className="main-panel" aria-labelledby="step-heading">
          <div className="mobile-progress">
            <div className="row between">
              <span>
                Step {currentIndex + 1} of {visibleSteps.length}
              </span>

              <strong>{progress}% complete</strong>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="Application progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="form-heading">
            <div className="eyebrow">LENDSWIFT / APPLICATION</div>

            <h1 ref={headingRef} tabIndex={-1} id="step-heading">
              {TITLES[step][0]}
            </h1>

            <p>{TITLES[step][1]}</p>
          </div>

          <div className="progress-desktop">
            <div className="row between">
              <span>Application progress</span>
              <strong>{progress}%</strong>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="Application progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>

          {notice && (
            <div
              className="notice"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {notice}
            </div>
          )}

          {Object.entries(errors).some(
            ([key, value]) => key.endsWith("Consent") && value,
          ) && (
            <p className="error" role="alert">
              One or more required consents are missing.
            </p>
          )}

          <div className="form-content">
            <StepFields
              step={step}
              data={data}
              setValue={setValue}
              errors={errors}
              onVerify={verify}
              verification={verification}
              affordability={affordability}
            />

            {step === 7 && (
              <div className="upload-list">
                {documentRequirements.map((doc) => (
                  <div className="upload-card" key={doc.id}>
                    <div className="upload-icon" aria-hidden="true">
                      ↥
                    </div>

                    <div className="upload-details">
                      <strong>
                        {doc.label}
                        {doc.required ? " *" : " (optional)"}
                      </strong>

                      <small>
                        {doc.formats.replaceAll(",", ", ")}
                        {" · "}
                        Max {doc.maxMB} MB
                      </small>

                      {data.documents?.[doc.id] && (
                        <div className="file-preview">
                          {data.documents[doc.id].preview && (
                            <img src={data.documents[doc.id].preview} alt="" />
                          )}

                          <span>
                            {data.documents[doc.id].name}

                            <small>
                              {(data.documents[doc.id].size / 1024).toFixed(0)}{" "}
                              KB
                              {data.documents[doc.id].originalSize !==
                                data.documents[doc.id].size &&
                                ` · was ${(
                                  data.documents[doc.id].originalSize / 1024
                                ).toFixed(0)} KB`}
                            </small>
                          </span>

                          <button
                            type="button"
                            className="text-button"
                            onClick={() => {
                              setData((previous) => {
                                const documents = {
                                  ...previous.documents,
                                };

                                if (documents[doc.id]?.preview) {
                                  URL.revokeObjectURL(
                                    documents[doc.id].preview,
                                  );
                                }

                                delete documents[doc.id];

                                return {
                                  ...previous,
                                  documents,
                                };
                              });
                            }}
                          >
                            Remove
                            <span className="sr-only"> {doc.label}</span>
                          </button>
                        </div>
                      )}

                      {errors[doc.id] && (
                        <p className="error" role="alert">
                          {errors[doc.id]}
                        </p>
                      )}
                    </div>

                    <label className="button button-light upload-button">
                      {uploading === doc.id
                        ? "Processing…"
                        : data.documents?.[doc.id]
                          ? "Replace"
                          : "Choose file"}

                      <input
                        type="file"
                        accept={doc.formats}
                        disabled={Boolean(uploading)}
                        aria-label={`Upload ${doc.label}`}
                        onChange={(event) => {
                          upload(doc, event.target.files?.[0]);

                          // Allows selecting the same file again.
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                ))}

                <div className="signature-section">
                  <h3>
                    Electronic signature <span className="required">*</span>
                  </h3>

                  <p className="muted small">
                    This is a demo signature, not a legally certified
                    e-signature.
                  </p>

                  <SignaturePad
                    value={data.signature}
                    onChange={(value) => setValue("signature", value)}
                  />

                  {errors.signature && (
                    <p className="error" role="alert">
                      {errors.signature}
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 8 && (
              <>
                {errors.affordability && (
                  <p className="notice warning" role="alert">
                    {errors.affordability}
                  </p>
                )}

                <div className="review-section">
                  <h3>Application details</h3>

                  <div className="review-row">
                    <span>Loan type</span>
                    <strong>{data.loanType}</strong>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setStep(1)}
                    >
                      Edit loan type
                    </button>
                  </div>

                  <div className="review-row">
                    <span>Applicant</span>
                    <strong>{data.fullName || "Not entered"}</strong>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setStep(2)}
                    >
                      Edit applicant
                    </button>
                  </div>

                  <div className="review-row">
                    <span>Employment</span>
                    <strong>{data.employmentType || "Not entered"}</strong>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setStep(5)}
                    >
                      Edit employment
                    </button>
                  </div>

                  <div className="review-row">
                    <span>Documents uploaded</span>
                    <strong>{Object.keys(data.documents || {}).length}</strong>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setStep(7)}
                    >
                      Edit documents
                    </button>
                  </div>
                </div>

                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Loan amount</span>
                    <strong>{money(data.loanAmount)}</strong>
                  </div>

                  <div className="summary-item">
                    <span>Tenure</span>
                    <strong>{data.tenure || "—"} months</strong>
                  </div>

                  <div className="summary-item">
                    <span>Indicative annual rate</span>
                    <strong>{limits.rate}%</strong>
                  </div>

                  <div className="summary-item">
                    <span>Estimated monthly EMI</span>
                    <strong>{money(emi)}</strong>
                  </div>

                  <div className="summary-item">
                    <span>Total interest cost</span>
                    <strong>
                      {money(
                        emi * Number(data.tenure || 0) -
                          Number(data.loanAmount || 0),
                      )}
                    </strong>
                  </div>

                  <div className="summary-item">
                    <span>Processing fee</span>
                    <strong>
                      {money(estimateProcessingFee(data.loanAmount))}
                    </strong>
                  </div>
                </div>

                {affordability !== null && (
                  <p className={affordability > 0.5 ? "error" : "success-text"}>
                    EMI / monthly income: {(affordability * 100).toFixed(1)}%{" "}
                    (must not exceed 50%).
                  </p>
                )}

                {data.signature && (
                  <div className="signature-preview">
                    <p className="muted small">Signature for review</p>

                    <img
                      src={data.signature}
                      alt="Applicant signature preview"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="form-footer">
            <div className="footer-left">
              {step > 1 && (
                <button
                  type="button"
                  className="button button-light"
                  onClick={previous}
                >
                  <span aria-hidden="true">← </span>
                  Back
                </button>
              )}

              <span className="muted small">* Required fields</span>
            </div>

            <div className="footer-right">
              {step < 8 ? (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={next}
                >
                  Continue <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={submit}
                >
                  Submit demo application <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>

          <p className="legal-note">
            LendSwift is a fictional project. All rates and calculations are
            indicative examples, not a credit offer. Identity verification is
            simulated; no lender is contacted.
          </p>
        </section>
      </main>
      {showResume && resumeDraft && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-title"
            aria-describedby="resume-description"
          >
            <div className="modal-icon" aria-hidden="true">
              ↻
            </div>

            <h2 id="resume-title">Resume your application?</h2>

            <p id="resume-description">
              We found a saved {resumeDraft.loanType} loan draft in this
              browser. Sensitive fields, uploaded documents and signature are
              not restored.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-light"
                onClick={startFresh}
              >
                Start fresh
              </button>

              <button
                ref={resumeButtonRef}
                type="button"
                className="button button-primary"
                onClick={resume}
              >
                Resume draft
              </button>
            </div>
          </div>
        </div>
      )}

      {submitted && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
            aria-describedby="success-description"
          >
            <div className="success-mark" aria-hidden="true">
              ✓
            </div>

            <h2 id="success-title">Demo application submitted</h2>

            <p id="success-description">Your local demo reference number is:</p>

            <div className="reference-number">{submitted}</div>

            <p className="muted small">
              No lender was contacted and no real loan application was created.
            </p>

            <button
              ref={successButtonRef}
              type="button"
              className="button button-primary full-width"
              onClick={() => {
                setSubmitted("");
                setData(INITIAL);
                setStep(1);
                setErrors({});
                setNotice("");
              }}
            >
              Start another demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
