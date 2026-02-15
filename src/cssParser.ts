import postcss, { Root, Rule, Declaration, AtRule } from 'postcss';
import safeParser from 'postcss-safe-parser';
import { TailwindMapper, CSSProperty } from './tailwindMapper';
import { logger } from './utils/logger';
import { 
  Breakpoint, 
  getBreakpoints, 
  resolveBreakpointsFromConfig,
  processMediaQuery 
} from './utils/breakpointResolver';
import {
  processPseudoSelector,
  parseMultipleSelectors,
  ParsedSelector
} from './utils/pseudoSelectorResolver';
import {
  parseDescendantSelector,
  processDescendantSelector,
  DescendantSelector,
  SelectorPart,
  isHtmlElement
} from './utils/descendantSelectorResolver';
import {
  assembleUtility,
  assembleUtilities,
  MergedUtility,
  mergeUtilities,
  normalizeVariantOrder
} from './utils/variantAssembler';

export interface UtilityWithVariant {
  value: string;
  variants: string[];
}

export interface SelectorTarget {
  type: 'class' | 'element';
  name: string;
}

export interface CSSRule {
  selector: string;
  className: string;
  declarations: CSSProperty[];
  convertedClasses: string[];
  utilities: UtilityWithVariant[];
  skipped: boolean;
  fullyConverted: boolean;
  partialConversion: boolean;
  reason?: string;
  isDescendant: boolean;
  parentSelector?: SelectorTarget;
  targetSelector?: SelectorTarget;
}

export interface CSSParseResult {
  css: string;
  rules: CSSRule[];
  hasChanges: boolean;
  canDelete: boolean;
  warnings: string[];
}

export interface CSSUsageMap {
  [className: string]: string[];
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

