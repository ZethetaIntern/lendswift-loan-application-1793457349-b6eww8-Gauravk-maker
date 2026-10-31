
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePinCodeLookup } from "./usePinCodeLookup";
import { useAutoSave } from "./useAutoSave";
import { encryptDraft, draftStorageKey } from "../utils/encryption";

vi.mock("../utils/encryption", () => ({
  encryptDraft: vi.fn(),
  draftStorageKey: vi.fn((loanType) => `draft-${loanType}`),
}));

describe("usePinCodeLookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an invalid PIN without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePinCodeLookup());

    let response;
    await act(async () => {
      response = await result.current.lookupPinCode("123");
    });

    expect(response).toBeNull();
    expect(result.current.error).toMatch(/valid 6-digit PIN/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns city, state and post office for a successful lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            Status: "Success",
            PostOffice: [
              {
                District: "Ahmedabad",
                State: "Gujarat",
                Name: "Navrangpura",
              },
            ],
          },
        ],
      }),
    );

    const { result } = renderHook(() => usePinCodeLookup());

    let response;
    await act(async () => {
      response = await result.current.lookupPinCode(" 380001 ");
    });

    expect(response).toEqual({
      city: "Ahmedabad",
      state: "Gujarat",
      postOffice: "Navrangpura",
    });
    expect(result.current.error).toBe("");
    expect(result.current.isLoading).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.postalpincode.in/pincode/380001",
    );
  });

  it("handles an unsuccessful HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false }),
    );

    const { result } = renderHook(() => usePinCodeLookup());

    let response;
    await act(async () => {
      response = await result.current.lookupPinCode("380001");
    });

    expect(response).toBeNull();
    expect(result.current.error).toMatch(/Could not look up/i);
    expect(result.current.isLoading).toBe(false);
  });

  it("handles a PIN with no post office records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { Status: "Error", PostOffice: null },
        ],
      }),
    );

    const { result } = renderHook(() => usePinCodeLookup());

    let response;
    await act(async () => {
      response = await result.current.lookupPinCode("999999");
    });

    expect(response).toBeNull();
    expect(result.current.error).toMatch(/No post office found/i);
    expect(result.current.isLoading).toBe(false);
  });

  it("handles a network exception", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const { result } = renderHook(() => usePinCodeLookup());

    let response;
    await act(async () => {
      response = await result.current.lookupPinCode("380001");
    });

    expect(response).toBeNull();
    expect(result.current.error).toMatch(/Could not look up/i);
    expect(result.current.isLoading).toBe(false);
  });

  it("allows clearing the lookup error", async () => {
    const { result } = renderHook(() => usePinCodeLookup());

    act(() => {
      result.current.setError("Test error");
    });

    expect(result.current.error).toBe("Test error");

    act(() => {
      result.current.setError("");
    });

    expect(result.current.error).toBe("");
  });
});

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(encryptDraft).mockResolvedValue("encrypted-draft");
    vi.mocked(draftStorageKey).mockImplementation(
      (loanType) => `draft-${loanType}`,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves an encrypted draft after the configured interval", async () => {
    vi.useFakeTimers();

    const formData = {
      loanAmount: "300000",
      loanPurpose: "Education",
    };

    const { result } = renderHook(() =>
      useAutoSave(formData, 1, "Personal", 1000),
    );

    expect(localStorage.getItem("draft-Personal")).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(encryptDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        data: formData,
        step: 1,
        loanType: "Personal",
        version: "2.0",
        timestamp: expect.any(Number),
      }),
    );

    expect(localStorage.getItem("draft-Personal")).toBe(
      "encrypted-draft",
    );
    expect(result.current).not.toBe("");
  });

  it("excludes sensitive fields from the saved draft", async () => {
    vi.useFakeTimers();

    const formData = {
      loanAmount: "300000",
      loanPurpose: "Education",
      fullName: "Test User",
      email: "test@example.com",
      pan: "ABCDE1234F",
      aadhaar: "123456789012",
      documents: [{ name: "identity.pdf" }],
    };

    renderHook(() => useAutoSave(formData, 2, "Personal", 500));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const savedDraft = vi.mocked(encryptDraft).mock.calls[0][0];

    expect(savedDraft.data).toEqual({
      loanAmount: "300000",
      loanPurpose: "Education",
    });

    expect(savedDraft.data).not.toHaveProperty("fullName");
    expect(savedDraft.data).not.toHaveProperty("email");
    expect(savedDraft.data).not.toHaveProperty("pan");
    expect(savedDraft.data).not.toHaveProperty("aadhaar");
    expect(savedDraft.data).not.toHaveProperty("documents");
  });

  it("does not save when loan type is missing", async () => {
    vi.useFakeTimers();

    renderHook(() => useAutoSave({ loanAmount: "300000" }, 1, "", 500));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(encryptDraft).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it("handles encryption or storage failures without crashing", async () => {
    vi.useFakeTimers();
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(encryptDraft).mockRejectedValue(
      new Error("Encryption failed"),
    );

    const { result } = renderHook(() =>
      useAutoSave({ loanAmount: "300000" }, 1, "Personal", 500),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(consoleSpy).toHaveBeenCalledWith("Draft auto-save failed.");
    expect(result.current).toBe("");

    consoleSpy.mockRestore();
  });

  it("cancels a pending save when the hook unmounts", async () => {
    vi.useFakeTimers();

    const { unmount } = renderHook(() =>
      useAutoSave({ loanAmount: "300000" }, 1, "Personal", 1000),
    );

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(encryptDraft).not.toHaveBeenCalled();
    expect(localStorage.getItem("draft-Personal")).toBeNull();
  });
});
