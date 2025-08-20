import type { AxeResults } from 'axe-core';
import fs from 'fs';
import path from 'path';

/**
 * Persist an axe-core scan result as JSON to `test-results/accessibility`.
 * Creates the directory if it does not exist. Returns the file path for
 * linking from reports or follow-up processing.
 */
export function saveAccessibilityReport(results: AxeResults, siteName: string) {
  const reportDir = path.join(process.cwd(), 'test-results', 'accessibility');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `${siteName}-${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  return reportPath;
}
