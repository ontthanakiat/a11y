# Playwright Accessibility Testing Framework

A comprehensive automated testing framework for web accessibility using Playwright and Axe-core.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Code Flow](#code-flow)
- [Test Reports](#test-reports)
- [Accessibility Rules](#accessibility-rules)
- [Error Tracking](#error-tracking)
- [Git Flow](#git-flow)

## Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)
- macOS, Windows, or Linux

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd playwright-a11y
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

4. Configure your test sites:
```bash
cp data/sites.json.example data/sites.json
```
Then edit `sites.json` with your own sites that need accessibility testing.

## Test Sites Configuration

The framework uses `sites.json` to determine which websites to test for accessibility. A template is provided as `sites.json.example`:

```json
{
  "wcagTags": ["wcag2a", "wcag2aa"],
  "excludeRules": ["empty-heading", "label-content-name-mismatch"],
  "urls": [
    "https://www.example.com/",
    "https://www.example.com/page1"
  ]
}
```

To configure your test sites:

1. Copy the example configuration:

```bash
cp data/sites.json.example data/sites.json
```

2. Edit `data/sites.json` and replace the URLs with your own websites that need accessibility testing.

The configuration file supports the following options:

- `wcagTags`: WCAG standards to test against (e.g., "wcag2a" for WCAG 2.0 Level A)
- `excludeRules`: Array of accessibility rules to ignore
- `urls`: Array of URLs to test for accessibility compliance

## Project Structure

```
playwright-a11y/
├─ playwright.config.ts    # Playwright configuration
├─ package.json           # Project dependencies and scripts
├─ tsconfig.json         # TypeScript configuration
├─ data/
│  ├─ sites.json.example  # Template for test site configuration
│  └─ sites.json         # Your actual test site configuration
├─ tests/
│  ├─ a11y.spec.ts           # Accessibility test specs
│  └─ console-message.spec.ts # Browser console error tracking
├─ src/
│  ├─ fixtures/
│  │  └─ test-fixtures.ts   # Custom test fixtures
│  ├─ pages/
│  │  ├─ BasePage.ts        # Base page object
│  │  └─ GenericPage.ts     # Generic page methods
│  └─ utils/
│     ├─ axe.ts            # Axe-core integration
│     └─ reporters.ts      # Custom reporting
└─ data/
   ├─ sites.json          # Test URLs and configurations (gitignored)
   ├─ sites-example.json  # Example configuration template
   └─ axe.lighthouse.rules.json  # Accessibility rules
```

## Configuration

### Playwright Configuration
```typescript
// playwright.config.ts
{
  testDir: './tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    actionTimeout: 0,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
}
```

### Accessibility Rules
```json
// data/axe.lighthouse.rules.json
[
  "area-alt",
  "aria-allowed-attr",
  "aria-required-attr",
  // ... more rules
]
```

### Test URLs
```json
// data/sites.json
{
  "wcagTags": ["wcag2a", "wcag2aa"],
  "excludeRules": ["empty-heading", "label-content-name-mismatch"],
  "urls": [
    "https://example.com",
    // ... more URLs
  ]
}
```

**Note:** The `data/sites.json` file is gitignored to prevent committing actual test URLs. Use `data/sites-example.json` as a template to create your own `sites.json` file with your specific URLs and configurations.

## Running Tests

Run all accessibility tests:
```bash
npm run test
```

Run tests for specific URLs:
```bash
npm run test:a11y
```

View test report:
```bash
npm run report
```

## Code Flow

This walkthrough shows what happens when you run the accessibility tests, where data and rules come from, and which files are involved.

Example command:
```bash
npx playwright test tests/a11y.spec.ts
```

High-level flow:
- Playwright reads configuration from `playwright.config.ts`.
  - Chooses browsers/projects and global settings (trace on retry, screenshots/videos on failure).
- Playwright executes the test file `tests/a11y.spec.ts`.
  - Imports test data from `data/sites.json`.
  - Imports custom fixtures from `src/fixtures/test-fixtures.ts` for capturing `consoleErrors`, `pageErrors`, and `requestFailures`.
  - Uses the page object `src/pages/GenericPage.ts` (which extends `src/pages/BasePage.ts`) for navigation.
  - Calls `runAxe` from `src/utils/axe.ts` to perform the accessibility scan.
- Per-URL loop (defined in `tests/a11y.spec.ts`):
  - Iterates over `sites.urls` from `data/sites.json`.
  - Navigates via `GenericPage.goto()`, which wraps navigation in a named `test.step` for clear reporting.
  - Runs `runAxe(page, testInfo)`; raw violations are attached to the report as `axe-violations.json`.
- Assertions and error checks:
  - Expects zero violations (soft assertion so all failures are reported).
  - `expectNoClientErrors(...)` verifies no console errors, page errors, or failed requests (from fixtures).
- Reporting:
  - Console output and HTML report under `playwright-report/`.
  - Trace on retry; screenshots/videos retained on failure.
  - Optional: persist full axe results using `src/utils/reporters.ts` (`saveAccessibilityReport`) to `test-results/accessibility/`.

Key data files and their roles:
- `data/sites.json`
  - `wcagTags`: Which rule tags to run (e.g., `wcag2a`, `wcag2aa`).
  - `excludeRules`: Specific axe rule IDs to skip.
  - `urls`: List of pages to test.
- `data/axe.lighthouse.rules.json`
  - Baseline set of axe rule IDs to include (Lighthouse-like). These are filtered by `excludeRules`.

Where to adjust behavior:
- Add/remove tested URLs: edit `data/sites.json` → `urls` (copy from `data/sites-example.json` if needed).
- Loosen/tighten checks: edit `data/sites.json` → `wcagTags` and `excludeRules`, or modify `data/axe.lighthouse.rules.json`.
- Browser matrix and timeouts: edit `playwright.config.ts`.
- Navigation or shared page utilities: edit `src/pages/BasePage.ts` or extend `src/pages/GenericPage.ts`.
- Error capture behavior: edit `src/fixtures/test-fixtures.ts`.

## Test Reports

The framework generates two types of reports:
1. Console output (during test execution)
2. HTML report (after test completion)
   - Access at `playwright-report/index.html`
   - Contains detailed violations with screenshots
   - Includes trace files for failed tests

## Accessibility Rules

The framework checks for:
- WCAG 2.0 Level A compliance
- WCAG 2.0 Level AA compliance
- Common accessibility patterns
- HTML structure and semantics
- ARIA attributes and roles

### Error Categories
1. Critical Violations
   - Missing form labels
   - Empty button text
   - Invalid ARIA attributes

2. Serious Violations
   - Color contrast issues
   - Missing alternative text
   - Keyboard navigation problems

## Error Tracking

The framework includes four specialized test suites, each serving a specific purpose:

### Test Suites Overview

| Test File | Complexity | Use Case | Main Focus |
|-----------|------------|----------|------------|
| `a11y.spec.ts` | Basic | Quick a11y checks | Basic accessibility compliance using Axe-core |
| `comprehensive-a11y.spec.ts` | Advanced | Full a11y testing | Detailed accessibility with custom rules and advanced configurations |
| `console-message.spec.ts` | Intermediate | Debugging | Console error monitoring and browser-side issues |
| `example.spec.ts` | Basic | Learning | Template/Example for new test creation |

### When to Use Each Test Suite

1. **Basic Accessibility Testing (`a11y.spec.ts`)**
   - Quick accessibility compliance checks
   - Basic Axe-core implementation
   - Ideal for rapid testing and CI/CD pipelines

2. **Comprehensive Accessibility Testing (`comprehensive-a11y.spec.ts`)**
   - Multiple page/component testing
   - Custom accessibility rules
   - Detailed reporting capabilities
   - Advanced configuration options
   - Use for production-grade accessibility validation

3. **Console Error Tracking (`console-message.spec.ts`)**
   - Monitors browser console messages
   - Tracks uncaught exceptions
   - Verifies API responses
   - Ideal for debugging and development phases

4. **Example Testing (`example.spec.ts`)**
   - Reference implementation
   - Training resource for new team members
   - Template for creating new test files
   - Best practices demonstration

### Error Types and Features

#### Console Message Types

1. Console Errors

```typescript
// Captures error-level console messages
page.on('console', msg => {
  if (msg.type() === 'error') {
    messages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    });
  }
});
```

2. Uncaught Exceptions

```typescript
// Captures unhandled JavaScript errors
page.on('pageerror', error => {
  messages.push({
    type: 'uncaught exception',
    text: error.message,
    location: error.stack || 'No stack trace',
    timestamp: new Date().toISOString()
  });
});
```

#### Supported Features

- Detailed error reporting with timestamps
- Stack trace preservation
- Error location tracking
- JSON report generation
- Automatic screenshot capture on failure
- Video recording of failed tests
- Test retry support

#### Running Tests

```bash
# Run only console error tests
npx playwright test console-message.spec.ts

# View detailed HTML report
npx playwright show-report
```

## Best Practices

1. Test Organization:
   - Group tests by feature/page
   - Use descriptive test names
   - Include error messages in assertions

2. Page Objects:
   - Extend BasePage for common functionality
   - Keep page-specific logic in page classes
   - Use meaningful method names

3. Custom Fixtures:
   - Create reusable test fixtures
   - Share common setup/teardown
   - Organize by functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

## Git Flow

Suggested lightweight workflow for this repo:

### Git Workflow Steps

1. Create a feature branch from `main`:

```bash
git checkout -b feat/<short-description>
```

2. Commit changes in logical chunks with clear messages:

```bash
git add .
git commit -m "feat: add axe scan docs and code flow"
```

3. Rebase on latest `main` before opening a PR:

```bash
git fetch origin
git rebase origin/main
```

4. Push and open a Pull Request:

```bash
git push -u origin feat/<short-description>
```

### Branch Naming Conventions

- `feat/<scope>`: new features
- `fix/<scope>`: bug fixes
- `docs/<scope>`: documentation only
- `chore/<scope>`: tooling, deps, config

### Commit Conventions (Conventional Commits)

- `feat: ...` adds functionality
- `fix: ...` fixes a bug
- `docs: ...` docs-only changes
- `chore: ...` tooling/config changes
- `refactor: ...` code changes without features/bug fixes
- `test: ...` test-only changes

### Release Management

- Squash-merge PRs to keep history clean
- Tag releases after merging significant changes:

```bash
git tag -a v0.1.0 -m "First release"
git push --tags
```

## Project License

This project is licensed under the MIT License - see the LICENSE file for details.