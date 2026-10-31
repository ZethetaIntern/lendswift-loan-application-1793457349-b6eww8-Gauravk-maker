
import { useState } from "react";

export function usePinCodeLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookupPinCode(pin) {
    const normalizedPin = String(pin ?? "").trim();

    if (!/^\d{6}$/.test(normalizedPin)) {
      setError("Enter a valid 6-digit PIN code.");
      return null;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${normalizedPin}`
      );

      if (!response.ok) {
        throw new Error("PIN lookup service is unavailable.");
      }

      const result = await response.json();
      const record = result?.[0];

      if (
        record?.Status !== "Success" ||
        !Array.isArray(record?.PostOffice) ||
        record.PostOffice.length === 0
      ) {
        setError("No post office found for this PIN code.");
        return null;
      }

      const office = record.PostOffice[0];

      return {
        city: office.District || office.Block || "",
        state: office.State || "",
        postOffice: office.Name || "",
      };
    } catch {
      setError(
        "Could not look up this PIN code. Check your connection and try again."
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { lookupPinCode, isLoading, error, setError };
}
