# CSS to Tailwind React

A powerful CLI tool that converts traditional CSS (inline, internal, and external) into Tailwind CSS utility classes for React-based frameworks. Built with AST-based parsing for accuracy and safety.

## Features

- **Multi-source CSS support**: Handles inline styles, internal `<style>` blocks, and external CSS files
- **AST-based parsing**: Uses Babel for JSX/TSX and PostCSS for CSS - no regex hacks
- **Responsive variants**: Converts `@media` queries to responsive prefixes (`sm:`, `md:`, `lg:`, etc.)
- **Pseudo-selector support**: Converts `:hover`, `:focus`, `:active` and more to Tailwind variants
- **Descendant selectors**: Handles nested selectors like `.parent .child`
- **CSS variables**: Resolves and converts CSS custom properties
- **Specificity-aware**: Correctly handles CSS specificity and class conflicts
- **Smart merging**: Safely merges Tailwind classes with existing className attributes
- **Diff mode**: See exactly what changed with unified diff output
- **Comprehensive configuration**: Project-level config files with strict validation
- **Tailwind config aware**: Reads your `tailwind.config.js` for custom scales

## Installation

### From GitHub Packages

First, create or update your `.npmrc` file to use GitHub Packages:

```bash
# .npmrc
@vyeos:registry=https://npm.pkg.github.com
```

Then authenticate with GitHub Packages:

```bash
npm login --scope=@vyeos --registry=https://npm.pkg.github.com
```

Install the package:

```bash
npm install -g @vyeos/css-to-tailwind-react
```

### Use with npx

```bash
npx @vyeos/css-to-tailwind-react ./src
```

## Quick Start

```bash
# Preview changes without modifying files
npx css-to-tailwind-react ./src --dry-run --diff

# Convert all CSS in your project
npx css-to-tailwind-react ./src

# Strict mode - only convert exact matches
npx css-to-tailwind-react ./src --strict-mode --disable-arbitrary-values
```

## CLI Options

```
Usage: css-to-tailwind-react [options] <directory>

Options:
  --dry-run, --preview         Show changes without modifying files
  --diff                       Print unified diff for each modified file
  --silent                     Suppress per-file logs, show only summary
  --json-report                Output structured JSON summary
  --verbose                    Show detailed output including resolved config
  --delete-css                 Delete CSS files when all rules are converted
  --skip-external              Skip external CSS files (imports)
  --skip-inline                Skip inline styles
  --skip-internal              Skip internal <style> blocks
  --strict-mode                Skip unsupported conversions instead of arbitrary values
  --preserve-original-css      Keep original CSS rules after conversion
  --disable-arbitrary-values   Skip properties that cannot map exactly to Tailwind scale
  --include <patterns>         Comma-separated glob patterns to include
  --exclude <patterns>         Comma-separated glob patterns to exclude
  --ignore-selectors           Comma-separated selectors to skip entirely
  --ignore-properties          Comma-separated CSS properties to skip
  --config <path>              Path to config file (auto-detected if not specified)
```

## Configuration

### Config File Discovery

The tool automatically looks for a config file in this order:

1. `css-to-tailwind.config.ts`
2. `css-to-tailwind.config.js`
3. `css-to-tailwind.config.mjs`
4. `css-to-tailwind.config.cjs`
5. `css-to-tailwind.config.json`

If multiple exist, TypeScript takes priority, then JavaScript, then JSON. If none exist, internal defaults are used.

### Config File Schema

```typescript
// css-to-tailwind.config.ts
export default {
  // Glob patterns for files to process
  include: ['**/*.{js,jsx,ts,tsx}', '**/*.css'],
  
  // Glob patterns to ignore
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/*.d.ts',
    '**/.*'
  ],
  
  // Skip unsupported conversions instead of generating arbitrary values
  strictMode: false,
  
  // Keep original CSS rules after conversion (useful for partial migrations)
  preserveOriginalCSS: false,
  
  // Only convert values that match Tailwind's scale exactly
  disableArbitraryValues: false,
  
  // Map custom pixel values to Tailwind tokens
  customSpacingScale: {
    '18px': '4.5',
    '22px': '5.5',
    '26px': '6.5'
  },
  
  // Skip these selectors entirely
  ignoreSelectors: [
    '.no-convert',
    '.legacy-styles',
    '.third-party-widget'
  ],
  
  // Skip these CSS properties
  ignoreProperties: [
    'animation',
    'transition',
    'transform'
  ],
  
  // Logging level: 'silent' | 'info' | 'verbose'
  logLevel: 'info',
  
  // Output behavior: 'write' | 'dry-run'
  outputMode: 'write',
  
  // Delete CSS files when all rules are converted
  deleteCss: false,
  
  // Skip specific CSS sources
  skipExternal: false,
  skipInline: false,
  skipInternal: false
};
```

