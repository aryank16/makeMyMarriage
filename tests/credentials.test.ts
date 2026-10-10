import { describe, expect, it } from 'vitest';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  fieldErrors,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
} from '../src/lib/auth/credentials';
import {
  NETWORK_ERROR,
  describeAuthError,
  describeThrown,
} from '../src/lib/auth/supabase-errors';

const errorsOf = (r: { success: false; error: Parameters<typeof fieldErrors>[0] }) =>
  fieldErrors(r.error);

describe('signInSchema', () => {
  it('normalises the email so casing and stray spaces do not split accounts', () => {
    const r = signInSchema.safeParse({
      email: '  Priya@Example.COM  ',
      password: 'whatever',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe('priya@example.com');
  });

  it('reports empty fields separately', () => {
    const r = signInSchema.safeParse({ email: '', password: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = errorsOf(r);
      expect(e.email).toMatch(/enter your email/i);
      expect(e.password).toMatch(/enter your password/i);
    }
  });

  it('rejects a malformed address', () => {
    const r = signInSchema.safeParse({ email: 'priya@', password: 'x' });
    expect(r.success).toBe(false);
    if (!r.success) expect(errorsOf(r).email).toMatch(/email address/i);
  });

  it('does not impose a length rule on an existing password', () => {
    // Signing in is not the place to tell someone their password is too short.
    const r = signInSchema.safeParse({ email: 'a@b.com', password: 'short' });
    expect(r.success).toBe(true);
    // ...and no composition policy either: the stored password predates it.
    expect(
      signInSchema.safeParse({ email: 'a@b.com', password: 'alllowercase' })
        .success,
    ).toBe(true);
  });
});

describe('signUpSchema', () => {
  it('accepts a valid sign-up and trims the name', () => {
    const r = signUpSchema.safeParse({
      name: '  Priya Sharma ',
      email: 'priya@example.com',
      password: 'Longenough1!',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe('Priya Sharma');
  });

  it('rejects a whitespace-only name', () => {
    const r = signUpSchema.safeParse({
      name: '   ',
      email: 'a@b.com',
      password: 'Longenough1!',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(errorsOf(r).name).toMatch(/your name/i);
  });

  it(`requires at least ${MIN_PASSWORD_LENGTH} characters`, () => {
    const r = signUpSchema.safeParse({
      name: 'A',
      email: 'a@b.com',
      password: 'Ab1!xy',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(errorsOf(r).password).toMatch(/at least/i);
  });

  it('accepts a password with a capital, a number and a symbol', () => {
    expect(
      signUpSchema.safeParse({
        name: 'A',
        email: 'a@b.com',
        password: 'Longenough1!',
      }).success,
    ).toBe(true);
  });

  it('names every missing character class in one message', () => {
    const cases: [string, RegExp][] = [
      ['alllowercase', /capital letter, a number and a special character/i],
      ['Alllowercase', /a number and a special character/i],
      ['Alllowercase1', /a special character/i],
      ['alllowercase1!', /a capital letter/i],
      ['ALLUPPERCASE!', /a number/i],
    ];
    for (const [password, expected] of cases) {
      const r = signUpSchema.safeParse({
        name: 'A',
        email: 'a@b.com',
        password,
      });
      expect(r.success, `expected ${password} to be rejected`).toBe(false);
      if (!r.success) expect(errorsOf(r).password).toMatch(expected);
    }
  });

  it('counts a space or punctuation as a special character', () => {
    for (const password of ['Longenough 1', 'Longenough1_', 'Longenough1£']) {
      expect(
        signUpSchema.safeParse({ name: 'A', email: 'a@b.com', password })
          .success,
        `expected ${password} to pass`,
      ).toBe(true);
    }
  });

  it('rejects a password past the bcrypt truncation point', () => {
    const r = signUpSchema.safeParse({
      name: 'A',
      email: 'a@b.com',
      password: 'Aa1!' + 'x'.repeat(MAX_PASSWORD_LENGTH),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(errorsOf(r).password).toMatch(/under/i);
  });

  it('reports every bad field at once, one message each', () => {
    const r = signUpSchema.safeParse({ name: '', email: 'nope', password: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = errorsOf(r);
      expect(Object.keys(e).sort()).toEqual(['email', 'name', 'password']);
    }
  });
});

describe('newPasswordSchema', () => {
  it('requires the two entries to match, blaming the confirm field', () => {
    const r = newPasswordSchema.safeParse({
      password: 'Longenough1!',
      confirm: 'Longenough2!',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(errorsOf(r).confirm).toMatch(/do not match/i);
  });

  it('applies the same composition policy as sign-up', () => {
    const r = newPasswordSchema.safeParse({
      password: 'alllowercase',
      confirm: 'alllowercase',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(errorsOf(r).password).toMatch(/capital letter/i);
  });

  it('accepts a matching pair', () => {
    expect(
      newPasswordSchema.safeParse({
        password: 'Longenough1!',
        confirm: 'Longenough1!',
      }).success,
    ).toBe(true);
  });
});

describe('describeAuthError', () => {
  it('maps codes to our own wording', () => {
    expect(describeAuthError({ code: 'invalid_credentials' })).toMatch(
      /email or password is not right/i,
    );
    expect(describeAuthError({ code: 'email_not_confirmed' })).toMatch(
      /confirm your email/i,
    );
    expect(describeAuthError({ code: 'over_email_send_rate_limit' })).toMatch(
      /wait a few minutes/i,
    );
  });

  it('falls back to the message when no code is sent', () => {
    expect(
      describeAuthError({ message: 'Invalid login credentials' }),
    ).toMatch(/email or password is not right/i);
    expect(
      describeAuthError({ message: 'Unsupported provider: provider is not enabled' }),
    ).toMatch(/not available yet/i);
  });

  it('treats a bare 429 as rate limiting', () => {
    expect(describeAuthError({ status: 429, message: 'nope' })).toMatch(
      /too many attempts/i,
    );
  });

  it('recognises a dead connection that supabase-js returned instead of threw', () => {
    // supabase-js catches the fetch TypeError and hands it back as a returned
    // error, so it never reaches a catch block.
    expect(
      describeAuthError({
        name: 'AuthRetryableFetchError',
        message: 'Failed to fetch',
        status: 0,
      }),
    ).toBe(NETWORK_ERROR);
    expect(describeAuthError({ message: 'Load failed' })).toBe(NETWORK_ERROR);
    expect(
      describeAuthError({ message: 'NetworkError when attempting to fetch resource.' }),
    ).toBe(NETWORK_ERROR);
  });

  it('never leaks an unrecognised raw message', () => {
    const raw = 'AuthApiError: internal pg_net failure at 0x41';
    expect(describeAuthError({ message: raw })).not.toContain('pg_net');
    expect(describeAuthError(null)).toMatch(/something went wrong/i);
  });
});

describe('describeThrown', () => {
  it('distinguishes a dropped connection from a generic failure', () => {
    expect(describeThrown(new TypeError('Failed to fetch'))).toBe(NETWORK_ERROR);
    expect(describeThrown(new Error('network timeout'))).toBe(NETWORK_ERROR);
    expect(describeThrown(new Error('something odd'))).toMatch(
      /something went wrong/i,
    );
  });
});
