/**
 * ==========================================
 * Utils Library
 * CareerFlow
 * ==========================================
 */

/**
 * Generates an application ID.
 *
 * Example:
 * APP-000001
 */
function generateApplicationId(number) {

  return `${CONFIG.ID_PREFIX}-${String(number).padStart(6, "0")}`;

}

/**
 * Returns the current timestamp.
 */
function getCurrentTimestamp() {

  return new Date();

}