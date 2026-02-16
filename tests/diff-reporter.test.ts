import { 
  computeUnifiedDiff, 
  formatDiff, 
  formatDiffHeader, 
  formatDiffHunk,
  getChangeStats,
  DiffResult
} from '../src/utils/diff';
import { Reporter, FileResult, SummaryStats } from '../src/utils/reporter';

describe('Diff Utility', () => {
  describe('computeUnifiedDiff', () => {
    it('should return no changes for identical content', () => {
      const content = 'line1\nline2\nline3';
      const diff = computeUnifiedDiff(content, content);
      
      expect(diff.hasChanges).toBe(false);
      expect(diff.hunks).toHaveLength(0);
    });

    it('should detect a single line addition', () => {
      const oldContent = 'line1\nline2';
      const newContent = 'line1\nline2\nline3';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
      expect(diff.hunks.length).toBeGreaterThan(0);
      
      const addedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'added'));
      expect(addedLines).toHaveLength(1);
      expect(addedLines[0].content).toBe('line3');
    });

    it('should detect a single line removal', () => {
      const oldContent = 'line1\nline2\nline3';
      const newContent = 'line1\nline2';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
      
      const removedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'removed'));
      expect(removedLines).toHaveLength(1);
      expect(removedLines[0].content).toBe('line3');
    });

    it('should detect a line modification', () => {
      const oldContent = 'line1\nold\nline3';
      const newContent = 'line1\nnew\nline3';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
      
      const removedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'removed'));
      const addedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'added'));
      
      expect(removedLines).toHaveLength(1);
      expect(removedLines[0].content).toBe('old');
      expect(addedLines).toHaveLength(1);
      expect(addedLines[0].content).toBe('new');
    });

    it('should handle multiple changes', () => {
      const oldContent = 'a\nb\nc\nd\ne';
      const newContent = 'a\nB\nc\nD\ne';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
      
      const removedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'removed'));
      const addedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'added'));
      
      expect(removedLines).toHaveLength(2);
      expect(addedLines).toHaveLength(2);
    });

    it('should handle empty files', () => {
      const diff1 = computeUnifiedDiff('', '');
      expect(diff1.hasChanges).toBe(false);
      
      const diff2 = computeUnifiedDiff('', 'new content');
      expect(diff2.hasChanges).toBe(true);
      
      const diff3 = computeUnifiedDiff('old content', '');
      expect(diff3.hasChanges).toBe(true);
    });

    it('should include context lines around changes', () => {
      const oldContent = 'line1\nline2\nline3\nline4\nline5\nline6\nline7';
      const newContent = 'line1\nline2\nline3\nMODIFIED\nline5\nline6\nline7';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
      expect(diff.hunks.length).toBeGreaterThan(0);
      
      const hunk = diff.hunks[0];
      const contextLines = hunk.lines.filter(l => l.type === 'context');
      expect(contextLines.length).toBeGreaterThan(0);
    });

    it('should handle large files efficiently', () => {
      const lines = Array.from({ length: 1000 }, (_, i) => `line${i}`);
      const oldContent = lines.join('\n');
      
      const newLines = [...lines];
      newLines[500] = 'MODIFIED_LINE';
      const newContent = newLines.join('\n');
      
      const startTime = Date.now();
      const diff = computeUnifiedDiff(oldContent, newContent);
      const duration = Date.now() - startTime;
      
      expect(diff.hasChanges).toBe(true);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('formatDiffHeader', () => {
    it('should format diff header correctly', () => {
      const header = formatDiffHeader('src/file.ts');
      expect(header).toBe('--- a/src/file.ts\n+++ b/src/file.ts');
    });
  });

  describe('formatDiffHunk', () => {
    it('should format hunk header with line numbers', () => {
      const hunk = {
        oldStart: 1,
        oldLines: 3,
        newStart: 1,
        newLines: 4,
        lines: [
          { type: 'context' as const, content: 'line1' },
          { type: 'removed' as const, content: 'line2' },
          { type: 'added' as const, content: 'newLine2' },
          { type: 'context' as const, content: 'line3' }
        ]
      };
      
      const formatted = formatDiffHunk(hunk);
      
      expect(formatted).toContain('@@ -1,3 +1,4 @@');
      expect(formatted).toContain(' line1');
      expect(formatted).toContain('-line2');
      expect(formatted).toContain('+newLine2');
      expect(formatted).toContain(' line3');
    });
  });

  describe('formatDiff', () => {
    it('should return empty string for no changes', () => {
      const diff: DiffResult = { hunks: [], hasChanges: false };
      const formatted = formatDiff('file.ts', diff);
      expect(formatted).toBe('');
    });

    it('should format complete diff output', () => {
      const oldContent = 'a\nb\nc';
      const newContent = 'a\nB\nc';
      const diff = computeUnifiedDiff(oldContent, newContent);
      const formatted = formatDiff('test.ts', diff);
      
      expect(formatted).toContain('--- a/test.ts');
      expect(formatted).toContain('+++ b/test.ts');
      expect(formatted).toContain('@@');
      expect(formatted).toContain('-b');
      expect(formatted).toContain('+B');
    });
  });

  describe('getChangeStats', () => {
    it('should count added and removed lines', () => {
      const oldContent = 'line1\nline2\nline3';
      const newContent = 'line1\nmodified\nline3\nline4';
      const diff = computeUnifiedDiff(oldContent, newContent);
      const stats = getChangeStats(diff);
      
      expect(stats.removed).toBe(1);
      expect(stats.added).toBe(2);
    });

    it('should return zeros for no changes', () => {
      const diff: DiffResult = { hunks: [], hasChanges: false };
      const stats = getChangeStats(diff);
      
      expect(stats.added).toBe(0);
      expect(stats.removed).toBe(0);
    });
  });
});

