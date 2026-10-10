import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

/**
 * bcrypt silently truncates at 72 bytes, so anything beyond that is not
 * actually part of the password. Rejecting it is honest; accepting it would
 * mean two different long passwords could both open the account.
 */
export const MAX_PASSWORD_LENGTH = 72;

export const MAX_NAME_LENGTH = 80;

/** Anything that is not a letter or a digit counts, punctuation included. */
const HAS_SPECIAL = /[^A-Za-z0-9]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /[0-9]/;

/** "a, b and c" — so the message reads as a sentence, not a list of codes. */
function readableList(items: string[]) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Stated up front under the field, so nobody discovers the rule by failing it. */
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters, with a capital letter, a number and a special character`;

/**
 * A new password. Length first, then composition.
 *
 * The composition issue is raised once with everything that is missing, so
 * the person is not sent round the loop three times fixing one rule each.
 */
const newPassword = z
  .string()
  .min(1, 'Choose a password.')
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(
    MAX_PASSWORD_LENGTH,
    `Keep this under ${MAX_PASSWORD_LENGTH} characters.`,
  )
  .superRefine((value, ctx) => {
    if (!value) return;

    const missing: string[] = [];
    if (!HAS_UPPER.test(value)) missing.push('a capital letter');
    if (!HAS_DIGIT.test(value)) missing.push('a number');
    if (!HAS_SPECIAL.test(value)) missing.push('a special character');

    if (missing.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `Add ${readableList(missing)}.`,
      });
    }
  });

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address.')
  .email('That does not look like an email address.');

export const signInSchema = z.object({
  email,
  // No length rule on sign-in: an existing password is whatever it already is,
  // and telling someone their input is "too short" while they are trying to
  // log in is both wrong and a hint about the stored value.
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tell us your name.')
    .max(MAX_NAME_LENGTH, `Keep this under ${MAX_NAME_LENGTH} characters.`),
  email,
  password: newPassword,
});

/* Same rules as sign-up. A reset that accepted "password" would make the
 * sign-up policy decorative — it is the obvious way around it. */
export const newPasswordSchema = z
  .object({
    password: newPassword,
    confirm: z.string().min(1, 'Type the password again.'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Those two passwords do not match.',
    path: ['confirm'],
  });

export const resetRequestSchema = z.object({ email });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * First error per field, which is all a form can show next to an input.
 * Zod reports every failure; the extra ones are noise once the first is fixed.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
