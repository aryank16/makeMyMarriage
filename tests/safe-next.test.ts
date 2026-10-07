import { describe, it, expect } from 'vitest';
import { safeNext } from '@/lib/auth/safe-next';

describe('safeNext', () => {
  it('passes through ordinary same-site paths', () => {
    expect(safeNext('/dashboard/abc')).toBe('/dashboard/abc');
    expect(safeNext('/onboarding')).toBe('/onboarding');
    expect(safeNext('/dashboard?tab=guests')).toBe('/dashboard?tab=guests');
  });

  it('rejects absolute and protocol-relative targets', () => {
    expect(safeNext('https://evil.com')).toBe('/dashboard');
    expect(safeNext('//evil.com')).toBe('/dashboard');
    expect(safeNext('http://evil.com')).toBe('/dashboard');
  });

  it('rejects backslash spellings browsers normalise to //', () => {
    expect(safeNext('/\\evil.com')).toBe('/dashboard');
    expect(safeNext('\\\\evil.com')).toBe('/dashboard');
  });

  it('rejects control characters', () => {
    expect(safeNext('/dash\nLocation: https://evil.com')).toBe('/dashboard');
    expect(safeNext('/dash\r\nx')).toBe('/dashboard');
  });

  it('refuses to send an authenticated user back to an auth screen', () => {
    expect(safeNext('/login')).toBe('/dashboard');
    expect(safeNext('/login?next=/login')).toBe('/dashboard');
    expect(safeNext('/signup')).toBe('/dashboard');
    expect(safeNext('/forgot-password')).toBe('/dashboard');
    expect(safeNext('/auth/reset-password')).toBe('/dashboard');
  });

  it('does not over-match similar prefixes', () => {
    expect(safeNext('/loginhistory')).toBe('/loginhistory');
    expect(safeNext('/authors')).toBe('/authors');
  });

  it('handles arrays, empty and missing values', () => {
    expect(safeNext(['/onboarding', '/x'])).toBe('/onboarding');
    expect(safeNext(undefined)).toBe('/dashboard');
    expect(safeNext('')).toBe('/dashboard');
    expect(safeNext(null)).toBe('/dashboard');
  });
});
