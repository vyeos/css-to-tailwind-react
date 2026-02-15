# CSS to Tailwind React

Convert traditional CSS (inline, internal, and external) into Tailwind CSS utility classes for React-based frameworks.

## Features

✨ **Multi-source CSS support**: Handles inline styles, internal `<style>` blocks, and external CSS files
🎯 **AST-based parsing**: Uses Babel for JSX/TSX and PostCSS for CSS - no regex hacks
🔄 **Smart merging**: Safely merges Tailwind classes with existing className attributes
⚠️ **Safety first**: Creates backups before modifications, supports dry-run mode
🎨 **Tailwind config aware**: Reads your `tailwind.config.js` for custom scales
📊 **Detailed reporting**: Shows exactly what changed and what was skipped

## Installation

```bash
npm install -g css-to-tailwind-react
```

Or use directly with npx:

```bash
npx css-to-tailwind-react ./src
```

## Usage

### Basic Usage

```bash
npx css-to-tailwind-react ./src
```

### CLI Options

```bash
npx css-to-tailwind-react <directory> [options]

Options:
  --dry-run          Show changes without modifying files
  --verbose          Show detailed output
  --delete-css       Delete CSS files when all rules are converted
  --skip-external    Skip external CSS files (imports)
  --skip-inline      Skip inline styles
  --skip-internal    Skip internal <style> blocks
```

### Examples

**Preview changes (dry-run):**
```bash
npx css-to-tailwind-react ./src --dry-run --verbose
```

**Only inline styles:**
```bash
npx css-to-tailwind-react ./src --skip-external --skip-internal
```

**Full conversion with CSS cleanup:**
```bash
npx css-to-tailwind-react ./src --delete-css
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

### External CSS

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
import "./styles.css";

function Header() {
  return <h1 className="font-bold text-center mb-5">Title</h1>;
}
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

## Supported CSS Properties

The following properties are supported in v1:

- **Display**: `display: flex`, `display: block`, etc.
- **Position**: `position: relative`, `absolute`, etc.
- **Spacing**: `margin`, `padding` (with px to Tailwind scale conversion)
- **Typography**: `font-weight`, `font-size`, `text-align`
- **Flexbox**: `flex-direction`, `flex-wrap`, `justify-content`, `align-items`
- **Gap**: `gap` (with spacing scale)
- **Dimensions**: `width`, `height` (basic values and percentages)
- **Colors**: `background-color`, `color` (named, hex, rgb)
- **Border**: `border-radius`

## What Gets Skipped

The following are intentionally skipped with warnings:

- Pseudo-selectors (`:hover`, `:focus`, etc.)
- Media queries
- Nested selectors
- CSS animations and keyframes
- CSS variables (`--*`)
- `calc()` expressions
- Dynamic styles (conditional expressions)
- Complex className expressions

## Safety Features

### Backups

All original files are backed up to `.css-to-tailwind-backups/` before modification. To restore:

```bash
# Manual restore
cp -r .css-to-tailwind-backups/* ./
```

### Dry Run

Always preview changes first:

```bash
npx css-to-tailwind-react ./src --dry-run --verbose
```

### Dynamic Content Detection

The tool safely skips dynamic expressions:

```jsx
// These are skipped with warnings
<div style={dynamicStyle} />
<div className={condition ? "a" : "b"} style={{ display: "flex" }} />
```

## Configuration

The tool automatically detects and uses your `tailwind.config.js` if present. It supports:

- Custom spacing scales
- Extended colors
- Custom font sizes
- Border radius values

Example config support:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    }
  }
}
```

## Programmatic API

```typescript
import { scanProject, transformFiles } from 'css-to-tailwind-react';

const files = await scanProject('./src');
const results = await transformFiles(files, {
  dryRun: false,
  deleteCss: true,
  skipExternal: false,
  skipInline: false,
  skipInternal: false,
  tailwindConfig: null,
  projectRoot: './src'
});

console.log(`Modified ${results.filesModified} files`);
```

## Architecture

```
src/
├── cli.ts              # Commander CLI entry
├── scanner.ts          # File detection with fast-glob
├── jsxParser.ts        # Babel AST transformations
├── cssParser.ts        # PostCSS CSS parsing
├── tailwindMapper.ts   # CSS to Tailwind conversion engine
├── transformer.ts      # Main transformation coordinator
├── fileWriter.ts       # Safe file operations with backups
└── utils/
    ├── logger.ts       # Structured logging
    └── config.ts       # Tailwind config loading
```

## Limitations

### v1 Limitations

1. **No pseudo-selectors**: `:hover`, `:focus`, etc. are skipped
2. **No media queries**: Responsive styles are not converted
3. **No SCSS/Sass**: Plain CSS only
4. **Limited value formats**: Pixel values and standard units work best
5. **No complex selectors**: Only simple class selectors (`.classname`)
6. **No CSS-in-JS**: Styled-components, emotion, etc. not supported

### Best Practices

1. **Commit your code** before running
2. **Use `--dry-run`** first to preview changes
3. **Review warnings** - some styles may need manual conversion
4. **Test thoroughly** after conversion
5. **Keep backups** until you're confident

## Troubleshooting

### "No supported files found"

Ensure your target directory contains `.js`, `.jsx`, `.ts`, `.tsx`, or `.css` files. The tool automatically ignores `node_modules`, `.next`, `dist`, and `build` directories.

### "Failed to parse"

Some JavaScript/TypeScript syntax may not be supported. Ensure your code is valid and doesn't use experimental features.

### Missing Tailwind classes

The tool uses a default Tailwind config if none is found. Create a `tailwind.config.js` for custom scales.

### Too many warnings

Use `--verbose` to see detailed output about what's being skipped and why.

## Contributing

Contributions welcome! Please ensure:

1. Code follows TypeScript strict mode
2. All tests pass
3. New features include tests
4. Documentation is updated

## License

MIT

## Changelog

### 1.0.0

- Initial release
- Inline style conversion
- External CSS support
- Internal style support
- Backup and dry-run modes
- Tailwind config detection
