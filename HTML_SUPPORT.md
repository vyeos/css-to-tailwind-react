# HTML/CSS Support Roadmap

## Current Status
**NOT SUPPORTED** - The tool is built specifically for React/JSX projects.

## What Would Need to Change

### 1. Scanner Updates
```typescript
// Add HTML file detection
const htmlPatterns = ['**/*.html'];
const htmlFiles = await glob(htmlPatterns, { ... });
```

### 2. HTML Parser (Created: src/htmlParser.ts)
✅ Created a basic HTML parser that:
- Parses `style="display: flex; padding: 16px;"` attributes
- Converts to `class="flex p-4"`
- Handles existing class merging
- Extracts `<link rel="stylesheet">` references

### 3. Scanner Integration
```typescript
// In scanner.ts, add:
else if (file.endsWith('.html')) {
  return { path: file, type: 'html' };
}
```

### 4. Transformer Updates
```typescript
// Process HTML files
for (const file of files.filter(f => f.type === 'html')) {
  const htmlParser = new HTMLParser(mapper);
  const result = htmlParser.parse(content, file.path);
  // Replace inline styles with classes
}
```

### 5. External CSS Link Handling
```typescript
// Extract and process linked stylesheets
const stylesheets = htmlParser.extractStylesheets(html);
for (const cssPath of stylesheets) {
  // Process CSS file
  // Replace class references in HTML
}
```

## Implementation Complexity
**Estimated: 2-3 hours of work**

### Files to Modify:
1. `src/scanner.ts` - Add HTML file detection
2. `src/transformer.ts` - Add HTML processing pipeline
3. `src/htmlParser.ts` - ✅ Created (needs integration)
4. `src/index.ts` - Export HTML parser

### Limitations Would Be Same:
- Pseudo-selectors (`:hover`, `:focus`)
- Media queries
- CSS variables
- Complex selectors

## Usage After Implementation
```bash
# Would work on HTML projects
npx css-to-tailwind-react ./public --include-html

# Or specific HTML file
npx css-to-tailwind-react ./public/index.html
```

## Alternative for HTML Projects Right Now
Use existing tools:
- **[Tailwind CSS CLI](https://tailwindcss.com/docs/installation)** - Extract classes from HTML
- **[Windicss](https://windicss.org/)** - Can analyze HTML files
- **Manual conversion** - Use Tailwind's class search

## Do You Want Me To:
1. ✅ **Add full HTML support** (2-3 hours work)
2. **Create a separate tool** just for HTML/CSS
3. **Leave as React-only** and document alternatives

Let me know and I'll implement it!
