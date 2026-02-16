import { Command } from 'commander';
import { scanProject } from './scanner';
import { transformFilesDetailed } from './transformer';
import { writeFiles } from './fileWriter';
import { logger } from './utils/logger';
import { loadTailwindConfig } from './utils/config';
import { Reporter } from './utils/reporter';
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
  .option('--verbose', 'Show detailed output')
  .option('--delete-css', 'Delete CSS files when all rules are converted')
  .option('--skip-external', 'Skip external CSS files (imports)')
  .option('--skip-inline', 'Skip inline styles')
  .option('--skip-internal', 'Skip internal <style> blocks')
  .action(async (directory: string, options: CLIOptions) => {
    const startTime = Date.now();
    
    const isDryRun = options.dryRun || options.preview || false;
    const showDiff = options.diff || false;
    const isSilent = options.silent || options.jsonReport || false;
    const isJsonReport = options.jsonReport || false;
    
    try {
      logger.setVerbose(options.verbose || false);
      logger.setSilent(isSilent);
      
      logger.info('🚀 CSS to Tailwind React Converter');
      logger.info(`📁 Target directory: ${path.resolve(directory)}`);
      
      if (isDryRun) {
        logger.info('🔍 Dry run mode - no files will be modified');
      }
      
      if (showDiff) {
        logger.info('📋 Diff mode enabled - showing changes');
      }

      logger.info('⚙️  Loading Tailwind configuration...');
      const tailwindConfig = await loadTailwindConfig(directory);
      
      logger.info('🔎 Scanning project files...');
      const files = await scanProject(directory);
      
      logger.success(`Found ${files.length} files to process`);
      
      if (files.length === 0) {
        logger.warn('No supported files found in the target directory');
        process.exit(0);
      }

      const { fileResults, stats } = await transformFilesDetailed(files, {
        dryRun: isDryRun,
        deleteCss: options.deleteCss || false,
        skipExternal: options.skipExternal || false,
        skipInline: options.skipInline || false,
        skipInternal: options.skipInternal || false,
        tailwindConfig,
        projectRoot: path.resolve(directory)
      });

      const reporter = new Reporter({
        showDiff,
        silent: isSilent,
        verbose: options.verbose || false,
        dryRun: isDryRun,
        projectRoot: path.resolve(directory)
      });

      for (const result of fileResults) {
        reporter.addFileResult(result);
      }
      reporter.addWarning(stats.warnings);

      if (!isDryRun) {
        logger.info('\n💾 Writing changes...');
        const writtenCount = await writeFiles(fileResults, {
          dryRun: false,
          projectRoot: path.resolve(directory)
        });
        
        if (options.deleteCss) {
          for (const result of fileResults) {
            if (result.hasChanges && result.filePath.endsWith('.css')) {
              const cssContent = result.newContent.trim();
              if (cssContent === '' || cssContent === '/* All CSS converted to Tailwind */') {
                const fs = await import('fs');
                const backupDir = path.join(path.resolve(directory), '.css-to-tailwind-backups');
                const relativePath = path.relative(path.resolve(directory), result.filePath);
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
