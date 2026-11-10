/** Convert integer kobo to a Naira display string. Display layer only. */
export function formatNaira(kobo: number): string {
  const naira = Math.trunc(kobo / 100);
  const absolute = Math.abs(naira);
  const grouped = absolute.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${naira < 0 ? "-" : ""}₦${grouped}`;
}

export function formatCompactNaira(kobo: number): string {
  const naira = Math.trunc(kobo / 100);
  if (naira >= 1_000_000) {
    const millions = naira / 1_000_000;
    return `₦${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2)}M`;
  }
  if (naira >= 1_000) {
    return `₦${Math.round(naira / 1_000)}k`;
  }
  return formatNaira(kobo);
}
