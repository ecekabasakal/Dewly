import type { AuthError } from '@supabase/supabase-js';
import type { Language } from './language';

/**
 * Turns a Supabase auth error into something a person can act on.
 *
 * Supabase's raw messages are English, developer-facing and occasionally
 * cryptic ("Invalid login credentials"). Matching on the message text is
 * fragile, so this only maps the handful that users actually hit, and falls
 * back to the original message rather than swallowing an unknown failure.
 */
type KnownCase = 'email-confirmation';

const COPY = {
  en: {
    invalidCredentials: 'That email and password don’t match. Check both and try again.',
    emailTaken: 'An account already exists with that email. Try signing in instead.',
    weakPassword: 'Password must be at least 6 characters.',
    invalidEmail: 'That doesn’t look like a valid email address.',
    rateLimited: 'Too many attempts. Wait a moment and try again.',
    network: "Couldn't reach Supabase. Check your connection and try again.",
    emailConfirmation:
      'Account created — check your inbox to confirm your email, then sign in.',
    generic: 'Something went wrong. Please try again.',
  },
  tr: {
    invalidCredentials: 'E-posta ve şifre eşleşmiyor. İkisini de kontrol edip tekrar deneyin.',
    emailTaken: 'Bu e-posta ile bir hesap zaten var. Giriş yapmayı deneyin.',
    weakPassword: 'Şifre en az 6 karakter olmalı.',
    invalidEmail: 'Bu geçerli bir e-posta adresine benzemiyor.',
    rateLimited: 'Çok fazla deneme. Biraz bekleyip tekrar deneyin.',
    network: 'Supabase’e ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.',
    emailConfirmation:
      'Hesap oluşturuldu — e-postanızı onaylamak için gelen kutunuza bakın, sonra giriş yapın.',
    generic: 'Bir şeyler ters gitti. Lütfen tekrar deneyin.',
  },
} as const;

export function authErrorMessage(
  error: AuthError | KnownCase,
  language: Language
): string {
  const t = COPY[language];

  if (error === 'email-confirmation') return t.emailConfirmation;

  const raw = error.message.toLowerCase();

  if (raw.includes('invalid login credentials')) return t.invalidCredentials;
  if (raw.includes('already registered') || raw.includes('already been registered')) {
    return t.emailTaken;
  }
  if (raw.includes('user already exists')) return t.emailTaken;
  if (raw.includes('password should be at least')) return t.weakPassword;
  if (raw.includes('unable to validate email') || raw.includes('invalid email')) {
    return t.invalidEmail;
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) return t.rateLimited;
  if (raw.includes('network') || raw.includes('fetch')) return t.network;

  // Unknown failure: show Supabase's own text rather than a useless "something
  // went wrong" that hides what actually happened.
  return error.message || t.generic;
}
