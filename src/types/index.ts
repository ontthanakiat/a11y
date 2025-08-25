/**
 * Performance metrics interface for capturing page performance data.
 */
export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
}

/**
 * Console message interface for error tracking.
 */
export interface ConsoleMessage {
  type: string;
  text: string;
  location: string;
  timestamp: string;
  stack?: string;
  args?: string[];
  source?: string;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Accessibility test results interface.
 */
export interface AccessibilityTestResults {
  violations: any[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
}

/**
 * Document structure check results.
 */
export interface DocumentStructureResults {
  hasTitle: boolean;
  hasLang: boolean;
  hasViewport: boolean;
}

/**
 * Heading hierarchy check results.
 */
export interface HeadingHierarchyResults {
  isValid: boolean;
  issues: string[];
}

/**
 * Image accessibility check results.
 */
export interface ImageAccessibilityResults {
  totalImages: number;
  imagesWithoutAlt: number;
  percentageWithoutAlt: number;
}

/**
 * Keyboard navigation test results.
 */
export interface KeyboardNavigationResults {
  success: boolean;
  navigatedElements: number;
}

/**
 * ARIA implementation check results.
 */
export interface ARIAImplementationResults {
  landmarks: number;
  validRoles: boolean;
  issues: string[];
}