### CLI Overrides

CLI flags always override config file values:

```bash
# Config file says strictMode: false, but CLI overrides to true
npx css-to-tailwind-react ./src --strict-mode

# Override include patterns from command line
npx css-to-tailwind-react ./src --include "**/*.tsx" --exclude "**/*.test.tsx"
```

### Config Validation

The tool validates your configuration at runtime. Invalid keys or wrong types produce clear errors:

```
Configuration Error:
  - Unknown configuration key: "invalidOption"
  - "strictMode" must be a boolean
  - "logLevel" must be one of: silent, info, verbose
```

## Supported Conversions

### Inline Styles

Input:
```jsx
<div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
  Content
</div>
```

Output:
```jsx
<div className="flex justify-center p-4">
  Content
</div>
```

### External CSS with Class Replacement

Input (`styles.css`):
```css
.main-head {
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
}
```

Component:
```jsx
import "./styles.css";

function Header() {
  return <h1 className="main-head">Title</h1>;
}
```

Output:
```jsx
// CSS file is modified or removed depending on settings
function Header() {
  return <h1 className="font-bold text-center mb-5">Title</h1>;
}
```

### Responsive Variants

Input:
```css
.container {
  padding: 16px;
}

@media (min-width: 768px) {
  .container {
    padding: 32px;
    display: flex;
  }
}
```

Output:
```jsx
// className becomes:
className="p-4 md:p-8 md:flex"
```

### Pseudo-Selector Variants

Input:
```css
.button {
  background-color: blue;
  opacity: 0.8;
}

.button:hover {
  opacity: 1;
}

.button:focus {
  outline: 2px solid blue;
}

.button:active {
  transform: scale(0.98);
}
```

Output:
```jsx
// className becomes:
className="bg-blue-500 opacity-80 hover:opacity-100 focus:outline-2 focus:outline-blue-500 active:scale-[0.98]"
```

Supported pseudo-selectors:
- `:hover` → `hover:`
- `:focus` → `focus:`
- `:focus-within` → `focus-within:`
- `:focus-visible` → `focus-visible:`
- `:active` → `active:`
- `:first-child` → `first:`
- `:last-child` → `last:`
- `:odd` → `odd:`
- `:even` → `even:`
- `:disabled` → `disabled:`
- `:checked` → `checked:`
- `:first-of-type` → `first-of-type:`
- `:last-of-type` → `last-of-type:`
- `:only-child` → `only-child:`
- `:only-of-type` → `only-of-type:`
- `:empty` → `empty:`
- `:visited` → `visited:`
- `:target` → `target:`
- `:read-only` → `read-only:`
- `:required` → `required:`
- `:invalid` → `invalid:`
- `:valid` → `valid:`

### Descendant Selectors

Input:
```css
.card p {
  color: gray;
  font-size: 14px;
}

.list li {
  padding: 8px;
}
```

The tool applies these styles to matching nested elements within the parent class.

### CSS Variables

Input:
```css
:root {
  --primary-color: #3b82f6;
  --spacing: 16px;
}

.button {
  background-color: var(--primary-color);
  padding: var(--spacing);
}
```

Output:
```jsx
// Variables are resolved and converted
className="bg-[#3b82f6] p-4"
```

### ClassName Merging

Input:
```jsx
<div className="container" style={{ display: "flex" }}>
  Content
</div>
```

Output:
```jsx
<div className="container flex">
  Content
</div>
```

Partial conversions append instead of replace:
```jsx
// If CSS has unsupported properties
<div className="legacy-class font-bold text-center">
```

## Supported CSS Properties

### Layout & Display
- `display`: flex, block, inline, inline-block, grid, hidden, etc.
- `position`: static, relative, absolute, fixed, sticky
- `overflow`, `overflow-x`, `overflow-y`
- `visibility`
- `z-index`

### Flexbox & Grid
- `flex-direction`, `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`
- `justify-content`, `align-items`, `align-content`, `align-self`
- `gap`, `row-gap`, `column-gap`
- `grid-template-columns`, `grid-template-rows`
- `grid-column`, `grid-row`
- `place-items`, `place-content`, `place-self`

### Spacing
- `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`
- `padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left`
- Values convert from px to Tailwind scale (16px → p-4)
- Custom scales via `customSpacingScale` config

### Sizing
- `width`, `height`
- `min-width`, `max-width`, `min-height`, `max-height`
- `aspect-ratio`

### Typography
- `font-weight` (100-900 → font-thin, font-light, font-bold, etc.)
- `font-size` (converts to text-xs, text-sm, text-base, etc.)
- `text-align` (left, center, right, justify)
- `text-decoration` (underline, line-through, none)
- `text-transform` (uppercase, lowercase, capitalize)
- `line-height`
- `letter-spacing`
- `color`

