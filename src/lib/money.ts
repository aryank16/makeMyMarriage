/**
 * Money is stored as BigInt paise — never Float, never Int. Rupees only exist
 * at the edges: what someone types, and what they read.
 */

/** "12,500.50" or "12500" from a form field -> 1250050n paise. */
export function rupeesToPaise(input: string): bigint | null {
  const cleaned = input.replace(/[,\s₹]/g, '').trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const [whole, fraction = ''] = cleaned.split('.');
  const paise = fraction.padEnd(2, '0');
  return BigInt(whole) * 100n + BigInt(paise);
}

/** 1250050n -> "₹12,500.50", dropping ".00" because most amounts are round. */
export function formatPaise(paise: bigint): string {
  const negative = paise < 0n;
  const abs = negative ? -paise : paise;
  const whole = abs / 100n;
  const fraction = abs % 100n;

  const grouped = whole.toLocaleString('en-IN');
  const tail = fraction === 0n ? '' : `.${fraction.toString().padStart(2, '0')}`;
  return `${negative ? '-' : ''}₹${grouped}${tail}`;
}
