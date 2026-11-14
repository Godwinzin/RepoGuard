import { rateLimit } from "express-rate-limit";

function makeLimiter({ windowMs, limit, message, perUser = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7", // tells clients how many requests remain
    legacyHeaders: false,
    // Our client shows `message`, so people read a sentence, not a status code
    message: { error: "rate_limited", message },
    // Use per-user keys only AFTER requireAuth has run
    ...(perUser ? { keyGenerator: (req) => `user:${req.session.userId}` } : {}),
  });
}

// Login attempts, by IP address
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many login attempts. Please wait a few minutes and try again.",
});

// Starting audits is expensive, so limit it per user
export const auditLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  perUser: true,
  message: "You're starting audits too quickly. Please wait a few minutes.",
});

// Creating and deleting GitHub webhooks
export const monitoringLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  perUser: true,
  message: "You're changing monitoring too quickly. Please wait a few minutes.",
});

// Account deletion
export const accountLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  perUser: true,
  message: "Too many attempts. Please wait a while and try again.",
});