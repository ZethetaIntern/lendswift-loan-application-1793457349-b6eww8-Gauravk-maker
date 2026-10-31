const DRAFT_KEY_PREFIX = "lendswift_draft_";
const SESSION_KEY_NAME = "lendswift_session_crypto_key_v1";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) =>
    char.charCodeAt(0)
  );
}

async function getKey() {
  if (typeof window === "undefined") {
    throw new Error("Browser session required");
  }

  let encoded = sessionStorage.getItem(SESSION_KEY_NAME);

  if (!encoded) {
    encoded = bytesToBase64(
      crypto.getRandomValues(new Uint8Array(32))
    );

    sessionStorage.setItem(SESSION_KEY_NAME, encoded);
  }

  return crypto.subtle.importKey(
    "raw",
    base64ToBytes(encoded),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptDraft(value) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(value))
  );

  return JSON.stringify({
    version: "2.0",
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted))
  });
}

export async function decryptDraft(payload) {
  const saved = JSON.parse(payload);

  if (
    saved.version !== "2.0" ||
    !saved.iv ||
    !saved.data
  ) {
    throw new Error("Unsupported or invalid draft format");
  }

  const key = await getKey();

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(saved.iv)
    },
    key,
    base64ToBytes(saved.data)
  );

  return JSON.parse(decoder.decode(decrypted));
}

export function draftStorageKey(loanType) {
  return `${DRAFT_KEY_PREFIX}${loanType || "Personal"}`;
}
