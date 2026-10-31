export const LOAN_LIMITS = {
  Personal: {
    min: 50000,
    max: 1000000,
    minTenure: 12,
    maxTenure: 60,
    rate: 10.5,
  },
  Home: { min: 50000, max: 10000000, minTenure: 60, maxTenure: 360, rate: 8.5 },
  Business: {
    min: 50000,
    max: 5000000,
    minTenure: 12,
    maxTenure: 120,
    rate: 14,
  },
};

export const PIN_CODES = {
  110001: ["New Delhi", "Delhi"],
  380001: ["Ahmedabad", "Gujarat"],
  226001: ["Lucknow", "Uttar Pradesh"],
  400001: ["Mumbai", "Maharashtra"],
  560001: ["Bengaluru", "Karnataka"],
};

export function getPinDetails(pinCode) {
  const pin = String(pinCode || "").trim();

  if (!/^\d{6}$/.test(pin)) {
    return null;
  }

  return PIN_CODES[pin] || null;
}

export const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export function calculateEMI(principal, annualRate, months) {
  const P = Number(principal);
  const n = Number(months);
  if (!P || !n || n < 1) return 0;
  const r = Number(annualRate) / 1200;
  if (!r) return P / n;
  const factor = (1 + r) ** n;
  return (P * r * factor) / (factor - 1);
}

export function needsCoApplicant(data) {
  const amount = Number(data.loanAmount || 0);

  return (
    data.maritalStatus === "Married" ||
    data.loanType === "Home" ||
    (data.loanType === "Personal" && amount > 500000) ||
    (data.loanType === "Business" && amount > 2000000)
  );
}

export function getVisibleSteps(data = {}) {
  const steps = [1, 2, 3, 4, 5, 7, 8];

  if (needsCoApplicant(data)) {
    steps.splice(5, 0, 6);
  }

  return steps;
}

export function validatePan(pan, loanType = "Personal") {
  const value = String(pan || "")
    .toUpperCase()
    .trim();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) {
    return "PAN must use the format AAAAA9999A.";
  }
  const entity = value[3];
  const allowed = loanType === "Business" ? ["P", "C", "F"] : ["P"];
  if (!allowed.includes(entity)) {
    return loanType === "Business"
      ? "PAN 4th character must be P, C or F for this business-loan simulation."
      : "PAN 4th character must be P for an individual applicant.";
  }
  return "";
}

/* Verhoeff checksum tables. This validates checksum structure, not identity. */
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
export function isValidAadhaar(number) {
  const value = String(number || "").replace(/\s/g, "");
  if (!/^\d{12}$/.test(value)) return false;
  let checksum = 0;
  const digits = value.split("").reverse().map(Number);
  digits.forEach((digit, index) => {
    checksum = d[checksum][p[index % 8][digit]];
  });
  return checksum === 0 && !/^0|^1/.test(value);
}

export function estimateProcessingFee(amount) {
  return Math.min(25000, Math.max(2000, Number(amount || 0) * 0.01));
}

export function getDocumentRequirements(data) {
  const docs = [
    {
      id: "panCard",
      label: "PAN card copy",
      formats: ".pdf,.jpg,.jpeg,.png",
      maxMB: 5,
      required: !data.panVerified,
    },
    {
      id: "aadhaarFront",
      label: "Aadhaar card — front",
      formats: ".pdf,.jpg,.jpeg,.png",
      maxMB: 5,
      required: true,
    },
    {
      id: "aadhaarBack",
      label: "Aadhaar card — back",
      formats: ".pdf,.jpg,.jpeg,.png",
      maxMB: 5,
      required: true,
    },
    {
      id: "bankStatement",
      label: "Bank statements (last 6 months)",
      formats: ".pdf",
      maxMB: 10,
      required: true,
    },
    {
      id: "photo",
      label: "Passport-size photograph",
      formats: ".jpg,.jpeg,.png",
      maxMB: 2,
      required: true,
    },
  ];
  if (data.employmentType === "Salaried") {
    docs.push({
      id: "salarySlips",
      label: "Salary slips (last 3 months)",
      formats: ".pdf",
      maxMB: 5,
      required: true,
    });
  } else if (data.employmentType) {
    docs.push({
      id: "itr",
      label: "ITR (last 2 years)",
      formats: ".pdf",
      maxMB: 5,
      required: true,
    });
  }
  if (data.loanType === "Home") {
    docs.push({
      id: "propertyDocs",
      label: "Property documents",
      formats: ".pdf",
      maxMB: 10,
      required: true,
    });
  }
  if (data.loanType === "Business") {
    docs.push({
      id: "businessRegistration",
      label: "Business registration certificate",
      formats: ".pdf",
      maxMB: 5,
      required: true,
    });
    docs.push({
      id: "gstReturns",
      label: "GST returns (last 4 quarters)",
      formats: ".pdf",
      maxMB: 5,
      required: true,
    });
  }
  return docs;
}
