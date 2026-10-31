
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

import { webcrypto } from "node:crypto";

import {
  encryptDraft,
  decryptDraft,
  draftStorageKey,
} from "./encryption";

describe("draft encryption utilities", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", webcrypto);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a storage key for a named loan type", () => {
    expect(draftStorageKey("Home")).toBe("lendswift_draft_Home");
  });

  it("uses Personal as the default loan type", () => {
    expect(draftStorageKey()).toBe("lendswift_draft_Personal");
    expect(draftStorageKey("")).toBe("lendswift_draft_Personal");
    expect(draftStorageKey(null)).toBe("lendswift_draft_Personal");
  });

  it("rejects invalid JSON payloads", async () => {
    await expect(decryptDraft("not-json")).rejects.toThrow();
  });

  it("rejects unsupported draft versions", async () => {
    await expect(
      decryptDraft(
        JSON.stringify({ version: "1.0", iv: "a", data: "b" })
      )
    ).rejects.toThrow("Unsupported or invalid draft format");
  });

  it("rejects drafts missing encrypted fields", async () => {
    await expect(
      decryptDraft(
        JSON.stringify({ version: "2.0", iv: "", data: "" })
      )
    ).rejects.toThrow("Unsupported or invalid draft format");
  });

  it("encrypts and decrypts a draft successfully", async () => {
    const originalData = {
      name: "Gaurav",
      loanType: "Personal",
      amount: 500000,
      completed: true,
    };

    const encrypted = await encryptDraft(originalData);

    expect(typeof encrypted).toBe("string");

    const saved = JSON.parse(encrypted);

    expect(saved.version).toBe("2.0");
    expect(saved.iv).toBeTruthy();
    expect(saved.data).toBeTruthy();

    const decrypted = await decryptDraft(encrypted);

    expect(decrypted).toEqual(originalData);
  });

  it("creates and stores a session encryption key", async () => {
    expect(
      sessionStorage.getItem("lendswift_session_crypto_key_v1")
    ).toBeNull();

    await encryptDraft({ name: "Test User" });

    expect(
      sessionStorage.getItem("lendswift_session_crypto_key_v1")
    ).toBeTruthy();
  });

  it("reuses the existing session encryption key", async () => {
    await encryptDraft({ name: "First" });

    const originalKey = sessionStorage.getItem(
      "lendswift_session_crypto_key_v1"
    );

    await encryptDraft({ name: "Second" });

    const currentKey = sessionStorage.getItem(
      "lendswift_session_crypto_key_v1"
    );

    expect(currentKey).toBe(originalKey);
  });

  it("rejects decryption when the session key is changed", async () => {
    const encrypted = await encryptDraft({ name: "Test User" });

    const differentKey = webcrypto.getRandomValues(
      new Uint8Array(32)
    );

    const encodedKey = btoa(
      String.fromCharCode(...differentKey)
    );

    sessionStorage.setItem(
      "lendswift_session_crypto_key_v1",
      encodedKey
    );

    await expect(decryptDraft(encrypted)).rejects.toThrow();
  });

  it("rejects corrupted encrypted data", async () => {
    const encrypted = await encryptDraft({ name: "Test User" });

    const saved = JSON.parse(encrypted);
    saved.data = "invalid-encrypted-data";

    await expect(
      decryptDraft(JSON.stringify(saved))
    ).rejects.toThrow();
  });

  it("rejects an invalid encryption IV", async () => {
    const encrypted = await encryptDraft({ name: "Test User" });

    const saved = JSON.parse(encrypted);
    saved.iv = "invalid";

    await expect(
      decryptDraft(JSON.stringify(saved))
    ).rejects.toThrow();
  });
});