describe('Reporter', () => {
  const createMockReporter = (options: Partial<import('../src/utils/reporter').ReporterOptions> = {}) => {
    return new Reporter({
      showDiff: false,
      silent: true,
      verbose: false,
      dryRun: false,
      projectRoot: '/project',
      ...options
    });
  };

  describe('addFileResult', () => {
    it('should track modified files', () => {
      const reporter = createMockReporter();
      
      reporter.addFileResult({
        filePath: '/project/src/file.ts',
        originalContent: 'old',
        newContent: 'new',
        hasChanges: true,
        status: 'modified'
      });
      
      const stats = reporter.getStats();
      expect(stats.filesScanned).toBe(1);
      expect(stats.filesModified).toBe(1);
      expect(stats.filesUnchanged).toBe(0);
    });

    it('should track unchanged files', () => {
      const reporter = createMockReporter();
      
      reporter.addFileResult({
        filePath: '/project/src/file.ts',
        originalContent: 'same',
        newContent: 'same',
        hasChanges: false,
        status: 'unchanged'
      });
      
      const stats = reporter.getStats();
      expect(stats.filesScanned).toBe(1);
      expect(stats.filesModified).toBe(0);
      expect(stats.filesUnchanged).toBe(1);
    });

    it('should track files with errors', () => {
      const reporter = createMockReporter();
      
      reporter.addFileResult({
        filePath: '/project/src/file.ts',
        originalContent: '',
        newContent: '',
        hasChanges: false,
        status: 'error',
        error: 'Parse error'
      });
      
      const stats = reporter.getStats();
      expect(stats.filesScanned).toBe(1);
      expect(stats.filesWithError).toBe(1);
      expect(stats.errors).toBe(1);
    });

    it('should aggregate transformation stats', () => {
      const reporter = createMockReporter();
      
      reporter.addFileResult({
        filePath: '/project/src/file.ts',
        originalContent: 'old',
        newContent: 'new',
        hasChanges: true,
        status: 'modified',
        transformations: {
          utilitiesGenerated: 10,
          classesReplaced: 5,
          conflictsResolved: 2
        }
      });
      
      const stats = reporter.getStats();
      expect(stats.utilitiesGenerated).toBe(10);
      expect(stats.classesReplaced).toBe(5);
      expect(stats.conflictsResolved).toBe(2);
    });
  });

  describe('toJSON', () => {
    it('should produce valid JSON output', () => {
      const reporter = createMockReporter();
      
      reporter.addFileResult({
        filePath: '/project/src/file.ts',
        originalContent: 'old',
        newContent: 'new',
        hasChanges: true,
        status: 'modified'
      });
      
      const json = reporter.toJSON() as any;
      
      expect(json).toHaveProperty('success');
      expect(json).toHaveProperty('dryRun');
      expect(json).toHaveProperty('summary');
      expect(json).toHaveProperty('files');
      expect(Array.isArray(json.files)).toBe(true);
    });

    it('should include diff stats when showDiff is true', () => {
      const reporter = createMockReporter({ showDiff: true });
      
      reporter.addFileResult({
        filePath: '/project/src/file.ts',
        originalContent: 'line1\nline2',
        newContent: 'line1\nmodified',
        hasChanges: true,
        status: 'modified'
      });
      
      const json = reporter.toJSON() as any;
      const file = json.files[0];
      
      expect(file).toHaveProperty('diff');
      expect(file.diff).toHaveProperty('added');
      expect(file.diff).toHaveProperty('removed');
    });

    it('should report success=false when there are errors', () => {
      const reporter = createMockReporter();
      
      reporter.addFileResult({
        filePath: '/project/src/file.ts',
        originalContent: '',
        newContent: '',
        hasChanges: false,
        status: 'error',
        error: 'Parse error'
      });
      
      const json = reporter.toJSON() as any;
      expect(json.success).toBe(false);
    });

    it('should include error message when present', () => {
      const reporter = createMockReporter();
      
      reporter.addFileResult({
        filePath: '/project/src/file.ts',
        originalContent: '',
        newContent: '',
        hasChanges: false,
        status: 'error',
        error: 'Something went wrong'
      });
      
      const json = reporter.toJSON() as any;
      const file = json.files[0];
      
      expect(file.error).toBe('Something went wrong');
    });
  });

  describe('summary accuracy', () => {
    it('should accurately count multiple files', () => {
      const reporter = createMockReporter();
      
      reporter.addFileResult({ filePath: '/a.ts', originalContent: 'a', newContent: 'b', hasChanges: true, status: 'modified' });
      reporter.addFileResult({ filePath: '/b.ts', originalContent: 'a', newContent: 'a', hasChanges: false, status: 'unchanged' });
      reporter.addFileResult({ filePath: '/c.ts', originalContent: 'a', newContent: 'c', hasChanges: true, status: 'modified' });
      reporter.addFileResult({ filePath: '/d.ts', originalContent: 'a', newContent: 'a', hasChanges: false, status: 'unchanged' });
      reporter.addFileResult({ filePath: '/e.ts', originalContent: '', newContent: '', hasChanges: false, status: 'error', error: 'err' });
      
      reporter.addWarning(3);
      
      const stats = reporter.getStats();
      
      expect(stats.filesScanned).toBe(5);
      expect(stats.filesModified).toBe(2);
      expect(stats.filesUnchanged).toBe(2);
      expect(stats.filesWithError).toBe(1);
      expect(stats.warnings).toBe(3);
      expect(stats.errors).toBe(1);
    });
  });
});

describe('Integration: Diff + Reporter', () => {
  it('should correctly report diff stats for typical code changes', () => {
    const oldCode = `import React from 'react';

export const Button = ({ className }) => {
  return (
    <button className={className}>
      Click me
    </button>
  );
};`;

    const newCode = `import React from 'react';

export const Button = ({ className }) => {
  return (
    <button className={\`\${className} px-4 py-2 bg-blue-500\`}>
      Click me
    </button>
  );
};`;

    const diff = computeUnifiedDiff(oldCode, newCode);
    const stats = getChangeStats(diff);
    
    expect(diff.hasChanges).toBe(true);
    expect(stats.removed).toBe(1);
    expect(stats.added).toBe(1);
  });
});
