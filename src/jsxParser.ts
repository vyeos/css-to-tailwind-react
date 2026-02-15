import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { TailwindMapper, CSSProperty } from './tailwindMapper';
import { logger } from './utils/logger';

export interface JSXTransformation {
  original: string;
  converted: string;
  classes: string[];
  warnings: string[];
}

export interface JSXParseResult {
  code: string;
  hasChanges: boolean;
  transformations: JSXTransformation[];
  warnings: string[];
}

export class JSXParser {
  private mapper: TailwindMapper;

  constructor(mapper: TailwindMapper) {
    this.mapper = mapper;
  }

  parse(code: string, filePath: string): JSXParseResult {
    const transformations: JSXTransformation[] = [];
    const warnings: string[] = [];
    let hasChanges = false;

    try {
      const ast = parse(code, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'optionalChaining',
          'nullishCoalescingOperator',
          'dynamicImport'
        ]
      });

      traverse(ast, {
        JSXOpeningElement: (path) => {
          const elementName = this.getElementName(path.node);
          
          // Find style attribute
          const styleAttrIndex = path.node.attributes.findIndex(
            attr => t.isJSXAttribute(attr) && 
                    t.isJSXIdentifier(attr.name) && 
                    attr.name.name === 'style'
          );

          if (styleAttrIndex === -1) {
            return;
          }

          const styleAttr = path.node.attributes[styleAttrIndex] as t.JSXAttribute;
          
          // Check if style value is dynamic
          if (!this.isStaticStyle(styleAttr)) {
            warnings.push(`Skipped dynamic style in ${elementName} (line ${path.node.loc?.start.line})`);
            logger.warn(`Dynamic style detected in ${filePath} - skipping`);
            return;
          }

          // Extract CSS properties from style
          const cssProperties = this.extractCSSProperties(styleAttr);
          
          if (cssProperties.length === 0) {
            return;
          }

          // Convert to Tailwind classes
          const { classes, warnings: conversionWarnings } = this.mapper.convertMultiple(cssProperties);

          if (classes.length === 0) {
            warnings.push(...conversionWarnings);
            return;
          }

          // Find existing className
          const classNameAttrIndex = path.node.attributes.findIndex(
            attr => t.isJSXAttribute(attr) && 
                    t.isJSXIdentifier(attr.name) && 
                    attr.name.name === 'className'
          );

          const originalStyle = generate(styleAttr).code;

          if (classNameAttrIndex !== -1) {
            // Merge with existing className
            const classNameAttr = path.node.attributes[classNameAttrIndex] as t.JSXAttribute;
            
            if (!this.isStaticClassName(classNameAttr)) {
              warnings.push(`Skipped dynamic className in ${elementName} (line ${path.node.loc?.start.line})`);
              return;
            }

            const existingClasses = this.extractClassNameValue(classNameAttr);
            const mergedClasses = this.mergeClasses(existingClasses, classes);

            // Update className attribute
            classNameAttr.value = t.stringLiteral(mergedClasses);
          } else {
            // Create new className attribute
            const newClassNameAttr = t.jsxAttribute(
              t.jsxIdentifier('className'),
              t.stringLiteral(classes.join(' '))
            );
            path.node.attributes.push(newClassNameAttr);
          }

          // Remove style attribute
          path.node.attributes.splice(styleAttrIndex, 1);

          // Record transformation
          const newCode = generate(path.node).code;
          transformations.push({
            original: originalStyle,
            converted: newCode,
            classes,
            warnings: conversionWarnings
          });

          hasChanges = true;
          warnings.push(...conversionWarnings);
        }
      });

      // Generate new code
      const output = generate(ast, {
        retainLines: true,
        retainFunctionParens: true,
        comments: true
      });