### Backgrounds
- `background-color`
- `background` (shorthand)

### Borders
- `border-width`, `border-style`, `border-color`
- `border-radius`
- `border-top`, `border-right`, `border-bottom`, `border-left`

### Effects
- `opacity` (0-1 → opacity-0, opacity-50, opacity-100)
- `box-shadow` (limited)

### Other
- `object-fit`, `object-position`
- `word-break`
- `cursor`

## Configuration Options Explained

### strictMode

When `true`, the tool skips any conversion that would require arbitrary values:

```javascript
// strictMode: false (default)
padding: 18px;  → p-[18px]

// strictMode: true
padding: 18px;  → SKIPPED (no match in Tailwind scale)
```

Use with `customSpacingScale` to define your own mappings:
```javascript
customSpacingScale: {
  '18px': '4.5',  // Now 18px → p-4.5
}
```

### disableArbitraryValues

Prevents generation of bracket notation:

```javascript
// disableArbitraryValues: false (default)
color: #ff0000;  → text-[#ff0000]

// disableArbitraryValues: true
color: #ff0000;  → SKIPPED
```

### preserveOriginalCSS

Keeps original CSS rules alongside converted Tailwind classes:

```javascript
// preserveOriginalCSS: false (default)
// CSS rule is removed after full conversion

// preserveOriginalCSS: true
// CSS rule remains, className gets appended
```

Useful for gradual migrations where you want to verify the conversion works before removing CSS.

### ignoreSelectors

Skip specific selectors entirely:

```javascript
ignoreSelectors: [
  '.no-convert',      // Skip this class
  '.third-party-*',   // Patterns not supported, exact match only
  '#root'             // Skip by ID selector
]
```

### ignoreProperties

Skip specific CSS properties:

```javascript
ignoreProperties: [
  'animation',        // Skip all animation properties
  'transition',       // Skip all transition properties
  'box-shadow'        // Skip box-shadow (complex values)
]
```

### logLevel

Control output verbosity:

- `silent`: Only summary, no per-file output (useful for CI)
- `info`: Normal output with file names and summary
- `verbose`: Detailed output including every conversion

## Output Modes

### Diff Mode

See exactly what changes with unified diff output:

```bash
npx css-to-tailwind-react ./src --dry-run --diff
```

```
diff --git a/src/components/Button.tsx b/src/components/Button.tsx
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -5,3 +5,3 @@
-  return <button style={{ padding: "16px", backgroundColor: "blue" }}>
+  return <button className="p-4 bg-blue-500">
     Click me
```

### JSON Report

Structured output for CI/CD integration:

```bash
npx css-to-tailwind-react ./src --json-report
```

```json
{
  "success": true,
  "dryRun": false,
  "summary": {
    "filesScanned": 42,
    "filesModified": 15,
    "utilitiesGenerated": 128,
    "classesReplaced": 89,
    "warnings": 3
  },
  "files": [
    {
      "path": "src/components/Button.tsx",
      "status": "modified",
      "hasChanges": true,
      "transformations": {
        "utilitiesGenerated": 5,
        "classesReplaced": 3
      }
    }
  ]
}
```

## Programmatic API

```typescript
import { 
  scanProject, 
  transformFilesDetailed, 
  resolveConfig,
  Config 
} from 'css-to-tailwind-react';

// Resolve configuration (loads config file + applies defaults)
const { config } = await resolveConfig('./src');

// Scan files with config patterns
const files = await scanProject('./src', { config });

// Transform with full options
const { fileResults, stats } = await transformFilesDetailed(files, {
  dryRun: false,
  deleteCss: config.deleteCss,
  skipExternal: config.skipExternal,
  skipInline: config.skipInline,
  skipInternal: config.skipInternal,
  tailwindConfig: null, // or load with loadTailwindConfig()
  projectRoot: './src',
  config,
  strictMode: config.strictMode,
  preserveOriginalCSS: config.preserveOriginalCSS,
  disableArbitraryValues: config.disableArbitraryValues,
  ignoreSelectors: config.ignoreSelectors,
  ignoreProperties: config.ignoreProperties
});

console.log(`Modified ${stats.filesModified} files`);
console.log(`Generated ${stats.utilitiesGenerated} utilities`);
console.log(`Resolved ${stats.conflictsResolved} conflicts`);
```

### Individual Components

