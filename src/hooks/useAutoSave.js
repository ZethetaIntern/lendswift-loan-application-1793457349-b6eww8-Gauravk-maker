
import { useEffect, useState } from "react";
import {
  draftStorageKey,
  encryptDraft
} from "../utils/encryption";

const EXCLUDED_FIELDS = new Set([
  "fullName",
  "dob",
  "fatherName",
  "motherName",
  "email",
  "mobile",
  "alternateMobile",
  "pan",
  "aadhaar",
  "coApplicantName",
  "coApplicantPan",
  "signature",
  "documents",
  "currentAddress1",
  "currentAddress2",
  "permanentAddress1",
  "permanentAddress2",
  "pinCode",
  "permanentPin",
  "city",
  "permanentCity",
  "state",
  "permanentState",
  "companyName",
  "designation",
  "businessName",
  "businessAddress",
  "gstNumber",
  "panVerified",
  "aadhaarVerified",
  "aadhaarConsent",
  "consentAccuracy",
  "consentCredit",
  "consentTerms",
  "consentCommunications",
  "coApplicantConsent"
]);

function createPrivacySafeDraft(formData) {
  return Object.fromEntries(
    Object.entries(formData || {}).filter(
      ([key]) => !EXCLUDED_FIELDS.has(key)
    )
  );
}

export function useAutoSave(
  formData,
  currentStep,
  loanType,
  interval = 30000
) {
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    if (!loanType || typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const draft = {
          data: createPrivacySafeDraft(formData),
          step: currentStep,
          loanType,
          version: "2.0",
          timestamp: Date.now()
        };

        const encrypted = await encryptDraft(draft);

        if (cancelled) return;

        localStorage.setItem(
          draftStorageKey(loanType),
          encrypted
        );

        setSavedAt(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
        );
      } catch (error) {
        if (!cancelled) {
          setSavedAt("");
          console.error("Draft auto-save failed.");
        }
      }
    }, interval);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData, currentStep, loanType, interval]);

  return savedAt;
}
