const RESERVED = new Set([
  'admin', 'api', 'auth', 'dashboard', 'login', 'logout', 'signup', 'settings',
  'about', 'help', 'support', 'blog', 'pricing', 'terms', 'privacy', 'app',
  'www', 'mail', 'static', 'assets', 'public', 'new', 'create', 'i', 'w',
]);

export function slugify(brideName: string, groomName: string): string {
  const clean = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return [clean(brideName), clean(groomName)].filter(Boolean).join('-');
}

export function isReserved(slug: string): boolean {
  return RESERVED.has(slug);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug) && !isReserved(slug);
}