```typescript
import { 
  TailwindMapper,
  CSSParser,
  JSXParser,
  Reporter
} from 'css-to-tailwind-react';

// Use TailwindMapper directly
const mapper = new TailwindMapper(tailwindConfig, {
  strictMode: true,
  disableArbitraryValues: false,
  customSpacingScale: { '18px': '4.5' }
});

const result = mapper.convertProperty('padding', '16px');
console.log(result.className); // 'p-4'

// Use CSSParser directly
const cssParser = new CSSParser(mapper, screens, variableRegistry, {
  ignoreSelectors: ['.no-convert'],
  ignoreProperties: ['animation'],
  preserveOriginalCSS: false
});

const parseResult = await cssParser.parse(cssContent, 'styles.css');
console.log(parseResult.rules); // Array of CSSRule objects

// Use JSXParser directly
const jsxParser = new JSXParser(mapper);
const jsxResult = jsxParser.parse(jsxCode, 'Component.tsx');
console.log(jsxResult.transformations); // Array of transformations
```

## Architecture

```
src/
├── cli.ts                      # Commander CLI entry point
├── scanner.ts                  # File discovery with fast-glob
├── jsxParser.ts                # Babel AST transformations for JSX
├── cssParser.ts                # PostCSS CSS parsing
├── tailwindMapper.ts           # CSS property to Tailwind conversion
├── transformer.ts              # Main transformation coordinator
├── fileWriter.ts               # Safe file operations with backups
├── jsxDescendantTransformer.ts # Descendant selector handling
└── utils/
    ├── projectConfig.ts        # Configuration loading and validation
    ├── config.ts               # Tailwind config loading
    ├── logger.ts               # Structured logging with levels
    ├── reporter.ts             # Summary and diff reporting
    ├── diff.ts                 # Unified diff generation
    ├── breakpointResolver.ts   # Media query to breakpoint mapping
    ├── pseudoSelectorResolver.ts # Pseudo-selector parsing
    ├── variantAssembler.ts     # Variant prefix assembly
    ├── conflictResolver.ts     # Specificity-based conflict resolution
    ├── specificityCalculator.ts # CSS specificity computation
    ├── descendantSelectorResolver.ts # Descendant selector parsing
    ├── variableRegistry.ts     # CSS variable tracking and resolution
    └── propertyMapper.ts       # Property to utility mapping
```

## What Gets Skipped

The following are skipped with warnings (unless configured otherwise):

- Complex selectors (`:not()`, `:nth-child()`, attribute selectors)
- CSS animations and `@keyframes`
- `calc()` expressions
- Dynamic inline styles (variable references)
- Complex className expressions
- Properties in `ignoreProperties` list
- Selectors in `ignoreSelectors` list
- Values that don't match Tailwind scale (in strictMode)

## Safety Features

### Backups

All original files are backed up to `.css-to-tailwind-backups/` before modification:

```bash
# Restore from backups
cp -r .css-to-tailwind-backups/* ./
```

### Dry Run

Always preview changes first:

```bash
npx css-to-tailwind-react ./src --dry-run --verbose --diff
```

### Deterministic Behavior

The tool produces consistent output:
- Config loading doesn't depend on environment state
- No arbitrary project code execution beyond config files
- TypeScript configs are safely transpiled in isolation

### Conflict Resolution

When multiple CSS rules apply to the same element:
- Specificity is calculated correctly
- Source order is respected
- Conflicting utilities are resolved deterministically

## Best Practices

1. **Commit your code** before running the migrator
2. **Use `--dry-run --diff`** to preview all changes
3. **Start with a config file** for project-specific settings
4. **Use `strictMode`** with `customSpacingScale` for exact matches only
5. **Review warnings** - some styles may need manual adjustment
6. **Test thoroughly** after conversion
7. **Run Tailwind's purge** to remove unused classes

## Troubleshooting

### "No supported files found"

Check your `include` and `exclude` patterns. Default patterns:
```
include: ['**/*.{js,jsx,ts,tsx}', '**/*.css']
exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', ...]
```

### "Failed to parse"

Ensure your code is valid JavaScript/TypeScript. Some experimental syntax may not be supported.

### "Configuration Error"

The tool validates config strictly. Check for:
- Unknown configuration keys
- Wrong types (e.g., string instead of boolean)
- Invalid logLevel or outputMode values

### Missing Tailwind classes

Create a `tailwind.config.js` to provide custom scales. The tool uses default values otherwise.

### Too many arbitrary values

Enable `strictMode` and provide `customSpacingScale` mappings:

```javascript
// css-to-tailwind.config.ts
export default {
  strictMode: true,
  customSpacingScale: {
    '14px': '3.5',
    '18px': '4.5',
    '22px': '5.5'
  }
};
```

## Contributing

Contributions welcome! Please ensure:

1. Code follows TypeScript strict mode
2. All tests pass (`npm test`)
3. New features include tests
4. Documentation is updated

## License

MIT
