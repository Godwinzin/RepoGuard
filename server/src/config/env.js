const required = [
  "DATABASE_URL",
  "CLIENT_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_CALLBACK_URL",
  "SESSION_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "WEBHOOK_SECRET",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (!/^[0-9a-f]{64}$/i.test(process.env.TOKEN_ENCRYPTION_KEY)) {
  console.error("TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  isProd: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL,
  clientUrl: process.env.CLIENT_URL,
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL,
  },
  sessionSecret: process.env.SESSION_SECRET,
  encryptionKey: Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, "hex"),
  webhookSecret: process.env.WEBHOOK_SECRET,
  publicUrl: process.env.PUBLIC_URL?.replace(/\/$/, ""), // optional, no trailing slash
  groqApiKey: process.env.GROQ_API_KEY || null,
  aiModel: process.env.AI_MODEL || "qwen/qwen3.8-27b",
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
};
if (!process.env.GROQ_API_KEY) {
  console.warn("GROQ_API_KEY is not set: AI suggestions are disabled.");
}
