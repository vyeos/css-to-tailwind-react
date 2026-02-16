import chalk from 'chalk';
import { logger } from './logger';
import { computeUnifiedDiff, formatDiff, DiffResult, getChangeStats } from './diff';
import path from 'path';

export interface FileResult {
  filePath: string;
  originalContent: string;
  newContent: string;
  hasChanges: boolean;
  status: 'modified' | 'unchanged' | 'error';
  error?: string;
  transformations?: {
    utilitiesGenerated: number;
    classesReplaced: number;
    conflictsResolved: number;
  };
}

export interface SummaryStats {
  filesScanned: number;
  filesModified: number;
  filesUnchanged: number;
  filesWithError: number;
  utilitiesGenerated: number;
  classesReplaced: number;
  conflictsResolved: number;
  unsupportedSelectors: number;
  errors: number;
  warnings: number;
}

export interface ReporterOptions {
  showDiff: boolean;
  silent: boolean;
  verbose: boolean;
  dryRun: boolean;
  projectRoot: string;
}

export class Reporter {
  private options: ReporterOptions;
  private fileResults: FileResult[] = [];
  private stats: SummaryStats = {
    filesScanned: 0,
    filesModified: 0,
    filesUnchanged: 0,
    filesWithError: 0,
    utilitiesGenerated: 0,
    classesReplaced: 0,
    conflictsResolved: 0,
    unsupportedSelectors: 0,
    errors: 0,
    warnings: 0
  };

  constructor(options: ReporterOptions) {
    this.options = options;
    logger.setVerbose(options.verbose);
    logger.setSilent(options.silent);
  }

  addFileResult(result: FileResult): void {
    this.fileResults.push(result);
    this.stats.filesScanned++;
    
    switch (result.status) {
      case 'modified':
        this.stats.filesModified++;
        break;
      case 'unchanged':
        this.stats.filesUnchanged++;
        break;
      case 'error':
        this.stats.filesWithError++;
        this.stats.errors++;
        break;
    }
    
    if (result.transformations) {
      this.stats.utilitiesGenerated += result.transformations.utilitiesGenerated;
      this.stats.classesReplaced += result.transformations.classesReplaced;
      this.stats.conflictsResolved += result.transformations.conflictsResolved;
    }
  }

  addWarning(count: number = 1): void {
    this.stats.warnings += count;
  }

  addUnsupportedSelector(count: number = 1): void {
    this.stats.unsupportedSelectors += count;
  }

  recordError(): void {
    this.stats.errors++;
  }

  getStats(): SummaryStats {
    return { ...this.stats };
  }

  getFileResults(): FileResult[] {
    return [...this.fileResults];
  }

  printDiff(result: FileResult): void {
    if (!result.hasChanges || !this.options.showDiff) {
      return;
    }
    
    const relativePath = path.relative(this.options.projectRoot, result.filePath);
    const diff = computeUnifiedDiff(result.originalContent, result.newContent);
    const formattedDiff = formatDiff(relativePath, diff);
    
    if (formattedDiff) {
      console.log('\n' + chalk.cyan(`diff --git a/${relativePath} b/${relativePath}`));
      const lines = formattedDiff.split('\n');
      for (const line of lines) {
        if (line.startsWith('---') || line.startsWith('+++')) {
          console.log(chalk.bold(line));
        } else if (line.startsWith('@@')) {
          console.log(chalk.cyan(line));
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          console.log(chalk.green(line));
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          console.log(chalk.red(line));
        } else {
          console.log(chalk.gray(line));
        }
      }
    }
  }

  printFileStatus(result: FileResult): void {
    if (this.options.silent) {
      return;
    }
    
    const relativePath = path.relative(this.options.projectRoot, result.filePath);
    
    if (result.status === 'error') {
      logger.error(`Failed: ${relativePath}`, result.error);
      return;
    }
    
    if (!result.hasChanges) {
      if (this.options.verbose) {
        logger.verbose(`No changes: ${relativePath}`);
      }
      return;
    }
    
    if (this.options.dryRun) {
      if (this.options.showDiff) {
        console.log(chalk.blue(`\n📄 ${relativePath}`) + chalk.yellow(' (dry-run)'));
      } else {
        logger.info(`Would modify: ${relativePath}`);
      }
    } else {
      logger.success(`Modified: ${relativePath}`);
    }
    
    if (this.options.showDiff) {
      this.printDiff(result);
    }
  }

  printSummary(): void {
    if (this.options.silent) {
      return;
    }
    
    const stats = this.stats;
    
    console.log('\n' + '='.repeat(50));
    if (this.options.dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN - No files were modified'));
    } else {
      logger.success('Transformation Complete!');
    }
    console.log('='.repeat(50));
    
    console.log('\n📊 Summary:');
    console.log(`   Files scanned:       ${stats.filesScanned}`);
    console.log(`   Files modified:      ${chalk.green(stats.filesModified)}`);
    console.log(`   Files unchanged:     ${chalk.gray(stats.filesUnchanged)}`);
    if (stats.filesWithError > 0) {
      console.log(`   Files with errors:   ${chalk.red(stats.filesWithError)}`);
    }
    console.log(`   Utilities generated: ${stats.utilitiesGenerated}`);
    console.log(`   Classes replaced:    ${stats.classesReplaced}`);
    console.log(`   Conflicts resolved:  ${stats.conflictsResolved}`);
    if (stats.unsupportedSelectors > 0) {
      console.log(`   Unsupported selectors: ${chalk.yellow(stats.unsupportedSelectors)}`);
    }
    if (stats.warnings > 0) {
      console.log(`   Warnings:            ${chalk.yellow(stats.warnings)}`);
    }
    if (stats.errors > 0) {
      console.log(`   Errors:              ${chalk.red(stats.errors)}`);
    }
    
    console.log('='.repeat(50));
  }

  toJSON(): object {
    return {
      success: this.stats.errors === 0,
      dryRun: this.options.dryRun,
      summary: {
        filesScanned: this.stats.filesScanned,
        filesModified: this.stats.filesModified,
        filesUnchanged: this.stats.filesUnchanged,
        filesWithError: this.stats.filesWithError,
        utilitiesGenerated: this.stats.utilitiesGenerated,
        classesReplaced: this.stats.classesReplaced,
        conflictsResolved: this.stats.conflictsResolved,
        unsupportedSelectors: this.stats.unsupportedSelectors,
        warnings: this.stats.warnings,
        errors: this.stats.errors
      },
      files: this.fileResults.map(result => {
        const relativePath = path.relative(this.options.projectRoot, result.filePath);
        const output: Record<string, unknown> = {
          path: relativePath,
          status: result.status,
          hasChanges: result.hasChanges
        };
        
        if (result.hasChanges && this.options.showDiff) {
          const diff = computeUnifiedDiff(result.originalContent, result.newContent);
          const stats = getChangeStats(diff);
          output.diff = {
            added: stats.added,
            removed: stats.removed
          };
        }
        
        if (result.error) {
          output.error = result.error;
        }
        
        if (result.transformations) {
          output.transformations = result.transformations;
        }
        
        return output;
      })
    };
  }

  printJSON(): void {
    console.log(JSON.stringify(this.toJSON(), null, 2));
  }

  print(): void {
    if (this.options.silent) {
      this.printSummary();
      return;
    }
    
    for (const result of this.fileResults) {
      this.printFileStatus(result);
    }
    
    this.printSummary();
  }
}
