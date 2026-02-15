import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { logger } from './utils/logger';

export interface FileWriteOptions {
  dryRun: boolean;
  backup?: boolean;
}

export class FileWriter {
  private dryRun: boolean;
  private backupDir: string;

  constructor(options: FileWriteOptions) {
    this.dryRun = options.dryRun;
    this.backupDir = path.join(process.cwd(), '.css-to-tailwind-backups');
  }

  async writeFile(filePath: string, content: string, originalContent: string): Promise<boolean> {
    if (this.dryRun) {
      this.showDiff(filePath, originalContent, content);
      return true;
    }

    try {
      // Create backup
      await this.createBackup(filePath, originalContent);

      // Write file
      fs.writeFileSync(filePath, content, 'utf-8');
      logger.success(`✏️  Modified: ${path.relative(process.cwd(), filePath)}`);
      return true;
    } catch (error) {
      logger.error(`Failed to write ${filePath}:`, error);
      return false;
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    if (this.dryRun) {
      logger.info(`🗑️  Would delete: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    try {
      // Create backup before deletion
      const content = fs.readFileSync(filePath, 'utf-8');
      await this.createBackup(filePath, content);

      fs.unlinkSync(filePath);
      logger.success(`🗑️  Deleted: ${path.relative(process.cwd(), filePath)}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete ${filePath}:`, error);
      return false;
    }
  }

  private async createBackup(filePath: string, content: string): Promise<void> {
    try {
      // Create backup directory if it doesn't exist
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      const relativePath = path.relative(process.cwd(), filePath);
      const backupPath = path.join(this.backupDir, relativePath);
      const backupDir = path.dirname(backupPath);

      // Create subdirectory structure
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Write backup
      fs.writeFileSync(backupPath, content, 'utf-8');
      logger.verbose(`Created backup: ${backupPath}`);
    } catch (error) {
      logger.warn(`Failed to create backup for ${filePath}:`, error);
    }
  }

  private showDiff(filePath: string, original: string, modified: string): void {
    const relativePath = path.relative(process.cwd(), filePath);
    logger.info(`\n📄 ${relativePath} (dry-run)`);
    
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    // Simple diff - show first few changed lines
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    let changes = 0;

    for (let i = 0; i < maxLines && changes < 10; i++) {
      const orig = originalLines[i] || '';
      const mod = modifiedLines[i] || '';

      if (orig !== mod) {
        changes++;
        console.log(chalk.red(`  - ${orig}`));
        console.log(chalk.green(`  + ${mod}`));
      }
    }

    if (changes === 0) {
      logger.verbose('  (no visible changes)');
    }
  }

  static restoreBackups(): void {
    const backupDir = path.join(process.cwd(), '.css-to-tailwind-backups');
    
    if (!fs.existsSync(backupDir)) {
      logger.warn('No backups found to restore');
      return;
    }

    logger.info('🔄 Restoring files from backup...');
    
    // Recursively restore files
    const restoreRecursive = (dir: string) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          restoreRecursive(fullPath);
        } else {
          const relativePath = path.relative(backupDir, fullPath);
          const originalPath = path.join(process.cwd(), relativePath);
          
          try {
            fs.copyFileSync(fullPath, originalPath);
            logger.success(`Restored: ${relativePath}`);
          } catch (error) {
            logger.error(`Failed to restore ${relativePath}:`, error);
          }
        }
      }
    };

    restoreRecursive(backupDir);
    logger.success('✅ Restore complete');
  }
}
