import { Command } from 'commander';
import { scanProject } from './scanner';
import { transformFilesDetailed } from './transformer';
import { writeFiles } from './fileWriter';
import { logger } from './utils/logger';
import { loadTailwindConfig } from './utils/config';
import { Reporter } from './utils/reporter';
import { 
  resolveConfig, 
  logConfigInfo, 
  CLIConfigOverrides,
  Config,
  ConfigValidationError
} from './utils/projectConfig';
import path from 'path';

interface CLIOptions {
  dryRun?: boolean;
  preview?: boolean;
  diff?: boolean;
  silent?: boolean;
  jsonReport?: boolean;
  verbose?: boolean;
  deleteCss?: boolean;
  skipExternal?: boolean;
  skipInline?: boolean;
  skipInternal?: boolean;
  strictMode?: boolean;
  preserveOriginalCSS?: boolean;
  disableArbitraryValues?: boolean;
  include?: string;
  exclude?: string;
  ignoreSelectors?: string;
  ignoreProperties?: string;
  config?: string;
}

const program = new Command();

program
  .name('css-to-tailwind-react')
  .description('Convert traditional CSS into Tailwind CSS utility classes for React')
  .version('1.0.0')
  .argument('<directory>', 'Target directory to scan and transform')
  .option('--dry-run, --preview', 'Show changes without modifying files')
  .option('--diff', 'Print unified diff for each modified file')
  .option('--silent', 'Suppress per-file logs, show only summary')
  .option('--json-report', 'Output structured JSON summary')
  .option('--verbose', 'Show detailed output including resolved config')
  .option('--delete-css', 'Delete CSS files when all rules are converted')
  .option('--skip-external', 'Skip external CSS files (imports)')
  .option('--skip-inline', 'Skip inline styles')
  .option('--skip-internal', 'Skip internal <style> blocks')
  .option('--strict-mode', 'Skip unsupported conversions instead of generating arbitrary values')
  .option('--preserve-original-css', 'Keep original CSS rules after conversion')
  .option('--disable-arbitrary-values', 'Skip properties that cannot map exactly to Tailwind scale')
  .option('--include <patterns>', 'Comma-separated glob patterns to include (overrides config)')
  .option('--exclude <patterns>', 'Comma-separated glob patterns to exclude (overrides config)')
  .option('--ignore-selectors <selectors>', 'Comma-separated selectors to skip')
  .option('--ignore-properties <properties>', 'Comma-separated CSS properties to skip')
  .option('--config <path>', 'Path to config file (auto-detected if not specified)')
  .addHelpText('after', `
Configuration:
  The tool automatically looks for a config file in this order:
  1. css-to-tailwind.config.ts
  2. css-to-tailwind.config.js
  3. css-to-tailwind.config.mjs
  4. css-to-tailwind.config.cjs
  5. css-to-tailwind.config.json

Config File Example (css-to-tailwind.config.ts):
  export default {
    include: ['**/*.{js,jsx,ts,tsx}', '**/*.css'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    strictMode: false,
    preserveOriginalCSS: false,
    disableArbitraryValues: false,
    customSpacingScale: {
      '18px': '4.5',
      '22px': '5.5'
    },
    ignoreSelectors: ['.no-convert', '.legacy'],
    ignoreProperties: ['animation', 'transition'],
    logLevel: 'info',
    outputMode: 'write'
  };

Examples:
  $ css-to-tailwind-react ./src
  $ css-to-tailwind-react ./src --dry-run --diff
  $ css-to-tailwind-react ./src --strict-mode --disable-arbitrary-values
  $ css-to-tailwind-react ./src --include "**/*.tsx" --exclude "**/*.test.tsx"
`)
  .action(async (directory: string, options: CLIOptions) => {
    const startTime = Date.now();
    
    try {
      const projectRoot = path.resolve(directory);
      
      const cliOverrides: CLIConfigOverrides = {
        dryRun: options.dryRun || options.preview,
        silent: options.silent || options.jsonReport,
        verbose: options.verbose,
        deleteCss: options.deleteCss,
        skipExternal: options.skipExternal,
        skipInline: options.skipInline,
        skipInternal: options.skipInternal,
        strictMode: options.strictMode,
        preserveOriginalCSS: options.preserveOriginalCSS,
        disableArbitraryValues: options.disableArbitraryValues,
        include: options.include ? options.include.split(',').map(s => s.trim()) : undefined,
        exclude: options.exclude ? options.exclude.split(',').map(s => s.trim()) : undefined,
        ignoreSelectors: options.ignoreSelectors ? options.ignoreSelectors.split(',').map(s => s.trim()) : undefined,
        ignoreProperties: options.ignoreProperties ? options.ignoreProperties.split(',').map(s => s.trim()) : undefined
      };

      let resolvedConfig: Config;
      let configPath: string | null;

      try {
        const configResult = await resolveConfig(projectRoot, cliOverrides);
        resolvedConfig = configResult.config;
        configPath = configResult.configPath;
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          console.error(`\nConfiguration Error:\n${error.errors.map(e => `  - ${e}`).join('\n')}`);
          process.exit(1);
        }
        throw error;
      }

      logger.setLogLevel(resolvedConfig.logLevel);
      
      if (options.verbose) {
        logger.setVerbose(true);
      }
      if (resolvedConfig.logLevel === 'silent' || options.silent || options.jsonReport) {
        logger.setSilent(true);
      }

      const isDryRun = resolvedConfig.outputMode === 'dry-run';
      const showDiff = options.diff || false;
      const isSilent = resolvedConfig.logLevel === 'silent' || options.jsonReport || false;
      const isJsonReport = options.jsonReport || false;

      logger.info('🚀 CSS to Tailwind React Converter');
      logger.info(`📁 Target directory: ${projectRoot}`);
      
      logConfigInfo(resolvedConfig, configPath, options.verbose || false);
      
      if (isDryRun) {
        logger.info('🔍 Dry run mode - no files will be modified');
      }
      
      if (showDiff) {
        logger.info('📋 Diff mode enabled - showing changes');
      }

      if (resolvedConfig.strictMode) {
        logger.info('⚙️  Strict mode enabled - skipping unsupported conversions');
      }

      if (resolvedConfig.disableArbitraryValues) {
        logger.info('⚙️  Arbitrary values disabled - only exact scale matches will convert');
      }

      if (resolvedConfig.preserveOriginalCSS) {
        logger.info('⚙️  Preserving original CSS rules');
      }

      if (resolvedConfig.ignoreSelectors.length > 0) {
        logger.verbose(`Ignoring selectors: ${resolvedConfig.ignoreSelectors.join(', ')}`);
      }

      if (resolvedConfig.ignoreProperties.length > 0) {
        logger.verbose(`Ignoring properties: ${resolvedConfig.ignoreProperties.join(', ')}`);
      }

      logger.info('⚙️  Loading Tailwind configuration...');
      const tailwindConfig = await loadTailwindConfig(projectRoot);
      
      logger.info('🔎 Scanning project files...');
      const files = await scanProject(directory, { config: resolvedConfig });
      
      logger.success(`Found ${files.length} files to process`);
      
      if (files.length === 0) {
        logger.warn('No supported files found in the target directory');
        process.exit(0);
      }

      const { fileResults, stats } = await transformFilesDetailed(files, {
        dryRun: isDryRun,
        deleteCss: resolvedConfig.deleteCss ?? false,
        skipExternal: resolvedConfig.skipExternal ?? false,
        skipInline: resolvedConfig.skipInline ?? false,
        skipInternal: resolvedConfig.skipInternal ?? false,
        tailwindConfig,
        projectRoot,
        config: resolvedConfig,
        strictMode: resolvedConfig.strictMode,
        preserveOriginalCSS: resolvedConfig.preserveOriginalCSS,
        disableArbitraryValues: resolvedConfig.disableArbitraryValues,
        ignoreSelectors: resolvedConfig.ignoreSelectors,
        ignoreProperties: resolvedConfig.ignoreProperties
      });

      const reporter = new Reporter({
        showDiff,
        silent: isSilent,
        verbose: options.verbose || false,
        dryRun: isDryRun,
        projectRoot
      });

      for (const result of fileResults) {
        reporter.addFileResult(result);
      }
      reporter.addWarning(stats.warnings);

      if (!isDryRun) {
        logger.info('\n💾 Writing changes...');
        const writtenCount = await writeFiles(fileResults, {
          dryRun: false,
          projectRoot
        });
        
        if (resolvedConfig.deleteCss) {
          for (const result of fileResults) {
            if (result.hasChanges && result.filePath.endsWith('.css')) {
              const cssContent = result.newContent.trim();
              if (cssContent === '' || cssContent === '/* All CSS converted to Tailwind */') {
                const fs = await import('fs');
                const backupDir = path.join(projectRoot, '.css-to-tailwind-backups');
                const relativePath = path.relative(projectRoot, result.filePath);
                const backupPath = path.join(backupDir, relativePath);
                
                if (!fs.existsSync(backupDir)) {
                  fs.mkdirSync(backupDir, { recursive: true });
                }
                const backupDirPath = path.dirname(backupPath);
                if (!fs.existsSync(backupDirPath)) {
                  fs.mkdirSync(backupDirPath, { recursive: true });
                }
                fs.writeFileSync(backupPath, result.originalContent, 'utf-8');
                
                fs.unlinkSync(result.filePath);
                logger.info(`🗑️  Deleted ${path.basename(result.filePath)} (all rules converted)`);
              }
            }
          }
        }
        
        logger.success(`Wrote ${writtenCount} files`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (isJsonReport) {
        const jsonOutput = reporter.toJSON();
        const output = {
          ...jsonOutput,
          config: {
            logLevel: resolvedConfig.logLevel,
            strictMode: resolvedConfig.strictMode,
            disableArbitraryValues: resolvedConfig.disableArbitraryValues,
            preserveOriginalCSS: resolvedConfig.preserveOriginalCSS,
            configPath: configPath ? path.basename(configPath) : null
          },
          duration: `${duration}s`
        };
        console.log(JSON.stringify(output, null, 2));
      } else {
        reporter.print();
        console.log(`\n⏱️  Duration: ${duration}s`);
      }

      if (stats.errors > 0) {
        process.exit(1);
      }

      process.exit(0);
    } catch (error) {
      logger.error('❌ Transformation failed:', error);
      process.exit(1);
    }
  });

program.parse();