/**
 * A budget in a furnish request — "decorate my bedroom under 8000",
 * "…with a budget of 12k", "…for SAR 9,500". Needs a budget word or a
 * currency next to the number, so "a 3 by 4 room" is never read as money.
 * Returns the amount, or null when there isn't one.
 */
export function parseBudget(text: string): number | null {
  const NUM = String.raw`(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d+)?)\s*(k|thousand)?`;
  const CUR = String.raw`(?:sar|riyals?|rs|﷼|\$|usd|aed|dirhams?|bdt|tk)`;
  const patterns = [
    new RegExp(String.raw`(?:under|below|less than|within|max(?:imum)?|up to|budget(?:\s+of)?(?:\s+is)?|spend(?:ing)?|cost(?:ing)?)\s*(?:${CUR}\s*)?${NUM}`, "i"),
    new RegExp(String.raw`${CUR}\s*${NUM}`, "i"),
    new RegExp(String.raw`${NUM}\s*${CUR}`, "i"),
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (!m) continue;
    const n = Number(m[1].replace(/[,\s]/g, "")) * (m[2] ? 1000 : 1);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
