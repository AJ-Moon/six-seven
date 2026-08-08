/**
 * Single place that turns a number into money for display.
 *
 * Rupee prices on the Six Seven menu are whole numbers (300, 650, 1250), so
 * printing "Rs. 300" reads far better than "Rs. 300.00". Fractions still show
 * two decimals when they actually occur, e.g. a points discount of Rs. 12.50.
 * Thousands are grouped so "Rs. 1,250" stays scannable on a phone.
 */
/**
 * The symbol admins configured under Settings → Store. RestaurantContext pushes
 * it here once settings load, so screens that are not inside the customer layout
 * (the admin panel) can call formatMoney() without threading a prop through.
 */
let activeSymbol = "Rs.";

export function setCurrencySymbol(symbol: string | undefined | null): void {
  if (symbol && symbol.trim()) activeSymbol = symbol.trim();
}

export function formatMoney(
  value: number | null | undefined,
  symbol: string = activeSymbol,
): string {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const hasFraction = Math.abs(safe - Math.trunc(safe)) > 0.004;
  const body = safe.toLocaleString("en-PK", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
  // "Rs." reads better with a space; "$" and "€" sit tight against the number.
  const sep = /[A-Za-z.]$/.test(symbol) ? " " : "";
  return `${symbol}${sep}${body}`;
}