  private convertDeclarations(declarations: CSSProperty[]): {
    utilities: UtilityWithVariant[];
    conversionResults: Array<{ declaration: CSSProperty; converted: boolean; className: string | null }>;
    conversionWarnings: string[];
  } {
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
        variants: []
      }));

    return { utilities, conversionResults, conversionWarnings };
  }

  private processSimpleRule(
    rule: Rule,
    additionalVariants: string[] = []
  ): { cssRules: CSSRule[]; conversionResults: Array<{ declaration: CSSProperty; converted: boolean; className: string | null }>[]; conversionWarnings: string[] } | null {
    const selector = rule.selector;
    const parsedSelectors = parseMultipleSelectors(selector);
    
    const validSelectors = parsedSelectors.filter(s => !s.isComplex && s.baseClass);
    
    if (validSelectors.length === 0) {
      return null;
    }

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

    const { utilities, conversionResults, conversionWarnings } = this.convertDeclarations(declarations);
    
    const utilitiesWithVariants = utilities.map(u => ({
      value: u.value,
      variants: normalizeVariantOrder([...u.variants, ...additionalVariants])
    }));

    const cssRules: CSSRule[] = [];
    const allConversionResults: Array<{ declaration: CSSProperty; converted: boolean; className: string | null }>[] = [];

    for (const parsed of validSelectors) {
      const pseudoVariants = parsed.pseudos || [];
      const allVariants = normalizeVariantOrder([...pseudoVariants, ...additionalVariants]);
      
      const utilitiesForSelector = utilities.map(u => ({
        value: u.value,
        variants: allVariants
      }));

      const convertedClasses = assembleUtilities(utilitiesForSelector);

      const allDeclarationsConverted = conversionResults.every(r => r.converted);
      const someDeclarationsConverted = convertedClasses.length > 0;

      const cssRule: CSSRule = {
        selector: selector,
        className: parsed.baseClass,
        declarations,
        convertedClasses,
        utilities: utilitiesForSelector,
        skipped: !someDeclarationsConverted,
        fullyConverted: allDeclarationsConverted,
        partialConversion: someDeclarationsConverted && !allDeclarationsConverted,
        reason: !someDeclarationsConverted ? 'No convertible declarations' : undefined,
        isDescendant: false
      };

      cssRules.push(cssRule);
      allConversionResults.push(conversionResults);
    }

    return { cssRules, conversionResults: allConversionResults, conversionWarnings };
  }

  private processDescendantRule(
    rule: Rule,
    additionalVariants: string[] = []
  ): { cssRule: CSSRule; conversionResults: Array<{ declaration: CSSProperty; converted: boolean; className: string | null }>; conversionWarnings: string[] } | null {
    const selector = rule.selector;
    const parsed = parseDescendantSelector(selector);
    
    if (parsed.isComplex || !parsed.parent) {
      return null;
    }

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

    const { utilities, conversionResults, conversionWarnings } = this.convertDeclarations(declarations);
    
    const utilitiesWithVariants = utilities.map(u => ({
      value: u.value,
      variants: normalizeVariantOrder([...u.variants, ...additionalVariants])
    }));

    const convertedClasses = assembleUtilities(utilitiesWithVariants);

    const allDeclarationsConverted = conversionResults.every(r => r.converted);
    const someDeclarationsConverted = convertedClasses.length > 0;

    const className = parsed.parent.type === 'class' ? parsed.parent.name : '';
    const targetName = parsed.target.type === 'class' ? `.${parsed.target.name}` : parsed.target.name;

    const cssRule: CSSRule = {
      selector: selector,
      className,
      declarations,
      convertedClasses,
      utilities: utilitiesWithVariants,
      skipped: !someDeclarationsConverted,
      fullyConverted: allDeclarationsConverted,
      partialConversion: someDeclarationsConverted && !allDeclarationsConverted,
      reason: !someDeclarationsConverted ? 'No convertible declarations' : undefined,
      isDescendant: true,
      parentSelector: parsed.parent,
      targetSelector: parsed.target
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

        const responsiveVariant = mediaResult.breakpoint!;

        const nestedRules: Rule[] = [];
        atRule.walkRules((rule) => {
          nestedRules.push(rule);
        });

        for (const rule of nestedRules) {
          const descendantResult = this.processDescendantRule(rule, [responsiveVariant]);
          if (descendantResult) {
            rules.push(descendantResult.cssRule);
            warnings.push(...descendantResult.conversionWarnings);

            if (descendantResult.cssRule.convertedClasses.length > 0) {
              hasChanges = true;

              if (descendantResult.cssRule.fullyConverted) {
                rule.remove();
                logger.verbose(`Removed descendant rule ${rule.selector} in @media → ${responsiveVariant}`);
              } else {
                for (const cr of descendantResult.conversionResults) {
                  if (cr.converted) {
                    rule.walkDecls((decl) => {
                      if (decl.prop === cr.declaration.property && decl.value === cr.declaration.value) {
                        decl.remove();
                      }
                    });
                  }
                }
                logger.verbose(`Partial conversion of descendant rule in @media → ${responsiveVariant}`);
              }
            }
            continue;
          }

          const simpleResult = this.processSimpleRule(rule, [responsiveVariant]);
          if (simpleResult) {
            rules.push(...simpleResult.cssRules);
            warnings.push(...simpleResult.conversionWarnings);

            const anyConverted = simpleResult.cssRules.some(r => r.convertedClasses.length > 0);
            if (anyConverted) {
              hasChanges = true;

              const allFullyConverted = simpleResult.cssRules.every(r => r.fullyConverted);
              if (allFullyConverted) {
                rule.remove();
                const classNames = simpleResult.cssRules.map(r => r.className).join(', .');
                logger.verbose(`Removed rule .${classNames} in @media (min-width) → ${responsiveVariant}`);
              } else {
                for (const cr of simpleResult.conversionResults.flat()) {
                  if (cr.converted) {
                    rule.walkDecls((decl) => {
                      if (decl.prop === cr.declaration.property && decl.value === cr.declaration.value) {
                        decl.remove();
                      }
                    });
                  }
                }
                logger.verbose(`Partial conversion in @media → ${responsiveVariant}`);
              }
            }
          } else {
            warnings.push(`Skipped rule in @media: ${rule.selector}`);
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

        const descendantResult = this.processDescendantRule(rule);
        if (descendantResult) {
          rules.push(descendantResult.cssRule);
          warnings.push(...descendantResult.conversionWarnings);

          if (descendantResult.cssRule.convertedClasses.length > 0) {
            hasChanges = true;

            if (descendantResult.cssRule.fullyConverted) {
              rule.remove();
              logger.verbose(`Removed descendant rule ${rule.selector}`);
            } else {
              for (const cr of descendantResult.conversionResults) {
                if (cr.converted) {
                  rule.walkDecls((decl) => {
                    if (decl.prop === cr.declaration.property && decl.value === cr.declaration.value) {
                      decl.remove();
                    }
                  });
                }
              }
              logger.verbose(`Partial conversion of descendant rule`);
            }
          }
          return;
        }

        const simpleResult = this.processSimpleRule(rule);
        
        if (!simpleResult) {
          const parsed = parseDescendantSelector(rule.selector);
          if (parsed.isComplex) {
            warnings.push(parsed.reason || `Skipped complex selector: ${rule.selector}`);
            logger.verbose(`Skipping complex selector: ${rule.selector}`);
          } else {
            const parsedSelectors = parseMultipleSelectors(rule.selector);
            const allComplex = parsedSelectors.every(s => s.isComplex);
            
            if (allComplex) {
              const reasons = parsedSelectors.map(s => s.reason).filter(Boolean);
              warnings.push(...reasons as string[]);
              logger.verbose(`Skipping complex selector: ${rule.selector}`);
            }
          }
          return;
        }

        rules.push(...simpleResult.cssRules);
        warnings.push(...simpleResult.conversionWarnings);

        const anyConverted = simpleResult.cssRules.some(r => r.convertedClasses.length > 0);
        if (anyConverted) {
          hasChanges = true;

          const allFullyConverted = simpleResult.cssRules.every(r => r.fullyConverted);
          if (allFullyConverted) {
            rule.remove();
            const classNames = simpleResult.cssRules.map(r => r.className).join(', .');
            logger.verbose(`Removed rule .${classNames} (all declarations converted)`);
          } else {
            for (const cr of simpleResult.conversionResults.flat()) {
              if (cr.converted) {
                rule.walkDecls((decl) => {
                  if (decl.prop === cr.declaration.property && decl.value === cr.declaration.value) {
                    decl.remove();
                  }
                });
              }
            }
            logger.verbose(`Partial conversion of rule`);
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

    for (let i = styles.length - 1; i >= 0; i--) {
      const style = styles[i];
      
      try {
        const result = await this.parse(style.content, filePath);
        
        allRules.push(...result.rules);
        allWarnings.push(...result.warnings);

        if (result.hasChanges) {
          hasChanges = true;

          if (result.canDelete || result.css.trim() === '') {
            modifiedHtml = modifiedHtml.slice(0, style.start) + modifiedHtml.slice(style.end);
          } else {
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
    
    const importRegex = /import\s+['"]([^'"]+\.css)['"];?/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    const requireRegex = /require\s*\(\s*['"]([^'"]+\.css)['"]\s*\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }
}