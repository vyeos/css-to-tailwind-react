import { Command } from 'commander';
import { scanProject } from './scanner';
import { transformFiles } from './transformer';
import { logger } from './utils/logger';
import { loadTailwindConfig } from './utils/config';
import path from 'path';

interface CLIOptions {
  dryRun?: boolean;
  verbose?: boolean;
  deleteCss?: boolean;
  skipExternal?: boolean;
  skipInline?: boolean;
  skipInternal?: boolean;
}

const program = new Command();

program
  .name('css-to-tailwind-react')
  .description('Convert traditional CSS into Tailwind CSS utility classes for React')
  .version('1.0.0')
  .argument('<directory>', 'Target directory to scan and transform')
  .option('--dry-run', 'Show changes without modifying files')
  .option('--verbose', 'Show detailed output')
  .option('--delete-css', 'Delete CSS files when all rules are converted')
  .option('--skip-external', 'Skip external CSS files (imports)')
  .option('--skip-inline', 'Skip inline styles')
  .option('--skip-internal', 'Skip internal <style> blocks')
  .action(async (directory: string, options: CLIOptions) => {
    const startTime = Date.now();
    
    try {
      // Set verbose mode for logger
      logger.setVerbose(options.verbose || false);
      
      logger.info('🚀 CSS to Tailwind React Converter');
      logger.info(`📁 Target directory: ${path.resolve(directory)}`);
      
      if (options.dryRun) {
        logger.info('🔍 Dry run mode - no files will be modified');
      }

      // Load Tailwind config
      logger.info('⚙️  Loading Tailwind configuration...');
      const tailwindConfig = await loadTailwindConfig(directory);
      
      // Scan project files
      logger.info('🔎 Scanning project files...');
      const files = await scanProject(directory);
      
      logger.success(`Found ${files.length} files to process`);
      
      if (files.length === 0) {
        logger.warn('No supported files found in the target directory');
        process.exit(0);
      }

      // Transform files
      const results = await transformFiles(files, {
        dryRun: options.dryRun || false,
        deleteCss: options.deleteCss || false,
        skipExternal: options.skipExternal || false,
        skipInline: options.skipInline || false,
        skipInternal: options.skipInternal || false,
        tailwindConfig,
        projectRoot: path.resolve(directory)
      });

      // Print summary
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n' + '='.repeat(50));
      logger.success('✨ Transformation Complete!');
      console.log('='.repeat(50));
      console.log(`📊 Summary:`);
      console.log(`   Files scanned:      ${results.filesScanned}`);
      console.log(`   Files modified:     ${results.filesModified}`);
      console.log(`   Styles converted:   ${results.stylesConverted}`);
      console.log(`   Classes replaced:   ${results.classesReplaced}`);
      console.log(`   Warnings:           ${results.warnings}`);
      console.log(`   Duration:           ${duration}s`);
      console.log('='.repeat(50));

      if (results.warnings > 0) {
        logger.warn('Some styles could not be converted. Run with --verbose for details.');
        process.exit(0);
      }

      process.exit(0);
    } catch (error) {
      logger.error('❌ Transformation failed:', error);
      process.exit(1);
    }
  });

program.parse();
