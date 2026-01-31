/**
 * Wildberries Seller API Integration
 *
 * Endpoints for price management.
 * Documentation: https://openapi.wildberries.ru/
 */

const WB_API_BASE = 'https://discounts-prices-api.wb.ru';

/**
 * Get prices for all products
 * @param {Object} params
 * @param {string} params.apiKey - WB API Key
 * @param {number} params.limit - Items per page (max 1000)
 * @returns {Promise<Array>} All products with prices
 */
async function getAllPrices({ apiKey, limit = 1000 }) {
  const allPrices = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${WB_API_BASE}/api/v2/list/goods/filter?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`WB API error: ${response.status}`);
    }

    const data = await response.json();
    const items = data.data?.listGoods || [];

    // Transform to common format
    const transformed = items.map(item => ({
      offer_id: String(item.nmID),
      sku: item.vendorCode,
      price: item.sizes?.[0]?.price || 0,
      discount_price: item.sizes?.[0]?.discountedPrice || 0,
      discount: item.discount || 0
    }));

    allPrices.push(...transformed);

    offset += limit;
    hasMore = items.length === limit;
  }

  return allPrices;
}

/**
 * Update prices in Wildberries
 * @param {Object} params
 * @param {string} params.apiKey - WB API Key
 * @param {Array} params.prices - Prices to update [{nmID, price, discount}]
 * @returns {Promise<Object>} Update result
 */
async function updatePrices({ apiKey, prices }) {
  const results = {
    total: prices.length,
    success: 0,
    errors: []
  };

  // WB uses different endpoint for price updates
  const response = await fetch(`${WB_API_BASE}/api/v2/upload/task`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: prices.map(p => ({
        nmID: parseInt(p.offer_id),
        price: parseInt(p.price),
        discount: p.discount || 0
      }))
    })
  });

  if (!response.ok) {
    results.errors.push({
      status: response.status,
      message: await response.text()
    });
    return results;
  }

  const data = await response.json();

  // WB returns task ID, need to check status separately
  if (data.data?.id) {
    results.taskId = data.data.id;
    results.success = prices.length; // Assume success, check task status later
  }

  return results;
}

/**
 * Check task status
 * @param {Object} params
 * @param {string} params.apiKey - WB API Key
 * @param {number} params.taskId - Task ID from updatePrices
 * @returns {Promise<Object>} Task status
 */
async function checkTaskStatus({ apiKey, taskId }) {
  const response = await fetch(`${WB_API_BASE}/api/v2/history/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uploadID: taskId
    })
  });

  if (!response.ok) {
    throw new Error(`WB API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Format prices for WB API
 * @param {Array} prices - Prices [{offer_id, targetPrice, basePrice}]
 * @param {number} baseDiscount - Base discount percentage (default 0)
 * @returns {Array} Formatted for WB API
 */
function formatPricesForWB(prices, baseDiscount = 0) {
  return prices.map(p => ({
    nmID: parseInt(p.offer_id),
    price: parseInt(p.targetPrice),
    discount: baseDiscount
  }));
}

module.exports = {
  WB_API_BASE,
  getAllPrices,
  updatePrices,
  checkTaskStatus,
  formatPricesForWB
};
