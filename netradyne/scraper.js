// netradyne/scraper.js
import { NETRADYNE } from './config.js';
import { log } from './logger.js';

/**
 * Parse a combined time‑date string into ISO format.
 * Handles formats like:
 *   "03:02:56 AM PDT Jun 23 2026"
 *   "03:02:56 AM PDT\nJun 23 2026"
 *   "11:37:08 PM PDT Jun 22 2026"
 */
function robustParseDate(fullText) {
  if (!fullText) return '';

  // Clean up multiple spaces and newlines
  const cleaned = fullText.replace(/\s+/g, ' ').trim();

  // Try to match "HH:MM:SS AM/PM TZ Mon DD YYYY" (the exact Netradyne pattern)
  const match = cleaned.match(
    /(\d{1,2}:\d{2}:\d{2}\s*[AP]M)\s*[A-Z]{3,4}\s*([A-Z][a-z]{2}\s*\d{1,2}\s*\d{4})/i
  );
  if (match) {
    const timePart = match[1];   // "03:02:56 AM"
    const datePart = match[2];   // "Jun 23 2026"
    const d = new Date(`${datePart} ${timePart}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Fallback: try any recognizable date near a time
  const timeMatch = cleaned.match(/(\d{1,2}:\d{2}:\d{2}\s*[AP]M)/i);
  const dateMatch = cleaned.match(/([A-Z][a-z]{2}\s*\d{1,2},?\s*\d{4})/i);
  if (timeMatch && dateMatch) {
    const d = new Date(`${dateMatch[0].replace(',', '')} ${timeMatch[0]}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // If all else fails, return the cleaned text
  return cleaned;
}

export async function scrapeAlerts(context) {
  const page = await context.newPage();
  try {
    await page.goto(NETRADYNE.url, { waitUntil: 'networkidle', timeout: 30000 });

    // ---- Aggressive overlay removal ----
    await page.evaluate(() => {
      const removals = [
        '.modal-backdrop', '.modal', '.cdk-overlay-container',
        '[class*="overlay"]', '[class*="popup"]', '.tour-overlay',
        '.onboarding-overlay', '.ui-widget-overlay',
      ];
      removals.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // ---- Select "Last 12 Hours" ----
    try {
      // Wait for the duration toggle to be clickable
      await page.waitForSelector('[uib-dropdown-toggle]', { timeout: 5000 });
      await page.click('[uib-dropdown-toggle]');
      await page.waitForTimeout(800);
      // Wait for the dropdown item to appear and click it
      await page.waitForSelector('#duration-filter-last-12-hours', { state: 'visible', timeout: 5000 });
      await page.click('#duration-filter-last-12-hours');
      await page.waitForTimeout(2000);
      log.info('Time range set to Last 12 Hours');
    } catch (e) {
      log.warn('Time range selection failed, using current view');
    }

    // ---- Wait for alert items to exist ----
    await page.waitForFunction(
      () => document.querySelectorAll('ul.alerts-div > li.alerts-page-li').length > 0,
      { timeout: 20000 }
    );

    // ---- Extract alerts using innerText parsing ----
    const alerts = await page.evaluate(() => {
      const rows = document.querySelectorAll('ul.alerts-div > li.alerts-page-li');
      return Array.from(rows).map(row => {
        const text = (sel) => row.querySelector(sel)?.textContent?.trim() || '';
        const alertId = row.getAttribute('prop-alert-id') || '';

        // ---- TIME: extract from the entire row text ----
        const fullText = row.innerText || '';
        // Find the pattern: "HH:MM:SS AM/PM TZ\nMon DD YYYY" or similar
        const timePattern = /(\d{1,2}:\d{2}:\d{2}\s*[AP]M)\s*([A-Z]{3,4})\s*\n?\s*([A-Z][a-z]{2}\s*\d{1,2}\s*\d{4})/i;
        const timeMatch = fullText.match(timePattern);
        let timeStr = '';
        let dateStr = '';
        if (timeMatch) {
          timeStr = timeMatch[1] + ' ' + timeMatch[2];   // "03:02:56 AM PDT"
          dateStr = timeMatch[3];                         // "Jun 23 2026"
        } else {
          // fallback: try separate patterns
          const timeOnly = fullText.match(/(\d{1,2}:\d{2}:\d{2}\s*[AP]M)/);
          const dateOnly = fullText.match(/([A-Z][a-z]{2}\s*\d{1,2}\s*\d{4})/);
          if (timeOnly) timeStr = timeOnly[0];
          if (dateOnly) dateStr = dateOnly[0];
        }

        // Other fields
        const driver = text('.notification-box-driver-name');
        const vehicleEl = row.querySelector('.notification-box-vehicle-num');
        const vehicle = vehicleEl?.querySelector('div')?.textContent?.trim() || '';
        const alertType = text('.notification-details-alert-type');
        const subType = text('.notification-subtype');
        const durationText = Array.from(row.querySelectorAll('*')).find(el =>
          el.textContent.includes('Alert Duration :')
        )?.textContent || '';
        const severityIcon = row.querySelector('.notification-box-alert-icon i')?.className || '';

        return {
          externalAlertId: alertId,
          driverName: driver,
          driverId: '',
          vehicleNumber: vehicle,
          eventType: alertType,
          eventCategory: subType || alertType,
          timeStr,
          dateStr,
          durationText,
          severityIcon,
          rawData: { innerText: fullText },
        };
      });
    });

    // ---- Debug first alert's time strings ----
    if (alerts.length > 0) {
      console.log('🔍 DEBUG first alert time strings:', {
        timeStr: alerts[0].timeStr,
        dateStr: alerts[0].dateStr,
      });
    }

    // ---- Map to final objects with parsed dates ----
    const finalAlerts = alerts.map(raw => {
      const combined = raw.timeStr && raw.dateStr
        ? `${raw.dateStr} ${raw.timeStr.replace(/\s*[A-Z]{3,4}$/, '')}`
        : raw.timeStr || raw.dateStr || '';
      const occurredAt = combined ? robustParseDate(combined) : '';

      let durationSeconds = 0;
      const durMatch = raw.durationText?.match(/(\d+)m\s*(\d+)s/);
      if (durMatch) durationSeconds = parseInt(durMatch[1]) * 60 + parseInt(durMatch[2]);

      let severity = '';
      if (raw.severityIcon.includes('severe')) severity = 'Severe';
      else if (raw.severityIcon.includes('moderate')) severity = 'Moderate';
      else if (raw.severityIcon.includes('positive')) severity = 'Positive';

      return {
        externalAlertId: raw.externalAlertId,
        driverName: raw.driverName,
        driverId: '',
        vehicleNumber: raw.vehicleNumber,
        eventType: raw.eventType,
        eventCategory: raw.eventCategory,
        occurredAt,
        durationSeconds,
        status: 'New',
        severity,
        rawData: raw.rawData,
      };
    });

    log.info(`Scraped ${finalAlerts.length} alerts`);
    return finalAlerts;
  } finally {
    await page.close();
  }
}