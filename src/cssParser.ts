import postcss, { Root, Rule, Declaration, AtRule } from 'postcss';
import safeParser from 'postcss-safe-parser';
import { TailwindMapper, CSSProperty } from './tailwindMapper';
import { logger } from './utils/logger';

export interface CSSRule {
  selector: string;
  className: string;
  declarations: CSSProperty[];
  convertedClasses: string[];
  skipped: boolean;
  reason?: string;
}

export interface CSSParseResult {
  css: string;
  rules: CSSRule[];
  hasChanges: boolean;
  canDelete: boolean;
  warnings: string[];
}

export interface CSSUsageMap {
  [className: string]: string[]; // className -> file paths
}

export class CSSParser {
  private mapper: TailwindMapper;

  constructor(mapper: TailwindMapper) {
    this.mapper = mapper;
  }

  async parse(css: string, filePath: string): Promise<CSSParseResult> {
    const rules: CSSRule[] = [];
    const warnings: string[] = [];
    let hasChanges = false;

    try {
      const root = await postcss().process(css, {
        parser: safeParser,
        from: filePath
      }).then(result => result.root);

      // Process each rule
      root.walkRules((rule) => {
        // Skip rules inside @media, @supports, etc.
        if (rule.parent && rule.parent.type === 'atrule') {
          warnings.push(`Skipped rule with at-rule parent: ${rule.selector}`);
          logger.verbose(`Skipping at-rule: ${rule.selector}`);
          return;
        }

        // Skip pseudo-selectors
        if (rule.selector.includes(':')) {
          warnings.push(`Skipped pseudo-selector: ${rule.selector}`);
          logger.verbose(`Skipping pseudo-selector: ${rule.selector}`);
          return;
        }

        // Only process simple class selectors
        const classNameMatch = rule.selector.match(/^\.([a-zA-Z_-][a-zA-Z0-9_-]*)$/);
        if (!classNameMatch) {
          warnings.push(`Skipped complex selector: ${rule.selector}`);
          logger.verbose(`Skipping complex selector: ${rule.selector}`);
          return;
        }

        const className = classNameMatch[1];
        const declarations: CSSProperty[] = [];

        rule.walkDecls((decl) => {
          // Skip CSS variables
          if (decl.prop.startsWith('--')) {
            warnings.push(`Skipped CSS variable: ${decl.prop}`);
            return;
          }

          // Skip calc()
          if (decl.value.includes('calc(')) {
            warnings.push(`Skipped calc() value: ${decl.value}`);
            return;
          }

          declarations.push({
            property: decl.prop,
            value: decl.value
          });
        });

        if (declarations.length === 0) {
          return;
        }

        // Convert to Tailwind classes
        const { classes, warnings: conversionWarnings } = this.mapper.convertMultiple(declarations);

        const cssRule: CSSRule = {
          selector: rule.selector,
          className,
          declarations,
          convertedClasses: classes,
          skipped: classes.length === 0,
          reason: classes.length === 0 ? 'No convertible declarations' : undefined
        };

        rules.push(cssRule);
        warnings.push(...conversionWarnings);

        if (classes.length > 0) {
          hasChanges = true;
          // Remove the rule from AST
          rule.remove();
        }
      });

      // Clean up empty at-rules
      root.walkAtRules((atRule) => {
        if (atRule.nodes && atRule.nodes.length === 0) {
          atRule.remove();
        }
      });

      const canDelete = root.nodes.length === 0;
      const newCss = root.toString();

      return {
        css: newCss,
        rules,
        hasChanges,
        canDelete,
        warnings
      };

    } catch (error) {
      logger.error(`Failed to parse CSS ${filePath}:`, error);
      throw new Error(`CSS parsing failed: ${error}`);
    }
  }

  parseInternalStyle(html: string): { 
    styles: Array<{ content: string; start: number; end: number }>;
    warnings: string[];
  } {
    const styles: Array<{ content: string; start: number; end: number }> = [];
    const warnings: string[] = [];

    // Simple regex to find style tags (this is safe for finding tags, not for parsing content)
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;

    while ((match = styleRegex.exec(html)) !== null) {
      styles.push({
        content: match[1].trim(),
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return { styles, warnings };
  }

  async parseInternalCSS(html: string, filePath: string): Promise<{
    html: string;
    rules: CSSRule[];
    hasChanges: boolean;
    warnings: string[];
  }> {
    const allRules: CSSRule[] = [];
    const allWarnings: string[] = [];
    let modifiedHtml = html;
    let hasChanges = false;

    const { styles } = this.parseInternalStyle(html);

    // Process styles in reverse order to preserve indices
    for (let i = styles.length - 1; i >= 0; i--) {
      const style = styles[i];
      
      try {
        const result = await this.parse(style.content, filePath);
        
        allRules.push(...result.rules);
        allWarnings.push(...result.warnings);

        if (result.hasChanges) {
          hasChanges = true;

          if (result.canDelete || result.css.trim() === '') {
            // Remove entire style tag
            modifiedHtml = modifiedHtml.slice(0, style.start) + modifiedHtml.slice(style.end);
          } else {
            // Replace style content
            const before = modifiedHtml.slice(0, style.start);
            const after = modifiedHtml.slice(style.end);
            const tagStart = html.slice(style.start).match(/<style[^>]*>/)?.[0] || '<style>';
            const tagEnd = '</style>';
            modifiedHtml = before + tagStart + '\n' + result.css + '\n' + tagEnd + after;
          }
        }
      } catch (error) {
        logger.warn(`Failed to parse internal style block: ${error}`);
        allWarnings.push(`Failed to parse internal style: ${error}`);
      }
    }

    return {
      html: modifiedHtml,
      rules: allRules,
      hasChanges,
      warnings: allWarnings
    };
  }

  extractImportPaths(code: string): string[] {
    const imports: string[] = [];
    
    // Match CSS imports
    const importRegex = /import\s+['"]([^'"]+\.css)['"];?/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    // Match require statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+\.css)['"]\s*\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }
}
