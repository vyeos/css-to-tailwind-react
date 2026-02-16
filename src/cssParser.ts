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
import {
  Specificity,
  calculateSelectorSpecificity,
  calculateDescendantSpecificity,
  ZERO_SPECIFICITY
} from './utils/specificityCalculator';
import { getPropertyForUtility } from './utils/propertyMapper';
import {
  VariableRegistry,
  VariableDefinition,
  VariableScope,
  ResolutionContext,
  isCssVariable,
  isVarExpression,
  createGlobalScope,
  createSelectorScope
} from './utils/variableRegistry';

export interface UtilityWithVariant {
  value: string;
  variants: string[];
  cssProperty: string;
  specificity: Specificity;
  sourceOrder: number;
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
  private sourceOrderCounter: number = 0;
  private variableRegistry: VariableRegistry;
  private sharedRegistry: boolean = false;

  constructor(mapper: TailwindMapper, screens?: Record<string, string | [string, string]>, variableRegistry?: VariableRegistry) {
    this.mapper = mapper;
    this.breakpoints = screens 
      ? resolveBreakpointsFromConfig(screens) 
      : getBreakpoints();
    if (variableRegistry) {
      this.variableRegistry = variableRegistry;
      this.sharedRegistry = true;
    } else {
      this.variableRegistry = new VariableRegistry();
    }
  }

  getVariableRegistry(): VariableRegistry {
    return this.variableRegistry;
  }

  private resetSourceOrder(): void {
    this.sourceOrderCounter = 0;
    if (!this.sharedRegistry) {
      this.variableRegistry.clear();
    }
  }

  private getNextSourceOrder(): number {
    return ++this.sourceOrderCounter;
  }

  private collectVariables(
    node: Root | AtRule,
    additionalVariants: string[] = []
  ): void {
    let sourceOrder = 0;
    
    node.walkRules((rule) => {
      const selector = rule.selector;
      const isRootSelector = selector === ':root';
      
      let scope: VariableScope;
      let specificity: Specificity;
      
      if (isRootSelector) {
        scope = createGlobalScope();
        specificity = { inline: 0, id: 0, class: 0, element: 0 };
      } else {
        const parsed = parseDescendantSelector(selector);
        if (parsed.isComplex) {
          return;
        }
        
        if (parsed.parent) {
          scope = createSelectorScope(selector, parsed.parent.type);
          specificity = calculateDescendantSpecificity(
            parsed.parent.type,
            parsed.parent.name,
            parsed.target.type,
            parsed.target.name
          );
        } else {
          const selectorType = selector.startsWith('.') ? 'class' : 'element';
          scope = createSelectorScope(selector, selectorType);
          specificity = calculateSelectorSpecificity(selector);
        }
      }
      
      rule.walkDecls((decl) => {
        if (!isCssVariable(decl.prop)) {
          return;
        }
        
        const varDef: VariableDefinition = {
          name: decl.prop,
          value: decl.value,
          scope,
          specificity,
          sourceOrder: ++sourceOrder,
          variants: additionalVariants
        };
        
        this.variableRegistry.register(varDef);
        logger.verbose(`Registered CSS variable: ${decl.prop} = ${decl.value} (scope: ${scope.type})`);
      });
    });
  }

  private resolveDeclarationValue(
    value: string,
    selector: string,
    specificity: Specificity,
    variants: string[]
  ): { resolvedValue: string; hasUnresolved: boolean } {
    if (!isVarExpression(value)) {
      return { resolvedValue: value, hasUnresolved: false };
    }
    
    const context: ResolutionContext = {
      selector,
      specificity,
      variants
    };
    
    const result = this.variableRegistry.resolveValue(value, context);
    return { resolvedValue: result.value, hasUnresolved: result.hasUnresolved };
  }

  private convertDeclarations(
    declarations: CSSProperty[],
    specificity: Specificity,
    sourceOrder: number,
    selector: string = '',
    variants: string[] = []
  ): {
    utilities: UtilityWithVariant[];
    conversionResults: Array<{ declaration: CSSProperty; converted: boolean; className: string | null; resolvedValue?: string }>;
    conversionWarnings: string[];
  } {
    const conversionResults: Array<{
      declaration: CSSProperty;
      converted: boolean;
      className: string | null;
      resolvedValue?: string;
    }> = [];
    const conversionWarnings: string[] = [];

    declarations.forEach(decl => {
      const valueToConvert = this.resolveDeclarationValue(
        decl.value,
        selector,
        specificity,
        variants
      );
      
      let convertedInThisBlock = false;
      
      if (valueToConvert.hasUnresolved) {
        const multiResult = this.mapper.convertPropertyWithMultiple(decl.property, valueToConvert.resolvedValue || decl.value);
        
        if (multiResult.classes.length > 0) {
          multiResult.classes.forEach((className) => {
            conversionResults.push({
              declaration: decl,
              converted: true,
              className,
              resolvedValue: valueToConvert.resolvedValue || decl.value
            });
          });
          multiResult.warnings.forEach(w => conversionWarnings.push(w));
          convertedInThisBlock = true;
        }
        
        if (!convertedInThisBlock) {
          conversionResults.push({
            declaration: decl,
            converted: false,
            className: null,
            resolvedValue: valueToConvert.resolvedValue
          });
          conversionWarnings.push(`Could not fully resolve var() in: ${decl.property}: ${decl.value}`);
        }
        return;
      }
      
      const multiResult = this.mapper.convertPropertyWithMultiple(decl.property, valueToConvert.resolvedValue);
      
      if (multiResult.classes.length > 0) {
        multiResult.classes.forEach((className) => {
          conversionResults.push({
            declaration: decl,
            converted: true,
            className,
            resolvedValue: valueToConvert.resolvedValue
          });
        });
        multiResult.warnings.forEach(w => conversionWarnings.push(w));
      } else {
        const result = this.mapper.convertProperty(decl.property, valueToConvert.resolvedValue);
        conversionResults.push({
          declaration: decl,
          converted: !result.skipped && result.className !== null,
          className: result.className,
          resolvedValue: valueToConvert.resolvedValue
        });
        if (result.skipped && result.reason) {
          conversionWarnings.push(result.reason);
        }
      }
    });

    const utilities: UtilityWithVariant[] = conversionResults
      .filter(r => r.converted && r.className)
      .map(r => ({
        value: r.className!,
        variants: [],
        cssProperty: r.declaration.property,
        specificity,
        sourceOrder
      }));

    return { utilities, conversionResults, conversionWarnings };
  }

