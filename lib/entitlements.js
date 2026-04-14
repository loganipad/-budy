/**
 * Shared entitlement definitions for free vs premium tiers.
 * Single source of truth — imported by API routes and referenced by client config.
 */

export const FREE_QUESTION_LIMIT = 10;

export const PREMIUM_QUESTION_LIMITS = {
  english: 27,
  math: 22,
  full: 49
};

export const TEST_DURATION_SECONDS = {
  english: { premium: 32 * 60, free: 12 * 60 },
  math: { premium: 35 * 60, free: 12 * 60 },
  full: { premium: 67 * 60, free: 12 * 60 }
};

export const MAX_TEST_SESSION_QUESTIONS = 60;

export function getQuestionLimit(section, isPremium) {
  if (isPremium) {
    return PREMIUM_QUESTION_LIMITS[section] || MAX_TEST_SESSION_QUESTIONS;
  }
  return FREE_QUESTION_LIMIT;
}

export function isPremiumFromStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'active' || normalized === 'trialing';
}