      return {
        code: output.code,
        hasChanges,
        transformations,
        warnings
      };

    } catch (error) {
      logger.error(`Failed to parse ${filePath}:`, error);
      throw new Error(`Parsing failed: ${error}`);
    }
  }

  private getElementName(node: t.JSXOpeningElement): string {
    if (t.isJSXIdentifier(node.name)) {
      return node.name.name;
    }
    if (t.isJSXMemberExpression(node.name)) {
      return this.getMemberExpressionName(node.name);
    }
    return 'unknown';
  }

  private getMemberExpressionName(node: t.JSXMemberExpression): string {
    if (t.isJSXIdentifier(node.object) && t.isJSXIdentifier(node.property)) {
      return `${node.object.name}.${node.property.name}`;
    }
    return 'unknown';
  }

  private isStaticStyle(attr: t.JSXAttribute): boolean {
    if (!attr.value) {
      return false;
    }

    // Handle style={{ ... }} (object expression)
    if (t.isJSXExpressionContainer(attr.value)) {
      const expression = attr.value.expression;
      
      // Direct object: style={{ color: 'red' }}
      if (t.isObjectExpression(expression)) {
        return true;
      }

      // Check if it's a simple object without variables
      if (t.isIdentifier(expression) || t.isMemberExpression(expression)) {
        return false; // Variable reference - dynamic
      }
    }

    return false;
  }

  private isStaticClassName(attr: t.JSXAttribute): boolean {
    if (!attr.value) {
      return true;
    }

    if (t.isStringLiteral(attr.value)) {
      return true;
    }

    if (t.isJSXExpressionContainer(attr.value)) {
      const expression = attr.value.expression;
      
      // String literal in expression: className={"container"}
      if (t.isStringLiteral(expression)) {
        return true;
      }

      // Template literal without expressions: className={`container`}
      if (t.isTemplateLiteral(expression) && expression.expressions.length === 0) {
        return true;
      }

      // Anything else is dynamic
      return false;
    }

    return false;
  }

  private extractCSSProperties(attr: t.JSXAttribute): CSSProperty[] {
    const properties: CSSProperty[] = [];

    if (!attr.value || !t.isJSXExpressionContainer(attr.value)) {
      return properties;
    }

    const expression = attr.value.expression;

    if (!t.isObjectExpression(expression)) {
      return properties;
    }

    expression.properties.forEach(prop => {
      if (!t.isObjectProperty(prop)) {
        return;
      }

      let propertyName: string | null = null;
      let propertyValue: string | null = null;

      // Get property name
      if (t.isIdentifier(prop.key)) {
        propertyName = prop.key.name;
      } else if (t.isStringLiteral(prop.key)) {
        propertyName = prop.key.value;
      }

      // Get property value
      if (t.isStringLiteral(prop.value)) {
        propertyValue = prop.value.value;
      } else if (t.isNumericLiteral(prop.value)) {
        propertyValue = `${prop.value.value}px`;
      }

      // Handle camelCase to kebab-case conversion for CSS properties
      if (propertyName && propertyValue) {
        const cssProperty = this.camelToKebab(propertyName);
        properties.push({
          property: cssProperty,
          value: propertyValue
        });
      }
    });

    return properties;
  }

  private extractClassNameValue(attr: t.JSXAttribute): string {
    if (!attr.value) {
      return '';
    }

    if (t.isStringLiteral(attr.value)) {
      return attr.value.value;
    }

    if (t.isJSXExpressionContainer(attr.value)) {
      const expression = attr.value.expression;
      
      if (t.isStringLiteral(expression)) {
        return expression.value;
      }

      if (t.isTemplateLiteral(expression) && expression.quasis.length > 0) {
        return expression.quasis[0].value.raw;
      }
    }

    return '';
  }

  private mergeClasses(existing: string, newClasses: string[]): string {
    const existingSet = new Set(existing.split(/\s+/).filter(Boolean));
    newClasses.forEach(cls => existingSet.add(cls));
    return Array.from(existingSet).join(' ');
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
