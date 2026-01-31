/**
 * Multiplier Calculation Module
 *
 * Calculates price multiplier based on demand vs expected orders.
 */

const DEFAULT_CONFIG = {
  baseline_orders_day: 45,      // Target orders per day
  threshold_high: 1.2,          // Ratio above which to increase prices
  threshold_low: 0.8,           // Ratio below which to decrease prices
  step: 0.05,                   // Step for multiplier change (5%)
  max_multiplier: 1.70,         // Maximum multiplier (70% increase)
  min_multiplier: 0.85,         // Minimum multiplier (15% discount)
  timezone: 'Europe/Moscow'     // Timezone for calculations
};

/**
 * Get current Moscow time hours passed since midnight
 * @returns {number} Hours passed (e.g., 14.5 for 14:30)
 */
function getMoscowHours() {
  const now = new Date();
  const moscowOffset = 3 * 60; // UTC+3
  const localOffset = now.getTimezoneOffset();
  const moscowTime = new Date(now.getTime() + (moscowOffset + localOffset) * 60 * 1000);
  return moscowTime.getHours() + moscowTime.getMinutes() / 60;
}

/**
 * Calculate expected orders based on time of day
 * @param {number} baselineOrdersDay - Target orders per day
 * @param {number} hoursPassed - Hours passed since midnight (Moscow time)
 * @returns {number} Expected orders by this time
 */
function calculateExpectedOrders(baselineOrdersDay, hoursPassed) {
  return baselineOrdersDay * (hoursPassed / 24);
}

/**
 * Calculate new multiplier based on demand
 * @param {Object} params
 * @param {number} params.actualOrders - Actual orders today
 * @param {number} params.currentMultiplier - Current multiplier
 * @param {Object} params.config - Configuration (optional)
 * @returns {Object} { multiplier, decision, reason, ratio, expected }
 */
function calculateMultiplier({ actualOrders, currentMultiplier, config = {} }) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const hoursPassed = getMoscowHours();
  const expected = calculateExpectedOrders(cfg.baseline_orders_day, hoursPassed);
  const ratio = expected > 0 ? actualOrders / expected : 0;

  let newMultiplier = currentMultiplier;
  let decision = 'hold';
  let reason = '';

  if (ratio > cfg.threshold_high) {
    // High demand - increase prices
    newMultiplier = Math.min(cfg.max_multiplier, currentMultiplier + cfg.step);
    decision = newMultiplier > currentMultiplier ? 'increase' : 'hold_max';
    reason = `High demand: ratio ${ratio.toFixed(2)} > ${cfg.threshold_high}`;
  } else if (ratio < cfg.threshold_low) {
    // Low demand - decrease prices
    newMultiplier = Math.max(cfg.min_multiplier, currentMultiplier - cfg.step);
    decision = newMultiplier < currentMultiplier ? 'decrease' : 'hold_min';
    reason = `Low demand: ratio ${ratio.toFixed(2)} < ${cfg.threshold_low}`;
  } else {
    decision = 'hold';
    reason = `Ratio ${ratio.toFixed(2)} in range [${cfg.threshold_low}-${cfg.threshold_high}]`;
  }

  return {
    multiplier: Math.round(newMultiplier * 100) / 100,
    decision,
    reason: `${reason} (${actualOrders} vs ${expected.toFixed(1)} expected)`,
    ratio: Math.round(ratio * 100) / 100,
    expected: Math.round(expected * 10) / 10,
    moscow_hours: hoursPassed.toFixed(1)
  };
}

module.exports = {
  DEFAULT_CONFIG,
  getMoscowHours,
  calculateExpectedOrders,
  calculateMultiplier
};
