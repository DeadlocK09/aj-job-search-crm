/**
 * CareerFlow
 * Search Module
 */

/**
 * Search applications by company name.
 *
 * @param {string} keyword
 * @returns {Array}
 */
function searchApplications(keyword) {

  keyword = String(keyword || "")
    .trim()
    .toLowerCase();

  const sheet = getApplicationsSheet();

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const data = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      sheet.getLastColumn()
    )
    .getValues();

  return data.filter(function(row){

    const company = String(row[2]).toLowerCase();

    return company.includes(keyword);

  });

}