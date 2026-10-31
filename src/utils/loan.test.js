import { describe, it, expect } from "vitest";
import {
  LOAN_LIMITS,
  getPinDetails,
  formatINR,
  calculateEMI,
  needsCoApplicant,
  getVisibleSteps,
  validatePan,
  isValidAadhaar,
  estimateProcessingFee,
  getDocumentRequirements,
} from "./loan";

describe("Loan utilities", () => {
  it("defines limits for all loan types", () => {
    expect(LOAN_LIMITS.Personal.max).toBe(1000000);
    expect(LOAN_LIMITS.Home.maxTenure).toBe(360);
    expect(LOAN_LIMITS.Business.rate).toBe(14);
  });

  it("returns details for a supported PIN code", () => {
    expect(getPinDetails("400001")).toEqual(["Mumbai", "Maharashtra"]);
  });

  it("rejects invalid or unknown PIN codes", () => {
    expect(getPinDetails("123")).toBeNull();
    expect(getPinDetails("abcdef")).toBeNull();
    expect(getPinDetails("999999")).toBeNull();
  });

  it("formats currency in INR", () => {
    expect(formatINR(100000)).toContain("1,00,000");
  });

  it("calculates a positive EMI for valid loan details", () => {
    expect(calculateEMI(500000, 10.5, 60)).toBeGreaterThan(0);
  });

  it("returns zero EMI for invalid principal or tenure", () => {
    expect(calculateEMI(0, 10, 12)).toBe(0);
    expect(calculateEMI(100000, 10, 0)).toBe(0);
  });

  it("handles zero-interest EMI as principal divided by months", () => {
    expect(calculateEMI(120000, 0, 12)).toBe(10000);
  });

  it("requires a co-applicant for home loans", () => {
    expect(needsCoApplicant({ loanType: "Home", loanAmount: 100000 })).toBe(
      true,
    );
  });

  it("requires a co-applicant for a married applicant", () => {
    expect(
      needsCoApplicant({
        loanType: "Personal",
        loanAmount: 100000,
        maritalStatus: "Married",
      }),
    ).toBe(true);
  });

  it("shows Step 6 only when a co-applicant is required", () => {
    expect(
      getVisibleSteps({ loanType: "Personal", loanAmount: 100000 }),
    ).not.toContain(6);

    expect(getVisibleSteps({ loanType: "Home", loanAmount: 100000 })).toContain(
      6,
    );
  });

  it("accepts a valid individual PAN", () => {
    expect(validatePan("ABCPD1234F")).toBe("");
  });

  it("rejects an incorrectly formatted PAN", () => {
    expect(validatePan("ABC123")).not.toBe("");
  });

  it("rejects a non-individual PAN for a personal loan", () => {
    expect(validatePan("ABCCE1234F", "Personal")).not.toBe("");
  });

  it("accepts an eligible entity character for a business PAN", () => {
    expect(validatePan("ABCCE1234F", "Business")).toBe("");
  });

  it("validates Aadhaar format and checksum", () => {
    expect(isValidAadhaar("123")).toBe(false);
    expect(isValidAadhaar("000000000000")).toBe(false);
  });

  it("applies minimum and maximum processing fee limits", () => {
    expect(estimateProcessingFee(50000)).toBe(2000);
    expect(estimateProcessingFee(1000000)).toBe(10000);
    expect(estimateProcessingFee(5000000)).toBe(25000);
  });

  it("requires bank statements in PDF format", () => {
    const docs = getDocumentRequirements({
      employmentType: "Salaried",
      loanType: "Personal",
      panVerified: false,
    });

    const bankStatement = docs.find((doc) => doc.id === "bankStatement");

    expect(bankStatement.formats).toBe(".pdf");
    expect(bankStatement.required).toBe(true);
  });

  it("includes property documents for home loans", () => {
    const docs = getDocumentRequirements({
      loanType: "Home",
      employmentType: "Salaried",
    });

    expect(docs.some((doc) => doc.id === "propertyDocs")).toBe(true);
  });

  it("includes business documents for business loans", () => {
    const docs = getDocumentRequirements({
      loanType: "Business",
      employmentType: "Self-Employed",
    });

    expect(docs.some((doc) => doc.id === "businessRegistration")).toBe(true);
    expect(docs.some((doc) => doc.id === "gstReturns")).toBe(true);
    expect(docs.some((doc) => doc.id === "itr")).toBe(true);
  });

  it("requires a co-applicant above the personal loan threshold", () => {
    expect(
      needsCoApplicant({
        loanType: "Personal",
        loanAmount: 500000,
        maritalStatus: "Single",
      }),
    ).toBe(false);

    expect(
      needsCoApplicant({
        loanType: "Personal",
        loanAmount: 500001,
        maritalStatus: "Single",
      }),
    ).toBe(true);
  });

  it("requires a co-applicant above the business loan threshold", () => {
    expect(
      needsCoApplicant({
        loanType: "Business",
        loanAmount: 2000000,
        maritalStatus: "Single",
      }),
    ).toBe(false);

    expect(
      needsCoApplicant({
        loanType: "Business",
        loanAmount: 2000001,
        maritalStatus: "Single",
      }),
    ).toBe(true);
  });

  it("makes PAN copy optional when PAN is verified", () => {
    const docs = getDocumentRequirements({
      loanType: "Personal",
      employmentType: "Salaried",
      panVerified: true,
    });

    expect(docs.find((doc) => doc.id === "panCard").required).toBe(false);
  });

  it("does not require salary slips for self-employed applicants", () => {
    const docs = getDocumentRequirements({
      loanType: "Personal",
      employmentType: "Self-Employed",
    });

    expect(docs.some((doc) => doc.id === "salarySlips")).toBe(false);
    expect(docs.some((doc) => doc.id === "itr")).toBe(true);
  });

  it("does not include business documents for a personal loan", () => {
    const docs = getDocumentRequirements({
      loanType: "Personal",
      employmentType: "Salaried",
    });

    expect(docs.some((doc) => doc.id === "businessRegistration")).toBe(false);
    expect(docs.some((doc) => doc.id === "gstReturns")).toBe(false);
  });

  it("includes co-applicant step for a married personal-loan applicant", () => {
    const steps = getVisibleSteps({
      loanType: "Personal",
      loanAmount: 100000,
      maritalStatus: "Married",
    });

    expect(steps).toContain(6);
  });
  it("returns null for an empty PIN code", () => {
    expect(getPinDetails("")).toBeNull();
    expect(getPinDetails(null)).toBeNull();
  });

  it("handles string and numeric values for EMI calculation", () => {
    expect(calculateEMI("120000", "0", "12")).toBe(10000);
  });

  it("returns zero EMI for negative tenure", () => {
    expect(calculateEMI(100000, 10, -12)).toBe(0);
  });

  it("normalizes PAN input by trimming spaces and converting to uppercase", () => {
    expect(validatePan(" abcpd1234f ")).toBe("");
  });

  it("rejects invalid individual PAN entity character", () => {
    expect(validatePan("ABCCD1234F", "Personal")).not.toBe("");
  });

  it("rejects an invalid business PAN entity character", () => {
  expect(validatePan("ABCAD1234F", "Business")).not.toBe("");
});

  it("does not require a co-applicant for a low-value single personal loan", () => {
    expect(
      needsCoApplicant({
        loanType: "Personal",
        loanAmount: 50000,
        maritalStatus: "Single",
      }),
    ).toBe(false);
  });

  it("returns the regular visible steps when no co-applicant is needed", () => {
    expect(
      getVisibleSteps({
        loanType: "Personal",
        loanAmount: 100000,
        maritalStatus: "Single",
      }),
    ).toEqual([1, 2, 3, 4, 5, 7, 8]);
  });

  it("requires Aadhaar input to contain exactly 12 digits", () => {
    expect(isValidAadhaar("12345678901")).toBe(false);
    expect(isValidAadhaar("1234567890123")).toBe(false);
    expect(isValidAadhaar("1234 5678 9012")).toBe(false);
  });

  it("returns a processing fee at the minimum for zero amount", () => {
    expect(estimateProcessingFee(0)).toBe(2000);
  });

  it("makes the PAN copy optional when PAN is verified", () => {
    const docs = getDocumentRequirements({
      loanType: "Personal",
      employmentType: "Salaried",
      panVerified: true,
    });

    expect(docs.find((doc) => doc.id === "panCard").required).toBe(false);
  });
});