  private processSimpleRule(
    rule: Rule,
    additionalVariants: string[] = []
  ): { cssRules: CSSRule[]; conversionResults: Array<{ declaration: CSSProperty; converted: boolean; className: string | null; resolvedValue?: string }>[]; conversionWarnings: string[] } | null {
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

    const cssRules: CSSRule[] = [];
    const allConversionResults: Array<{ declaration: CSSProperty; converted: boolean; className: string | null; resolvedValue?: string }>[] = [];
    const allConversionWarnings: string[] = [];

    for (const parsed of validSelectors) {
      const sourceOrder = this.getNextSourceOrder();
      const specificity = calculateSelectorSpecificity(selector);
      const pseudoCount = (parsed.pseudos || []).length;
      const specificityWithPseudo = {
        inline: specificity.inline,
        id: specificity.id,
        class: specificity.class + pseudoCount,
        element: specificity.element
      };
      
      const pseudoVariants = parsed.pseudos || [];
      const allVariants = normalizeVariantOrder([...pseudoVariants, ...additionalVariants]);
      
      const { utilities, conversionResults, conversionWarnings } = this.convertDeclarations(
        declarations,
        specificityWithPseudo,
        sourceOrder,
        selector,
        allVariants
      );
      
      const utilitiesForSelector = utilities.map(u => ({
        ...u,
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
      allConversionWarnings.push(...conversionWarnings);
    }

    return { cssRules, conversionResults: allConversionResults, conversionWarnings: allConversionWarnings };
  }

  private processDescendantRule(
    rule: Rule,
    additionalVariants: string[] = []
  ): { cssRule: CSSRule; conversionResults: Array<{ declaration: CSSProperty; converted: boolean; className: string | null; resolvedValue?: string }>; conversionWarnings: string[] } | null {
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

    const sourceOrder = this.getNextSourceOrder();
    const specificity = calculateDescendantSpecificity(
      parsed.parent.type,
      parsed.parent.name,
      parsed.target.type,
      parsed.target.name
    );

    const { utilities, conversionResults, conversionWarnings } = this.convertDeclarations(
      declarations,
      specificity,
      sourceOrder,
      selector,
      additionalVariants
    );
    
    const utilitiesWithVariants = utilities.map(u => ({
      ...u,
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
    this.resetSourceOrder();
    const rules: CSSRule[] = [];
    const warnings: string[] = [];
    let hasChanges = false;

    try {
      const root = await postcss().process(css, {
        parser: safeParser,
        from: filePath
      }).then(result => result.root);

      if (!this.sharedRegistry) {
        this.collectVariables(root, []);
      }

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
        
        if (!this.sharedRegistry) {
          this.collectVariables(atRule, [responsiveVariant]);
        }

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

  async collectVariablesOnly(css: string, filePath: string): Promise<void> {
    try {
      const root = await postcss().process(css, {
        parser: safeParser,
        from: filePath
      }).then(result => result.root);

      this.collectVariables(root, []);

      root.walkAtRules((atRule) => {
        if (atRule.name !== 'media') {
          return;
        }

        const mediaResult = processMediaQuery(atRule.params, this.breakpoints);
        if (mediaResult.skipped) {
          return;
        }

        const responsiveVariant = mediaResult.breakpoint!;
        this.collectVariables(atRule, [responsiveVariant]);
      });
    } catch (error) {
      logger.warn(`Failed to collect variables from ${filePath}: ${error}`);
    }
  }

  async collectVariablesFromInternalCSS(html: string, filePath: string): Promise<void> {
    const { styles } = this.parseInternalStyle(html);

    for (const style of styles) {
      try {
        await this.collectVariablesOnly(style.content, filePath);
      } catch (error) {
        logger.warn(`Failed to collect variables from internal CSS in ${filePath}: ${error}`);
      }
    }
  }
}