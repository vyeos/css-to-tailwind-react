import fs from 'fs';
import path from 'path';
import { ScannedFile } from './scanner';
import { TailwindMapper } from './tailwindMapper';
import { JSXParser } from './jsxParser';
import { CSSParser, CSSRule } from './cssParser';
import { FileWriter } from './fileWriter';
import { TailwindConfig } from './utils/config';
import { logger } from './utils/logger';

export interface TransformOptions {
  dryRun: boolean;
  deleteCss: boolean;
  skipExternal: boolean;
  skipInline: boolean;
  skipInternal: boolean;
  tailwindConfig: TailwindConfig | null;
  projectRoot: string;
}

export interface TransformResults {
  filesScanned: number;
  filesModified: number;
  stylesConverted: number;
  classesReplaced: number;
  warnings: number;
}

interface CSSClassMap {
  [className: string]: string[]; // className -> Tailwind classes
}

export async function transformFiles(
  files: ScannedFile[],
  options: TransformOptions
): Promise<TransformResults> {
  const results: TransformResults = {
    filesScanned: files.length,
    filesModified: 0,
    stylesConverted: 0,
    classesReplaced: 0,
    warnings: 0
  };

  const mapper = new TailwindMapper(options.tailwindConfig || {});
  const jsxParser = new JSXParser(mapper);
  const cssParser = new CSSParser(mapper);
  const fileWriter = new FileWriter({ dryRun: options.dryRun });

  // Track CSS class mappings for replacement
  const cssClassMap: CSSClassMap = {};

  // First pass: Process CSS files
  if (!options.skipExternal) {
    logger.info('\n🎨 Processing CSS files...');
    
    for (const file of files.filter(f => f.type === 'css')) {
      try {
        const content = fs.readFileSync(file.path, 'utf-8');
        const result = await cssParser.parse(content, file.path);

        // Build class map
        result.rules.forEach(rule => {
          if (rule.convertedClasses.length > 0) {
            cssClassMap[rule.className] = rule.convertedClasses;
            results.stylesConverted += rule.declarations.length;
            results.classesReplaced += 1;
          }
        });

        results.warnings += result.warnings.length;

        if (result.hasChanges) {
          // Write or delete CSS file
          if (result.canDelete && options.deleteCss) {
            await fileWriter.deleteFile(file.path);
          } else {
            await fileWriter.writeFile(file.path, result.css, content);
          }
          results.filesModified++;
        }

        // Log warnings
        result.warnings.forEach(warning => {
          logger.verbose(`⚠️  ${file.path}: ${warning}`);
        });

      } catch (error) {
        logger.error(`Failed to process ${file.path}:`, error);
        results.warnings++;
      }
    }
  }

  // Second pass: Process JSX/TSX files
  logger.info('\n⚛️  Processing React components...');

  for (const file of files.filter(f => f.type === 'jsx')) {
    try {
      let content = fs.readFileSync(file.path, 'utf-8');
      const originalContent = content;
      let hasChanges = false;
      let fileWarnings: string[] = [];

      // Process inline styles
      if (!options.skipInline) {
        logger.verbose(`Parsing inline styles in ${file.path}`);
        
        try {
          const jsxResult = jsxParser.parse(content, file.path);
          
          if (jsxResult.hasChanges) {
            content = jsxResult.code;
            hasChanges = true;
            results.stylesConverted += jsxResult.transformations.reduce(
              (sum, t) => sum + t.classes.length, 0
            );
            fileWarnings.push(...jsxResult.warnings);
          }
        } catch (error) {
          logger.warn(`Failed to parse JSX in ${file.path}: ${error}`);
          fileWarnings.push(`JSX parse error: ${error}`);
        }
      }

      // Process internal CSS
      if (!options.skipInternal) {
        logger.verbose(`Parsing internal styles in ${file.path}`);
        
        try {
          const internalResult = await cssParser.parseInternalCSS(content, file.path);
          
          if (internalResult.hasChanges) {
            content = internalResult.html;
            hasChanges = true;
            
            // Build class map from internal styles
            internalResult.rules.forEach(rule => {
              if (rule.convertedClasses.length > 0) {
                cssClassMap[rule.className] = rule.convertedClasses;
                results.stylesConverted += rule.declarations.length;
              }
            });
            
            fileWarnings.push(...internalResult.warnings);
          }
        } catch (error) {
          logger.warn(`Failed to parse internal CSS in ${file.path}: ${error}`);
          fileWarnings.push(`Internal CSS parse error: ${error}`);
        }
      }

      // Replace className references from external CSS
      if (Object.keys(cssClassMap).length > 0) {
        const classNameResult = replaceClassNameReferences(content, cssClassMap);
        if (classNameResult.hasChanges) {
          content = classNameResult.code;
          hasChanges = true;
          results.classesReplaced += classNameResult.replacements;
        }
      }

      // Count warnings
      results.warnings += fileWarnings.length;

      // Write file if changed
      if (hasChanges) {
        await fileWriter.writeFile(file.path, content, originalContent);
        results.filesModified++;
      }

      // Log warnings
      fileWarnings.forEach(warning => {
        logger.verbose(`⚠️  ${file.path}: ${warning}`);
      });

    } catch (error) {
      logger.error(`Failed to process ${file.path}:`, error);
      results.warnings++;
    }
  }

  return results;
}

function replaceClassNameReferences(
  code: string, 
  classMap: CSSClassMap
): { code: string; hasChanges: boolean; replacements: number } {
  let hasChanges = false;
  let replacements = 0;
  let modifiedCode = code;

  // Find className="xxx" or className={"xxx"} patterns
  // Note: We use simple string replacement here since we're replacing specific class names
  // The JSX parser handles the complex AST transformations

  Object.entries(classMap).forEach(([oldClass, tailwindClasses]) => {
    const tailwindClassString = tailwindClasses.join(' ');
    
    // Pattern 1: className="oldClass"
    const pattern1 = new RegExp(`className="${oldClass}"`, 'g');
    if (pattern1.test(modifiedCode)) {
      modifiedCode = modifiedCode.replace(pattern1, `className="${tailwindClassString}"`);
      hasChanges = true;
      replacements++;
      logger.verbose(`Replaced className="${oldClass}" with "${tailwindClassString}"`);
    }

    // Pattern 2: className={"oldClass"}
    const pattern2 = new RegExp(`className=\\{"${oldClass}"\\}`, 'g');
    if (pattern2.test(modifiedCode)) {
      modifiedCode = modifiedCode.replace(pattern2, `className="${tailwindClassString}"`);
      hasChanges = true;
      replacements++;
      logger.verbose(`Replaced className={"${oldClass}"} with "${tailwindClassString}"`);
    }

    // Pattern 3: className={`oldClass`} (simple template literal without expressions)
    const pattern3 = new RegExp(`className=\\{\`\s*${oldClass}\s*\`\\}`, 'g');
    if (pattern3.test(modifiedCode)) {
      modifiedCode = modifiedCode.replace(pattern3, `className="${tailwindClassString}"`);
      hasChanges = true;
      replacements++;
      logger.verbose(`Replaced className={\`${oldClass}\`} with "${tailwindClassString}"`);
    }
  });

  return { code: modifiedCode, hasChanges, replacements };
}
