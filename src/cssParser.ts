import postcss, { Root, Rule, Declaration, AtRule } from 'postcss';
import safeParser from 'postcss-safe-parser';
import { TailwindMapper, CSSProperty } from './tailwindMapper';
import { logger } from './utils/logger';
import { 
  Breakpoint, 
  getBreakpoints, 
  resolveBreakpointsFromConfig,
  processMediaQuery, 
  prefixWithBreakpoint,
  clearBreakpointCache 
} from './utils/breakpointResolver';

export interface UtilityWithVariant {
  value: string;
  variant?: string;
}

export interface CSSRule {
  selector: string;
  className: string;
  declarations: CSSProperty[];
  convertedClasses: string[];
  utilities: UtilityWithVariant[];
  breakpoint?: string;
  skipped: boolean;
  fullyConverted: boolean;
  partialConversion: boolean;
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
  private breakpoints: Breakpoint[];

  constructor(mapper: TailwindMapper, screens?: Record<string, string | [string, string]>) {
    this.mapper = mapper;
    this.breakpoints = screens 
      ? resolveBreakpointsFromConfig(screens) 
      : getBreakpoints();
  }

  private processRule(
    rule: Rule,
    breakpoint?: string
  ): { cssRule: CSSRule; conversionResults: Array<{ declaration: CSSProperty; converted: boolean; className: string | null }>; conversionWarnings: string[] } | null {
    if (rule.selector.includes(':')) {
      return null;
    }

    const classNameMatch = rule.selector.match(/^\.([a-zA-Z_-][a-zA-Z0-9_-]*)$/);
    if (!classNameMatch) {
      return null;
    }

    const className = classNameMatch[1];
    const declarations: CSSProperty[] = [];

    rule.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) {
        return;
      }

      if (decl.value.includes('calc(')) {
        return;
      }

      declarations.push({
        property: decl.prop,
        value: decl.value
      });
    });

    if (declarations.length === 0) {
      return null;
    }

    const conversionResults: Array<{
      declaration: CSSProperty;
      converted: boolean;
      className: string | null;
    }> = [];
    const conversionWarnings: string[] = [];

    declarations.forEach(decl => {
      const result = this.mapper.convertProperty(decl.property, decl.value);
      conversionResults.push({
        declaration: decl,
        converted: !result.skipped && result.className !== null,
        className: result.className
      });
      if (result.skipped && result.reason) {
        conversionWarnings.push(result.reason);
      }
    });

    const utilities: UtilityWithVariant[] = conversionResults
      .filter(r => r.converted && r.className)
      .map(r => ({
        value: r.className!,
        variant: breakpoint
      }));

    const convertedClasses = utilities.map(u => 
      u.variant ? prefixWithBreakpoint(u.value, u.variant) : u.value
    );

    const allDeclarationsConverted = conversionResults.every(r => r.converted);
    const someDeclarationsConverted = convertedClasses.length > 0;

    const cssRule: CSSRule = {
      selector: rule.selector,
      className,
      declarations,
      convertedClasses,
      utilities,
      breakpoint,
      skipped: !someDeclarationsConverted,
      fullyConverted: allDeclarationsConverted,
      partialConversion: someDeclarationsConverted && !allDeclarationsConverted,
      reason: !someDeclarationsConverted ? 'No convertible declarations' : undefined
    };

    return { cssRule, conversionResults, conversionWarnings };
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

      root.walkAtRules((atRule) => {
        if (atRule.name !== 'media') {
          return;
        }

        const mediaResult = processMediaQuery(atRule.params, this.breakpoints);

        if (mediaResult.skipped) {
          warnings.push(mediaResult.reason || `Skipped media query: ${atRule.params}`);
          return;
        }

        const breakpoint = mediaResult.breakpoint!;

        const nestedRules: Rule[] = [];
        atRule.walkRules((rule) => {
          nestedRules.push(rule);
        });

        for (const rule of nestedRules) {
          const result = this.processRule(rule, breakpoint);
          if (result) {
            rules.push(result.cssRule);
            warnings.push(...result.conversionWarnings);

            if (result.cssRule.convertedClasses.length > 0) {
              hasChanges = true;

              if (result.cssRule.fullyConverted) {
                rule.remove();
                logger.verbose(`Removed rule .${result.cssRule.className} in @media (min-width) → ${breakpoint}`);
              } else {
                for (const cr of result.conversionResults) {
                  if (cr.converted) {
                    rule.walkDecls((decl) => {
                      if (decl.prop === cr.declaration.property && decl.value === cr.declaration.value) {
                        decl.remove();
                      }
                    });
                  }
                }
                logger.verbose(`Partial conversion of .${result.cssRule.className} in @media → ${breakpoint}`);
              }
            }
          }
        }

        if (atRule.nodes && atRule.nodes.length === 0) {
          atRule.remove();
          logger.verbose(`Removed empty @media rule`);
        }
      });

      root.walkRules((rule) => {
        if (rule.parent && rule.parent.type === 'atrule') {
          return;
        }

        if (rule.selector.includes(':')) {
          warnings.push(`Skipped pseudo-selector: ${rule.selector}`);
          logger.verbose(`Skipping pseudo-selector: ${rule.selector}`);
          return;
        }

        const classNameMatch = rule.selector.match(/^\.([a-zA-Z_-][a-zA-Z0-9_-]*)$/);
        if (!classNameMatch) {
          warnings.push(`Skipped complex selector: ${rule.selector}`);
          logger.verbose(`Skipping complex selector: ${rule.selector}`);
          return;
        }

        const result = this.processRule(rule);
        if (!result) {
          return;
        }

        const { cssRule, conversionResults, conversionWarnings } = result;
        rules.push(cssRule);
        warnings.push(...conversionWarnings);

        if (cssRule.convertedClasses.length > 0) {
          hasChanges = true;

          if (cssRule.fullyConverted) {
            rule.remove();
            logger.verbose(`Removed rule .${cssRule.className} (all ${cssRule.declarations.length} declarations converted)`);
          } else {
            let removedCount = 0;
            rule.walkDecls((decl) => {
              const wasConverted = conversionResults.some(r =>
                r.converted &&
                r.declaration.property === decl.prop &&
                r.declaration.value === decl.value
              );

              if (wasConverted) {
                decl.remove();
                removedCount++;
              }
            });

            logger.verbose(`Partial conversion of .${cssRule.className}: removed ${removedCount}/${cssRule.declarations.length} declarations`);
          }
        }
      });

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
