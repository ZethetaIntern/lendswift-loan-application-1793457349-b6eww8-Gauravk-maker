import { describe, expect, it } from "vitest";
import {
  calculateEMI,
  estimateProcessingFee,
  formatINR,
  getDocumentRequirements,
  getPinDetails,
  getVisibleSteps,
  isValidAadhaar,
  needsCoApplicant,
  validatePan,
} from "./loan";

describe("loan utility edge cases", () => {
  it("returns null for malformed or unknown PIN codes", () => {
    expect(getPinDetails("123")).toBeNull();
    expect(getPinDetails("999999")).toBeNull();
    expect(getPinDetails(" 380001 ")).toEqual(["Ahmedabad", "Gujarat"]);
  });

  it("formats amounts in Indian currency notation", () => {
    expect(formatINR(125000)).toContain("1,25,000");
    expect(formatINR(null)).toContain("0");
  });

  it("uses the zero-interest EMI branch", () => {
    expect(calculateEMI(12000, 0, 12)).toBe(1000);
  });

  it("returns the expected visible steps with and without a co-applicant", () => {
    expect(getVisibleSteps({ loanType: "Personal", loanAmount: 300000 }))
      .toEqual([1, 2, 3, 4, 5, 7, 8]);
    expect(getVisibleSteps({ loanType: "Home", loanAmount: 300000 }))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("requires a co-applicant for married and high-value business applicants", () => {
    expect(needsCoApplicant({ maritalStatus: "Married" })).toBe(true);
    expect(needsCoApplicant({ loanType: "Business", loanAmount: 2000001 })).toBe(true);
    expect(needsCoApplicant({ loanType: "Business", loanAmount: 2000000 })).toBe(false);
  });

  it("accepts company PAN for business loans but not personal loans", () => {
    expect(validatePan("ABCCS1234D", "Business")).toBe("");
    expect(validatePan("ABCCS1234D", "Personal")).toMatch(/4th character/i);
  });

  it("validates Aadhaar checksum and rejects leading zero or one", () => {
    expect(isValidAadhaar("000000000000")).toBe(false);
    expect(isValidAadhaar("123456789012")).toBe(false);
    expect(isValidAadhaar("  ")).toBe(false);
  });

  it("uses the minimum processing fee for zero or negative values", () => {
    expect(estimateProcessingFee(0)).toBe(2000);
    expect(estimateProcessingFee(-10000)).toBe(2000);
  });

  it("marks PAN proof optional only after PAN verification", () => {
    const unverified = getDocumentRequirements({ loanType: "Personal" });
    const verified = getDocumentRequirements({ loanType: "Personal", panVerified: true });
    expect(unverified.find((doc) => doc.id === "panCard").required).toBe(true);
    expect(verified.find((doc) => doc.id === "panCard").required).toBe(false);
  });

  it("includes ITR and business documents for self-employed business loans", () => {
    const docs = getDocumentRequirements({ loanType: "Business", employmentType: "Self-Employed" });
    expect(docs.map((doc) => doc.id)).toEqual(
      expect.arrayContaining(["itr", "businessRegistration", "gstReturns"]),
    );
  });

  it("includes salary slips for salaried applicants", () => {
    const docs = getDocumentRequirements({ loanType: "Personal", employmentType: "Salaried" });
    expect(docs.some((doc) => doc.id === "salarySlips")).toBe(true);
  });
});
