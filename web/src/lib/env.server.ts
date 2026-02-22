type ServerEnv = {
  FIREBASE_ADMIN_PROJECT_ID: string;
  FIREBASE_ADMIN_CLIENT_EMAIL: string;
  FIREBASE_ADMIN_PRIVATE_KEY: string;
};

const requiredKeys = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY"
] as const;

const stripWrappingQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const normalizePrivateKey = (value: string): string => {
  const unwrapped = stripWrappingQuotes(value);
  const normalized = unwrapped
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .trim();

  if (
    !normalized.includes("-----BEGIN PRIVATE KEY-----") ||
    !normalized.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY is not in valid PEM format. " +
      "Use the private_key from the Firebase service account JSON and keep \\n line breaks."
    );
  }

  return normalized;
};

export function getServerEnv(): ServerEnv {
  const env = process.env as Record<string, string | undefined>;

  for (const key of requiredKeys) {
    if (!env[key]) {
      throw new Error(`Missing required server environment variable: ${key}`);
    }
  }

  const projectId = stripWrappingQuotes(env.FIREBASE_ADMIN_PROJECT_ID!);
  const clientEmail = stripWrappingQuotes(env.FIREBASE_ADMIN_CLIENT_EMAIL!);
  const privateKey = normalizePrivateKey(env.FIREBASE_ADMIN_PRIVATE_KEY!);

  return {
    FIREBASE_ADMIN_PROJECT_ID: projectId,
    FIREBASE_ADMIN_CLIENT_EMAIL: clientEmail,
    FIREBASE_ADMIN_PRIVATE_KEY: privateKey
  };
}
