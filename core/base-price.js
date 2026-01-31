/**
 * Base Price Detection Module (v2.0)
 *
 * Detects when the source system (e.g., Bitrix, 1C) updates base prices.
 * Works even when multiplier != 1.0.
 */

const DEFAULT_TOLERANCE = 0.01; // 1% tolerance for price comparison

/**
 * Check if two prices are approximately equal
 * @param {number} price1
 * @param {number} price2
 * @param {number} tolerance - Tolerance as fraction (0.01 = 1%)
 * @returns {boolean}
 */
function pricesMatch(price1, price2, tolerance = DEFAULT_TOLERANCE) {
  if (price2 === 0) return price1 === 0;
  const diff = Math.abs(price1 - price2) / price2;
  return diff < tolerance;
}

/**
 * Calculate target price from base and multiplier
 * @param {number} basePrice
 * @param {number} multiplier
 * @returns {number} Rounded target price
 */
function calculateTargetPrice(basePrice, multiplier) {
  return Math.round(basePrice * multiplier);
}

/**
 * Detect base price changes and calculate new prices
 * @param {Object} params
 * @param {Array} params.marketplacePrices - Current prices from marketplace [{offer_id, price, min_price}]
 * @param {Object} params.savedBasePrices - Saved base prices {offer_id: basePrice}
 * @param {number} params.multiplier - Current multiplier
 * @param {number} params.tolerance - Price comparison tolerance (default 1%)
 * @returns {Object} { pricesToUpdate, updatedBasePrices, stats }
 */
function detectBasePriceChanges({
  marketplacePrices,
  savedBasePrices,
  multiplier,
  tolerance = DEFAULT_TOLERANCE
}) {
  const pricesToUpdate = [];
  const updatedBasePrices = { ...savedBasePrices };
  const stats = {
    total: marketplacePrices.length,
    unchanged: 0,
    baseChanged: 0,
    newProducts: 0,
    skippedMinPrice: 0
  };

  for (const item of marketplacePrices) {
    const offerId = String(item.offer_id);
    const currentPrice = parseFloat(item.price) || 0;
    const minPrice = parseFloat(item.min_price) || 0;
    const savedBase = savedBasePrices[offerId];

    // New product - save current price as base
    if (!savedBase) {
      updatedBasePrices[offerId] = currentPrice;
      stats.newProducts++;
      continue;
    }

    const targetPrice = calculateTargetPrice(savedBase, multiplier);

    // Check if current price matches expected target
    if (pricesMatch(currentPrice, targetPrice, tolerance)) {
      // Price is correct, no action needed
      stats.unchanged++;
      continue;
    }

    // Price doesn't match target - source system updated the base
    // Accept current marketplace price as new base
    updatedBasePrices[offerId] = currentPrice;
    stats.baseChanged++;

    // Calculate new target with multiplier
    const newTargetPrice = calculateTargetPrice(currentPrice, multiplier);

    // Skip if multiplier is ~1.0 (no change needed)
    if (Math.abs(multiplier - 1.0) < 0.01) {
      continue;
    }

    // Skip if new target would violate min_price
    if (minPrice > 0 && newTargetPrice < minPrice) {
      stats.skippedMinPrice++;
      continue;
    }

    // Add to update list
    pricesToUpdate.push({
      offer_id: offerId,
      price: String(newTargetPrice),
      old_price: String(Math.round(newTargetPrice * 1.1)), // 10% "old price" for display
      currency_code: 'RUB',
      _debug: {
        currentMarketplace: currentPrice,
        previousBase: savedBase,
        newBase: currentPrice,
        multiplier,
        newTarget: newTargetPrice
      }
    });
  }

  return {
    pricesToUpdate,
    updatedBasePrices,
    stats
  };
}

module.exports = {
  DEFAULT_TOLERANCE,
  pricesMatch,
  calculateTargetPrice,
  detectBasePriceChanges
};
