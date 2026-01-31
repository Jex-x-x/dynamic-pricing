/**
 * Ozon Seller API Integration
 *
 * Endpoints for price management.
 */

const OZON_API_BASE = 'https://api-seller.ozon.ru';

/**
 * Get prices for all products (with pagination)
 * @param {Object} params
 * @param {string} params.clientId - Ozon Client-Id
 * @param {string} params.apiKey - Ozon Api-Key
 * @param {number} params.limit - Items per page (max 1000)
 * @returns {Promise<Array>} All products with prices
 */
async function getAllPrices({ clientId, apiKey, limit = 1000 }) {
  const allPrices = [];
  let cursor = '';
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${OZON_API_BASE}/v5/product/info/prices`, {
      method: 'POST',
      headers: {
        'Client-Id': clientId,
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {},
        limit,
        cursor
      })
    });

    if (!response.ok) {
      throw new Error(`Ozon API error: ${response.status}`);
    }

    const data = await response.json();
    const items = data.result?.items || [];
    allPrices.push(...items);

    cursor = data.result?.cursor || '';
    hasMore = items.length === limit && cursor !== '';
  }

  return allPrices;
}

/**
 * Update prices in Ozon (batch, max 1000 per request)
 * @param {Object} params
 * @param {string} params.clientId - Ozon Client-Id
 * @param {string} params.apiKey - Ozon Api-Key
 * @param {Array} params.prices - Prices to update [{offer_id, price, old_price, currency_code}]
 * @returns {Promise<Object>} Update result with success/error counts
 */
async function updatePrices({ clientId, apiKey, prices }) {
  const BATCH_SIZE = 1000;
  const results = {
    total: prices.length,
    success: 0,
    errors: [],
    minPriceErrors: 0
  };

  // Process in batches
  for (let i = 0; i < prices.length; i += BATCH_SIZE) {
    const batch = prices.slice(i, i + BATCH_SIZE);

    const response = await fetch(`${OZON_API_BASE}/v1/product/import/prices`, {
      method: 'POST',
      headers: {
        'Client-Id': clientId,
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prices: batch })
    });

    if (!response.ok) {
      results.errors.push({
        batch: Math.floor(i / BATCH_SIZE) + 1,
        status: response.status,
        message: await response.text()
      });
      continue;
    }

    const data = await response.json();
    const batchResults = data.result || [];

    for (const item of batchResults) {
      if (item.updated) {
        results.success++;
      } else {
        // Check for min_price error
        const errors = item.errors || [];
        const isMinPriceError = errors.some(e =>
          e.code === 'MIN_PRICE_ERROR' ||
          e.message?.includes('min_price') ||
          e.message?.includes('минимальн')
        );

        if (isMinPriceError) {
          results.minPriceErrors++;
        }

        results.errors.push({
          offer_id: item.offer_id,
          errors: errors.map(e => e.message || e.code)
        });
      }
    }
  }

  return results;
}

/**
 * Format prices for Ozon API
 * @param {Array} prices - Prices [{offer_id, targetPrice, basePrice}]
 * @returns {Array} Formatted for Ozon API
 */
function formatPricesForOzon(prices) {
  return prices.map(p => ({
    offer_id: String(p.offer_id),
    price: String(p.targetPrice),
    old_price: String(Math.round(p.targetPrice * 1.1)),
    currency_code: 'RUB'
  }));
}

module.exports = {
  OZON_API_BASE,
  getAllPrices,
  updatePrices,
  formatPricesForOzon
};
