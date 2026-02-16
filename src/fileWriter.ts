import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger';
import { FileResult } from './utils/reporter';

export interface FileWriteOptions {
  dryRun: boolean;
  backup?: boolean;
}

export class FileWriter {
  private dryRun: boolean;
  private backupDir: string;
  private projectRoot: string;

  constructor(options: FileWriteOptions & { projectRoot?: string }) {
    this.dryRun = options.dryRun;
    this.projectRoot = options.projectRoot || process.cwd();
    this.backupDir = path.join(this.projectRoot, '.css-to-tailwind-backups');
  }

  async writeFile(filePath: string, content: string, originalContent: string): Promise<boolean> {
    if (this.dryRun) {
      return true;
    }

    try {
      await this.createBackup(filePath, originalContent);
      fs.writeFileSync(filePath, content, 'utf-8');
      logger.success(`✏️  Modified: ${path.relative(this.projectRoot, filePath)}`);
      return true;
    } catch (error) {
      logger.error(`Failed to write ${filePath}:`, error);
      return false;
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    if (this.dryRun) {
      logger.info(`🗑️  Would delete: ${path.relative(this.projectRoot, filePath)}`);
      return true;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      await this.createBackup(filePath, content);
      fs.unlinkSync(filePath);
      logger.success(`🗑️  Deleted: ${path.relative(this.projectRoot, filePath)}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete ${filePath}:`, error);
      return false;
    }
  }

  async writeResults(results: FileResult[]): Promise<number> {
    let written = 0;
    
    for (const result of results) {
      if (result.status === 'error') continue;
      if (!result.hasChanges) continue;
      
      const success = await this.writeFile(
        result.filePath,
        result.newContent,
        result.originalContent
      );
      
      if (success) written++;
    }
    
    return written;
  }

  private async createBackup(filePath: string, content: string): Promise<void> {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      const relativePath = path.relative(this.projectRoot, filePath);
      const backupPath = path.join(this.backupDir, relativePath);
      const backupDir = path.dirname(backupPath);

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      fs.writeFileSync(backupPath, content, 'utf-8');
      logger.verbose(`Created backup: ${backupPath}`);
    } catch (error) {
      logger.warn(`Failed to create backup for ${filePath}:`, error);
    }
  }

  static restoreBackups(projectRoot: string = process.cwd()): void {
    const backupDir = path.join(projectRoot, '.css-to-tailwind-backups');
    
    if (!fs.existsSync(backupDir)) {
      logger.warn('No backups found to restore');
      return;
    }

    logger.info('🔄 Restoring files from backup...');
    
    const restoreRecursive = (dir: string) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          restoreRecursive(fullPath);
        } else {
          const relativePath = path.relative(backupDir, fullPath);
          const originalPath = path.join(projectRoot, relativePath);
          
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

export async function writeFiles(
  results: FileResult[],
  options: { dryRun: boolean; projectRoot: string }
): Promise<number> {
  if (options.dryRun) {
    return results.filter(r => r.hasChanges && r.status !== 'error').length;
  }
  
  const writer = new FileWriter({ 
    dryRun: false, 
    projectRoot: options.projectRoot 
  });
  
  return writer.writeResults(results);
}
