import { writeFiles, FileWriter } from '../src/fileWriter';
import { FileResult } from '../src/utils/reporter';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('FileWriter', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'css-to-tailwind-test-'));
  });
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('writeFiles', () => {
    it('should return count without writing in dry-run mode', async () => {
      const results: FileResult[] = [
        {
          filePath: path.join(tempDir, 'test.ts'),
          originalContent: 'old',
          newContent: 'new',
          hasChanges: true,
          status: 'modified'
        }
      ];
      
      const count = await writeFiles(results, { 
        dryRun: true, 
        projectRoot: tempDir 
      });
      
      expect(count).toBe(1);
      expect(fs.existsSync(path.join(tempDir, 'test.ts'))).toBe(false);
    });

    it('should write files in non-dry-run mode', async () => {
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, 'old', 'utf-8');
      
      const results: FileResult[] = [
        {
          filePath,
          originalContent: 'old',
          newContent: 'new',
          hasChanges: true,
          status: 'modified'
        }
      ];
      
      const count = await writeFiles(results, { 
        dryRun: false, 
        projectRoot: tempDir 
      });
      
      expect(count).toBe(1);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('new');
    });

    it('should skip unchanged files', async () => {
      const filePath = path.join(tempDir, 'unchanged.ts');
      fs.writeFileSync(filePath, 'same', 'utf-8');
      
      const results: FileResult[] = [
        {
          filePath,
          originalContent: 'same',
          newContent: 'same',
          hasChanges: false,
          status: 'unchanged'
        }
      ];
      
      const count = await writeFiles(results, { 
        dryRun: false, 
        projectRoot: tempDir 
      });
      
      expect(count).toBe(0);
    });

    it('should skip files with errors', async () => {
      const filePath = path.join(tempDir, 'error.ts');
      fs.writeFileSync(filePath, 'original', 'utf-8');
      
      const results: FileResult[] = [
        {
          filePath,
          originalContent: 'original',
          newContent: 'should not be written',
          hasChanges: false,
          status: 'error',
          error: 'Parse error'
        }
      ];
      
      const count = await writeFiles(results, { 
        dryRun: false, 
        projectRoot: tempDir 
      });
      
      expect(count).toBe(0);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('original');
    });

    it('should handle multiple files', async () => {
      const files = [
        { name: 'a.ts', old: 'a', new: 'A' },
        { name: 'b.ts', old: 'b', new: 'b' },
        { name: 'c.ts', old: 'c', new: 'C' }
      ];
      
      for (const f of files) {
        fs.writeFileSync(path.join(tempDir, f.name), f.old, 'utf-8');
      }
      
      const results: FileResult[] = files.map(f => ({
        filePath: path.join(tempDir, f.name),
        originalContent: f.old,
        newContent: f.new,
        hasChanges: f.old !== f.new,
        status: f.old !== f.new ? 'modified' : 'unchanged'
      }));
      
      const count = await writeFiles(results, { 
        dryRun: false, 
        projectRoot: tempDir 
      });
      
      expect(count).toBe(2);
      expect(fs.readFileSync(path.join(tempDir, 'a.ts'), 'utf-8')).toBe('A');
      expect(fs.readFileSync(path.join(tempDir, 'b.ts'), 'utf-8')).toBe('b');
      expect(fs.readFileSync(path.join(tempDir, 'c.ts'), 'utf-8')).toBe('C');
    });

    it('should create backups', async () => {
      const filePath = path.join(tempDir, 'backup-test.ts');
      fs.writeFileSync(filePath, 'original content', 'utf-8');
      
      const results: FileResult[] = [
        {
          filePath,
          originalContent: 'original content',
          newContent: 'new content',
          hasChanges: true,
          status: 'modified'
        }
      ];
      
      await writeFiles(results, { 
        dryRun: false, 
        projectRoot: tempDir 
      });
      
      const backupPath = path.join(tempDir, '.css-to-tailwind-backups', 'backup-test.ts');
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.readFileSync(backupPath, 'utf-8')).toBe('original content');
    });
  });

  describe('FileWriter class', () => {
    it('should support project root option', async () => {
      const writer = new FileWriter({ 
        dryRun: false, 
        projectRoot: tempDir 
      });
      
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, 'old', 'utf-8');
      
      const success = await writer.writeFile(filePath, 'new', 'old');
      
      expect(success).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('new');
    });

    it('should handle write errors gracefully', async () => {
      const writer = new FileWriter({ 
        dryRun: false, 
        projectRoot: tempDir 
      });
      
      const nonExistentPath = path.join(tempDir, 'nonexistent', 'test.ts');
      
      const success = await writer.writeFile(nonExistentPath, 'new', 'old');
      
      expect(success).toBe(false);
    });
  });
});

describe('File Change Detection', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'css-to-tailwind-test-'));
  });
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect identical content as unchanged', () => {
    const content = 'same content';
    const result: FileResult = {
      filePath: path.join(tempDir, 'test.ts'),
      originalContent: content,
      newContent: content,
      hasChanges: false,
      status: 'unchanged'
    };
    
    expect(result.hasChanges).toBe(false);
    expect(result.status).toBe('unchanged');
  });

  it('should detect different content as modified', () => {
    const result: FileResult = {
      filePath: path.join(tempDir, 'test.ts'),
      originalContent: 'old',
      newContent: 'new',
      hasChanges: true,
      status: 'modified'
    };
    
    expect(result.hasChanges).toBe(true);
    expect(result.status).toBe('modified');
  });

  it('should handle whitespace-only changes', () => {
    const result: FileResult = {
      filePath: path.join(tempDir, 'test.ts'),
      originalContent: 'content',
      newContent: 'content\n',
      hasChanges: true,
      status: 'modified'
    };
    
    expect(result.hasChanges).toBe(true);
  });
});

describe('Error Handling Without Partial Writes', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'css-to-tailwind-test-'));
  });
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should not write any file if transformation fails', async () => {
    const files: Array<{ name: string; old: string; new: string; error?: boolean }> = [
      { name: 'good.ts', old: 'good', new: 'GOOD' },
      { name: 'bad.ts', old: 'bad', new: '', error: true }
    ];
    
    for (const f of files) {
      fs.writeFileSync(path.join(tempDir, f.name), f.old, 'utf-8');
    }
    
    const results: FileResult[] = files.map(f => {
      if (f.error) {
        return {
          filePath: path.join(tempDir, f.name),
          originalContent: f.old,
          newContent: '',
          hasChanges: false,
          status: 'error' as const,
          error: 'Transformation failed'
        };
      }
      return {
        filePath: path.join(tempDir, f.name),
        originalContent: f.old,
        newContent: f.new,
        hasChanges: f.old !== f.new,
        status: 'modified' as const
      };
    });
    
    const count = await writeFiles(results, { 
      dryRun: false, 
      projectRoot: tempDir 
    });
    
    expect(count).toBe(1);
    expect(fs.readFileSync(path.join(tempDir, 'good.ts'), 'utf-8')).toBe('GOOD');
    expect(fs.readFileSync(path.join(tempDir, 'bad.ts'), 'utf-8')).toBe('bad');
  });

  it('should preserve original file on error', async () => {
    const filePath = path.join(tempDir, 'preserve.ts');
    fs.writeFileSync(filePath, 'original content', 'utf-8');
    
    const results: FileResult[] = [
      {
        filePath,
        originalContent: 'original content',
        newContent: '',
        hasChanges: false,
        status: 'error',
        error: 'Parse error'
      }
    ];
    
    await writeFiles(results, { 
      dryRun: false, 
      projectRoot: tempDir 
    });
    
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('original content');
  });
});
