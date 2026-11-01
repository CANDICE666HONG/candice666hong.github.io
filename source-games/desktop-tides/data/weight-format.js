/** Mainland market-weight convention: 1 jin = 500 g, 1 liang = 50 g.
 * The stored weight stays in whole grams. Display uses at most one decimal
 * liang (5 g); an approximation mark is required whenever rounding changes it.
 * Fish below one liang keep their actual gram weight instead of becoming zero.
 */
export function formatFishWeight(grams) {
  if (typeof grams !== 'number' || !Number.isFinite(grams) || !Number.isSafeInteger(grams) || grams <= 0) {
    throw new RangeError('Fish weight must be a positive whole number of grams.');
  }
  if (grams < 50) return `不足1两（${grams}克）`;
  const units = Math.round(grams / 5);
  const jin = Math.floor(units / 100);
  const remainingTenths = units % 100;
  const liang = remainingTenths / 10;
  const approximate = units * 5 !== grams ? '约' : '';
  const jinText = jin > 0 ? `${jin}斤` : '';
  const liangText = remainingTenths > 0 ? `${liang}两` : '';
  return `${approximate}${jinText}${liangText}`;
}
