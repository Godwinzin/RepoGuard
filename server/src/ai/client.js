import Groq from "groq-sdk";
import { env } from "../config/env.js";

const client = env.groqApiKey
  ? new Groq({ apiKey: env.groqApiKey, timeout: 60_000, maxRetries: 2 })
  : null;

export async function generateText({ system, user, maxTokens = 1500 }) {
  if (!client) throw new Error("AI is not configured");

  const completion = await client.chat.completions.create({
    model: env.aiModel,
    max_completion_tokens: maxTokens,
    temperature: 0.3, // lower = more predictable output
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}