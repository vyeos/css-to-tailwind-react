import { TailwindMapper } from './tailwindMapper';
import { logger } from './utils/logger';

export interface HTMLParseResult {
  html: string;
  hasChanges: boolean;
  conversions: number;
  warnings: string[];
}

export class HTMLParser {
  private mapper: TailwindMapper;

  constructor(mapper: TailwindMapper) {
    this.mapper = mapper;
  }

  parse(html: string, filePath: string): HTMLParseResult {
    const warnings: string[] = [];
    let hasChanges = false;
    let conversions = 0;

    // Parse inline styles: style="display: flex; padding: 16px;"
    // Convert to: class="flex p-4"
    const styleRegex = /style="([^"]*)"/g;
    let modifiedHtml = html;
    let match;

    while ((match = styleRegex.exec(html)) !== null) {
      const fullMatch = match[0];
      const styleValue = match[1];
      
      // Parse CSS declarations from inline style
      const declarations = this.parseInlineStyle(styleValue);
      
      if (declarations.length === 0) {
        continue;
      }

      // Convert to Tailwind classes
      const { classes, warnings: convWarnings } = this.mapper.convertMultiple(declarations);

      if (classes.length === 0) {
        warnings.push(...convWarnings);
        continue;
      }

      // Find existing class attribute
      const beforeStyle = html.substring(0, match.index);
      const tagMatch = beforeStyle.match(/<([a-z][a-z0-9]*)[^>]*$/i);
      
      if (!tagMatch) {
        warnings.push(`Could not find tag for inline style`);
        continue;
      }

      // Check if there's an existing class attribute
      const tagEnd = html.indexOf('>', match.index);
      const tagContent = html.substring(match.index, tagEnd);
      const existingClassMatch = tagContent.match(/class="([^"]*)"/);

      let replacement: string;
      
        if (existingClassMatch && existingClassMatch.index !== undefined) {
        // Merge with existing class
        const existingClasses = existingClassMatch[1];
        const mergedClasses = this.mergeClasses(existingClasses, classes);
        
        // Replace class attribute and remove style
        const beforeClass = modifiedHtml.substring(0, match.index + existingClassMatch.index);
        const afterStyle = modifiedHtml.substring(match.index + fullMatch.length);
        
        // This is complex - need to handle both class and style replacement
        // For now, simplified version:
        replacement = `class="${mergedClasses}"`;
        modifiedHtml = modifiedHtml.replace(fullMatch, replacement);
      } else {
        // Add class attribute, remove style
        replacement = `class="${classes.join(' ')}"`;
        modifiedHtml = modifiedHtml.replace(fullMatch, replacement);
      }

      conversions += classes.length;
      hasChanges = true;
      warnings.push(...convWarnings);
    }

    return {
      html: modifiedHtml,
      hasChanges,
      conversions,
      warnings
    };
  }

  private parseInlineStyle(styleValue: string): Array<{property: string; value: string}> {
    const declarations: Array<{property: string; value: string}> = [];
    
    // Split by semicolon
    const props = styleValue.split(';').filter(s => s.trim());
    
    props.forEach(prop => {
      const colonIndex = prop.indexOf(':');
      if (colonIndex === -1) return;
      
      const property = prop.substring(0, colonIndex).trim();
      const value = prop.substring(colonIndex + 1).trim();
      
      if (property && value) {
        declarations.push({ property, value });
      }
    });
    
    return declarations;
  }

  private mergeClasses(existing: string, newClasses: string[]): string {
    const existingSet = new Set(existing.split(/\s+/).filter(Boolean));
    newClasses.forEach(cls => existingSet.add(cls));
    return Array.from(existingSet).join(' ');
  }

  extractStylesheets(html: string): string[] {
    const stylesheets: string[] = [];
    const linkRegex = /<link[^>]*rel="stylesheet"[^>]*href="([^"]*)"[^>]*>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      stylesheets.push(match[1]);
    }

    return stylesheets;
  }
}
