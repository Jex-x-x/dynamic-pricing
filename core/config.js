/**
 * Configuration Module
 *
 * Handles loading and saving configuration from storage endpoints.
 */

/**
 * Default configuration structure
 */
const DEFAULT_CONFIG = {
  pricing: {
    baseline_orders_day: 45,
    threshold_high: 1.2,
    threshold_low: 0.8,
    step: 0.05,
    max_multiplier: 1.70,
    min_multiplier: 0.85,
    current_multiplier: 1.0,
    last_check: null,
    last_decision: null,
    last_reason: null,
    last_change: null,
    moscow_hours: null
  }
};

/**
 * Load config from HTTP endpoint
 * @param {string} url - Config endpoint URL
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfig(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status}`);
  }
  return response.json();
}

/**
 * Save config to HTTP endpoint
 * @param {string} url - Config endpoint URL
 * @param {Object} config - Configuration to save
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Response from server
 */
async function saveConfig(url, config, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    throw new Error(`Failed to save config: ${response.status}`);
  }
  return response.json();
}

/**
 * Load base prices from HTTP endpoint
 * @param {string} url - Base prices endpoint URL
 * @returns {Promise<Object>} Base prices {offer_id: price}
 */
async function loadBasePrices(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load base prices: ${response.status}`);
  }
  const data = await response.json();
  return data.prices || {};
}

/**
 * Save base prices to HTTP endpoint
 * @param {string} url - Base prices endpoint URL
 * @param {Object} prices - Base prices to save {offer_id: price}
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Response from server
 */
async function saveBasePrices(url, prices, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify({ prices })
  });
  if (!response.ok) {
    throw new Error(`Failed to save base prices: ${response.status}`);
  }
  return response.json();
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  loadBasePrices,
  saveBasePrices
};
