
import { describe, it, expect } from "vitest";
import {
  LOAN_LIMITS,
  calculateEMI,
  needsCoApplicant,
  validatePan,
  isValidAadhaar,
  estimateProcessingFee,
  getDocumentRequirements,
} from "../utils/loan";

describe("Loan application validation and utilities", () => {
  it("defines loan limits for all three loan types", () => {
    expect(LOAN_LIMITS.Personal.max).toBe(1000000);
    expect(LOAN_LIMITS.Home.max).toBe(10000000);
    expect(LOAN_LIMITS.Business.max).toBe(5000000);
  });

  it("calculates a positive EMI for a valid loan", () => {
    expect(calculateEMI(100000, 10.5, 12)).toBeGreaterThan(0);
  });

  it("returns zero EMI for invalid loan inputs", () => {
    expect(calculateEMI(0, 10.5, 12)).toBe(0);
    expect(calculateEMI(100000, 10.5, 0)).toBe(0);
  });

  it("requires a co-applicant for home loans", () => {
    expect(needsCoApplicant({ loanType: "Home", loanAmount: 100000 })).toBe(true);
  });

  it("requires a co-applicant for personal loans above ₹5 lakh", () => {
    expect(needsCoApplicant({ loanType: "Personal", loanAmount: 600000 })).toBe(true);
    expect(needsCoApplicant({ loanType: "Personal", loanAmount: 500000 })).toBe(false);
  });

  it("accepts a correctly formatted individual PAN", () => {
    expect(validatePan("ABCPD1234F")).toBe("");
  });

  it("rejects an incorrectly formatted PAN", () => {
    expect(validatePan("ABC123")).not.toBe("");
  });

  it("rejects an individual PAN with an invalid entity character", () => {
    expect(validatePan("ABCCF1234D")).not.toBe("");
  });

  it("rejects Aadhaar values with the wrong length", () => {
    expect(isValidAadhaar("12345")).toBe(false);
  });

  it("calculates the minimum processing fee", () => {
    expect(estimateProcessingFee(10000)).toBe(2000);
  });

  it("caps the processing fee at ₹25,000", () => {
    expect(estimateProcessingFee(5000000)).toBe(25000);
  });

  it("includes property documents for home loans", () => {
    const docs = getDocumentRequirements({ loanType: "Home" });
    expect(docs.some((doc) => doc.id === "propertyDocs")).toBe(true);
  });

  it("includes business registration documents for business loans", () => {
    const docs = getDocumentRequirements({ loanType: "Business" });
    expect(docs.some((doc) => doc.id === "businessRegistration")).toBe(true);
    expect(docs.some((doc) => doc.id === "gstReturns")).toBe(true);
  });
});
