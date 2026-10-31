import Field from "../common/Field";
import { usePinCodeLookup } from "../../hooks/usePinCodeLookup";
const STATES = [
  "Andhra Pradesh",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Maharashtra",
  "Rajasthan",
  "Tamil Nadu",
  "Uttar Pradesh",
  "West Bengal",
];

const LOAN_LIMITS = {
  Personal: { min: 50000, max: 1000000, maxTenure: 60 },
  Home: { min: 50000, max: 10000000, maxTenure: 360 },
  Business: { min: 50000, max: 5000000, maxTenure: 120 },
};

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  error,
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      <select
        id={name}
        name={name}
        value={value || ""}
        onChange={onChange}
        required={required}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        <option value="">Select {label.toLowerCase()}</option>

        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${name}-error`} className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function RadioCards({ label, name, value, onChange, options }) {
  return (
    <fieldset className="field">
      <legend>
        {label} <span aria-hidden="true">*</span>
      </legend>

      <div className="radio-cards">
        {options.map((item) => (
          <label
            className={`radio-card ${value === item ? "selected" : ""}`}
            key={item}
          >
            <input
              type="radio"
              name={name}
              value={item}
              checked={value === item}
              onChange={onChange}
              required
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function StepFields({
  step,
  data,
  setValue,
  errors = {},
  onVerify = () => {},
  verification = {},
  affordability = {},
}) {
  const {
    lookupPinCode,
    isLoading: pinLookupLoading,
    error: pinLookupError,
    setError: setPinLookupError,
  } = usePinCodeLookup();

  const change = (name) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;

    setValue(name, value);

    if (name === "pinCode") {
      setValue("pinLookupError", "");
    }
  };

  const f = (label, name, type = "text", required = false, extra = {}) => (
    <Field
      key={name}
      label={label}
      name={name}
      type={type}
      value={data[name] ?? ""}
      onChange={change(name)}
      error={errors[name]}
      required={required}
      {...extra}
    />
  );

  const s = (label, name, options, required = false) => (
    <SelectField
      key={name}
      label={label}
      name={name}
      value={data[name]}
      onChange={change(name)}
      options={options}
      required={required}
      error={errors[name]}
    />
  );

  const radios = (label, name, options) => (
    <RadioCards
      key={name}
      label={label}
      name={name}
      value={data[name]}
      onChange={change(name)}
      options={options}
    />
  );

  const checkbox = (label, name) => (
  <label className="checkbox-row" key={name}>
    <input
      type="checkbox"
      checked={Boolean(data[name])}
      onChange={(e) => {
        const checked = e.target.checked;
        setValue(name, checked);

        if (name === "samePermanentAddress" && checked) {
          setValue("permanentAddress1", data.currentAddress1 || "");
          setValue("permanentAddress2", data.currentAddress2 || "");
          setValue("permanentPin", data.pinCode || "");
          setValue("permanentCity", data.city || "");
          setValue("permanentState", data.state || "");
        }
      }}
    />
    <span>{label}</span>
  </label>
);

  switch (step) {
    case 1: {
      const loanType = data.loanType || "Personal";
      const limits = LOAN_LIMITS[loanType] || LOAN_LIMITS.Personal;
      const minTenure = loanType === "Home" ? 60 : 12;

      return (
        <>
          <RadioCards
            label="Choose loan type"
            name="loanType"
            value={data.loanType}
            onChange={(e) => {
              setValue("loanType", e.target.value);
              setValue("tenure", "");
              setValue("loanPurpose", "");
            }}
            options={["Personal", "Home", "Business"]}
          />

          <div className="form-grid">
            {f("Loan amount (INR)", "loanAmount", "number", true, {
              min: limits.min,
              max: limits.max,
              step: 1000,
            })}

            {s(
              "Tenure (months)",
              "tenure",
              Array.from({ length: limits.maxTenure - minTenure + 1 }, (_, i) =>
                String(minTenure + i),
              ),
              true,
            )}

            {s(
              "Loan purpose",
              "loanPurpose",
              loanType === "Home"
                ? ["Purchase property", "Construction", "Renovation"]
                : loanType === "Business"
                  ? ["Working capital", "Equipment", "Expansion"]
                  : [
                      "Medical",
                      "Education",
                      "Travel",
                      "Debt consolidation",
                      "Other",
                    ],
              true,
            )}

            {f("Referral code (optional)", "referralCode", "text", false, {
              minLength: 6,
              maxLength: 10,
            })}
          </div>

          <p className="hint">
            Demo limits: Personal ₹10 lakh, Home ₹1 crore, Business ₹50 lakh.
          </p>

          {Number(data.loanAmount) > limits.max && (
            <p className="error">
              Maximum amount for a {loanType.toLowerCase()} loan is ₹
              {limits.max.toLocaleString("en-IN")}.
            </p>
          )}
        </>
      );
    }

    case 2:
      return (
        <div className="form-grid">
          {f("Full name (as per PAN)", "fullName", "text", true, {
            autoComplete: "name",
          })}
          {f("Date of birth", "dob", "date", true)}
          {radios("Gender", "gender", ["Male", "Female", "Other"])}
          {s(
            "Marital status",
            "maritalStatus",
            ["Single", "Married", "Divorced", "Widowed"],
            true,
          )}
          {f("Father's name", "fatherName", "text", true)}
          {f("Mother's name", "motherName", "text", true)}
          {f("Email", "email", "email", true, {
            autoComplete: "email",
          })}
          {f("Mobile number", "mobile", "tel", true, {
            maxLength: 10,
            pattern: "[0-9]{10}",
            autoComplete: "tel",
          })}
          {f("Alternate mobile (optional)", "alternateMobile", "tel", false, {
            maxLength: 10,
            pattern: "[0-9]{10}",
          })}
        </div>
      );

    case 3:
      return (
        <>
          <div className="form-grid">
            {f("PAN number", "pan", "text", true, {
              maxLength: 10,
              style: { textTransform: "uppercase" },
              pattern: "[A-Za-z]{5}[0-9]{4}[A-Za-z]",
            })}

            {f("Aadhaar number (12 digits)", "aadhaar", "password", true, {
              maxLength: 12,
              minLength: 12,
              inputMode: "numeric",
              pattern: "[0-9]{12}",
              autoComplete: "off",
            })}

            {f("Voter ID (optional)", "voterId")}

            {data.loanType === "Home" &&
              Number(data.loanAmount) > 5000000 &&
              f("Passport number", "passport", "text", true)}
          </div>

          {checkbox(
            "I consent to the Aadhaar verification simulation for this demo.",
            "aadhaarConsent",
          )}

          <div className="verify-row">
            <button
              type="button"
              className="button button-light"
              onClick={() => onVerify("pan")}
            >
              Verify PAN
            </button>

            {verification.pan && (
              <span
                className={
                  verification.pan === "Verified" ? "success-text" : "error"
                }
              >
                {verification.pan}
              </span>
            )}

            <button
              type="button"
              className="button button-light"
              onClick={() => onVerify("aadhaar")}
            >
              Verify Aadhaar
            </button>

            {verification.aadhaar && (
              <span
                className={
                  verification.aadhaar === "Verified" ? "success-text" : "error"
                }
              >
                {verification.aadhaar}
              </span>
            )}
          </div>

          <p className="hint">
            Demo only: verification is simulated. Do not enter real identity
            numbers.
          </p>
        </>
      );

    case 4:
      return (
        <>
          <div className="form-grid">
            {f("Current address line 1", "currentAddress1", "text", true)}
            {f("Current address line 2", "currentAddress2")}
            {f("PIN code", "pinCode", "text", true, {
              maxLength: 6,
              minLength: 6,
              inputMode: "numeric",
              pattern: "[0-9]{6}",
            })}
            
            {f("City", "city", "text", true)}
            {s("State", "state", STATES, true)}
            {s(
              "Residence type",
              "residenceType",
              ["Owned", "Rented", "Company", "Family"],
              true,
            )}
            
            {data.pinLookupState &&
  data.state &&
  data.state !== data.pinLookupState && (
    <p className="error" role="alert">
      Selected state does not match the state returned
      by the PIN code lookup.
    </p>
  )}
  

            {data.residenceType === "Rented" &&
              f("Monthly rent (INR)", "rentAmount", "number", true, {
                min: 0,
              })}

            {f("Years at current address", "yearsAtAddress", "number", true, {
              min: 0,
              max: 50,
            })}

            {data.yearsAtAddress !== "" &&
              data.yearsAtAddress !== undefined &&
              Number(data.yearsAtAddress) < 1 &&
              f("Previous address", "previousAddress", "text", true)}
          </div>

          <button
            type="button"
            className="button button-light"
            disabled={pinLookupLoading}
            onClick={async () => {
              const result = await lookupPinCode(data.pinCode);

              if (!result) return;

              setValue("city", result.city);
              setValue("state", result.state);
              setValue("postOffice", result.postOffice);
              setPinLookupError("");
            }}
          >
            {pinLookupLoading ? "Looking up..." : "Lookup PIN code"}
          </button>

          {pinLookupError && (
            <p className="error" role="alert">
              {pinLookupError}
            </p>
          )}

          {data.postOffice && (
            <p className="hint" role="status">
              Post office: {data.postOffice}
            </p>
          )}

          {data.pinLookupError && (
            <p className="hint" role="status">
              {data.pinLookupError}
            </p>
          )}

          {checkbox(
            "Permanent address is the same as current address",
            "samePermanentAddress",
          )}

          {!data.samePermanentAddress && (
            <div className="form-grid">
              {f("Permanent address line 1", "permanentAddress1", "text", true)}
              {f("Permanent address line 2", "permanentAddress2")}
              {f("Permanent PIN code", "permanentPin", "text", true, {
                maxLength: 6,
                minLength: 6,
                pattern: "[0-9]{6}",
              })}
              {f("Permanent city", "permanentCity", "text", true)}
              {s("Permanent state", "permanentState", STATES, true)}
            </div>
          )}
        </>
      );

    case 5:
      return (
        <>
          {radios("Employment type", "employmentType", [
            "Salaried",
            "Self-Employed",
            "Business Owner",
          ])}

          <div className="form-grid">
            {data.employmentType === "Salaried" && (
              <>
                {f("Company name", "companyName", "text", true)}
                {f("Designation", "designation", "text", true)}
                {f(
                  "Monthly net salary (INR)",
                  "monthlySalary",
                  "number",
                  true,
                  {
                    min: 15000,
                  },
                )}
              </>
            )}

            {data.employmentType && data.employmentType !== "Salaried" && (
              <>
                {f("Business name", "businessName", "text", true)}
                {s(
                  "Business type",
                  "businessType",
                  [
                    "Sole proprietorship",
                    "Partnership",
                    "Private limited",
                    "LLP",
                  ],
                  true,
                )}
                {f("Annual turnover (INR)", "annualTurnover", "number", true, {
                  min: 300000,
                })}
                {f("Years in business", "yearsInBusiness", "number", true, {
                  min: 2,
                })}
                {f("Monthly income (INR)", "monthlyIncome", "number", true, {
                  min: 0,
                })}
                {data.employmentType === "Business Owner" &&
                  f("GST number", "gstNumber", "text", true, {
                    maxLength: 15,
                  })}
              </>
            )}

            {f("Years of experience", "experienceYears", "number", true, {
              min: 0,
              max: 50,
            })}

            {data.employmentType !== "Salaried" &&
              data.loanType === "Business" &&
              f("Office/business address", "businessAddress", "text", true)}
          </div>

          {data.loanType === "Business" &&
            data.employmentType === "Salaried" && (
              <p className="error" role="alert">
                Business loan applicants must choose Self-Employed or Business
                Owner.
              </p>
            )}
        </>
      );

    case 6:
      return (
        <>
          <p className="hint">
            This step appears when the loan type or amount requires a
            co-applicant.
          </p>

          <div className="form-grid">
            {f("Co-applicant name", "coApplicantName", "text", true)}
            {s(
              "Relationship",
              "coApplicantRelationship",
              ["Spouse", "Parent", "Sibling", "Business Partner"],
              true,
            )}
            {f("Co-applicant PAN", "coApplicantPan", "text", true, {
              maxLength: 10,
              pattern: "[A-Za-z]{5}[0-9]{4}[A-Za-z]",
            })}
            {f(
              "Co-applicant monthly income (INR)",
              "coApplicantIncome",
              "number",
              true,
              { min: 0 },
            )}
          </div>

          {checkbox(
            "Co-applicant consents to this demo application.",
            "coApplicantConsent",
          )}
        </>
      );

    case 7:
      return (
        <p className="muted">
          Upload required documents below. Files are kept in this browser
          session for this demo; do not upload real identity documents.
        </p>
      );

    case 8:
      return (
        <>
          <div className="summary-grid">
            <div className="summary-item">
              <span>Loan amount</span>
              <strong>
                {Number(data.loanAmount || 0).toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                })}
              </strong>
            </div>

            <div className="summary-item">
              <span>Tenure</span>
              <strong>{data.tenure || "—"} months</strong>
            </div>

            <div className="summary-item">
              <span>Indicative annual interest</span>
              <strong>
                {{ Personal: "10.5%", Home: "8.5%", Business: "14%" }[
                  data.loanType
                ] || "—"}
              </strong>
            </div>

            <div className="summary-item">
              <span>Estimated monthly EMI</span>
              <strong id="estimated-emi">
                {data.estimatedEmi || "Calculate from loan details"}
              </strong>
            </div>

            <div className="summary-item">
              <span>Processing fee</span>
              <strong>{data.processingFee || "—"}</strong>
            </div>

            <div className="summary-item">
              <span>Total interest cost</span>
              <strong>{data.totalCost || "—"}</strong>
            </div>
          </div>

          <p className="hint">
            This is an indicative educational estimate, not a loan offer or
            credit decision.
          </p>

          <h3>Review consents</h3>

          {checkbox(
            "I confirm that the information entered is accurate.",
            "consentAccuracy",
          )}
          {checkbox(
            "I authorise a simulated credit-bureau check.",
            "consentCredit",
          )}
          {checkbox(
            "I agree to the demo Terms and Conditions.",
            "consentTerms",
          )}
          {checkbox(
            "I consent to receive application-related communications.",
            "consentCommunications",
          )}
          {affordability !== null &&
            affordability !== undefined &&
            affordability > 0.5 && (
              <>
                <p className="notice warning" role="alert">
                  Your estimated EMI is more than 50% of your combined monthly
                  income. Review your repayment capacity carefully.
                </p>

                {checkbox(
                  "I acknowledge the affordability warning and want to continue with this demo application.",
                  "affordabilityConsent",
                )}

                {errors.affordabilityConsent && (
                  <p className="error" role="alert">
                    {errors.affordabilityConsent}
                  </p>
                )}
              </>
            )}
          {data.signature && (
            <div className="signature-preview">
              <p className="muted small">Captured signature</p>
              <img src={data.signature} alt="Applicant's captured signature" />
            </div>
          )}
        </>
      );

    default:
      return null;
  }
}
