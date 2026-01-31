/**
 * Wildberries Seller API Integration
 *
 * Documentation: https://dev.wildberries.ru/en/openapi/work-with-products
 * Rate limit: 10 requests per 6 seconds for Prices/Discounts group
 */

const WB_API_BASE = 'https://discounts-prices-api.wildberries.ru';

/**
 * Get all products with current prices
 * @param {Object} params
 * @param {string} params.apiKey - WB API Key (Authorization header)
 * @param {number} params.limit - Items per page (max 1000)
 * @returns {Promise<Array>} All products with prices
 */
async function getAllPrices({ apiKey, limit = 1000 }) {
  const allPrices = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${WB_API_BASE}/api/v2/list/goods/filter?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WB API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const items = data.data?.listGoods || [];

    // Transform to common format
    const transformed = items.map(item => ({
      offer_id: String(item.nmID),
      nm_id: item.nmID,
      vendor_code: item.vendorCode,
      // WB uses price + discount model
      price: item.sizes?.[0]?.price || 0,           // Base price
      discount: item.discount || 0,                  // Discount %
      discounted_price: item.sizes?.[0]?.discountedPrice || 0,  // Final price
      // For size-based pricing
      sizes: item.sizes?.map(s => ({
        size_id: s.sizeID,
        tech_size: s.techSize,
        price: s.price,
        discounted_price: s.discountedPrice
      })) || [],
      // Additional info
      editable_size_price: item.editableSizePrice || false
    }));

    allPrices.push(...transformed);

    offset += limit;
    hasMore = items.length === limit;

    // Rate limiting: max 10 requests per 6 seconds
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  return allPrices;
}

/**
 * Update prices and discounts in Wildberries
 * WB uses base price + discount % model
 * Final price = base_price × (1 - discount/100)
 *
 * @param {Object} params
 * @param {string} params.apiKey - WB API Key
 * @param {Array} params.prices - Prices to update [{nmID, price, discount}]
 * @returns {Promise<Object>} Upload task result
 */
async function updatePrices({ apiKey, prices }) {
  const results = {
    total: prices.length,
    taskId: null,
    success: false,
    errors: []
  };

  // Format for WB API
  const formattedPrices = prices.map(p => ({
    nmID: parseInt(p.nmID || p.nm_id || p.offer_id),
    price: parseInt(p.price),
    discount: parseInt(p.discount || 0)
  }));

  const response = await fetch(`${WB_API_BASE}/api/v2/upload/task`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: formattedPrices
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    results.errors.push({
      status: response.status,
      message: errorText
    });
    return results;
  }

  const data = await response.json();

  // WB returns task ID for async processing
  if (data.data?.id) {
    results.taskId = data.data.id;
    results.success = true;
  }

  return results;
}

/**
 * Check upload task status
 * @param {Object} params
 * @param {string} params.apiKey - WB API Key
 * @returns {Promise<Array>} List of recent tasks with statuses
 */
async function getTaskHistory({ apiKey }) {
  const response = await fetch(`${WB_API_BASE}/api/v2/history/tasks`, {
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

  // Task statuses:
  // 3 = processed, no errors
  // 5 = processed with some errors
  return data.data || [];
}

/**
 * Calculate discount % to achieve target price
 * WB formula: discounted_price = price × (1 - discount/100)
 * So: discount = (1 - target/price) × 100
 *
 * @param {number} basePrice - Base price in WB
 * @param {number} targetPrice - Target final price
 * @returns {number} Discount percentage (0-100)
 */
function calculateDiscount(basePrice, targetPrice) {
  if (basePrice <= 0) return 0;
  if (targetPrice >= basePrice) return 0;

  const discount = Math.round((1 - targetPrice / basePrice) * 100);
  return Math.max(0, Math.min(99, discount)); // 0-99% range
}

/**
 * Format prices for WB API from common format
 * @param {Array} prices - Common format [{offer_id, targetPrice, basePrice}]
 * @param {string} mode - 'discount' (adjust discount) or 'price' (adjust base price)
 * @returns {Array} Formatted for WB API
 */
function formatPricesForWB(prices, mode = 'discount') {
  return prices.map(p => {
    const nmID = parseInt(p.offer_id || p.nmID);
    const targetPrice = parseInt(p.targetPrice);
    const currentBasePrice = parseInt(p.basePrice || p.price);

    if (mode === 'discount') {
      // Keep base price, adjust discount
      const discount = calculateDiscount(currentBasePrice, targetPrice);
      return {
        nmID,
        price: currentBasePrice,
        discount
      };
    } else {
      // Adjust base price, keep discount at 0
      return {
        nmID,
        price: targetPrice,
        discount: 0
      };
    }
  });
}

/**
 * WB Quarantine Warning:
 * If new price with discount is 3x less than old price,
 * product goes to quarantine and sells at old price.
 * This function checks for potential quarantine.
 *
 * @param {number} oldPrice - Current price
 * @param {number} newPrice - Target price
 * @returns {boolean} True if price change might trigger quarantine
 */
function willTriggerQuarantine(oldPrice, newPrice) {
  return newPrice < oldPrice / 3;
}

module.exports = {
  WB_API_BASE,
  getAllPrices,
  updatePrices,
  getTaskHistory,
  calculateDiscount,
  formatPricesForWB,
  willTriggerQuarantine
};
