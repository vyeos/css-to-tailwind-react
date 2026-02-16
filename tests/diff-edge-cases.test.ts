import { 
  computeUnifiedDiff, 
  formatDiff,
  computeAndFormatDiff 
} from '../src/utils/diff';

describe('Diff Algorithm Edge Cases', () => {
  describe('empty content handling', () => {
    it('should handle both empty strings', () => {
      const diff = computeUnifiedDiff('', '');
      expect(diff.hasChanges).toBe(false);
      expect(diff.hunks).toHaveLength(0);
    });

    it('should handle adding to empty file', () => {
      const diff = computeUnifiedDiff('', 'new content\nline 2');
      expect(diff.hasChanges).toBe(true);
      
      const addedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'added'));
      expect(addedLines.length).toBe(2);
    });

    it('should handle removing all content', () => {
      const diff = computeUnifiedDiff('old content\nline 2', '');
      expect(diff.hasChanges).toBe(true);
      
      const removedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'removed'));
      expect(removedLines.length).toBe(2);
    });
  });

  describe('line ending handling', () => {
    it('should handle files without trailing newline', () => {
      const diff = computeUnifiedDiff('line1\nline2', 'line1\nline2\nline3');
      expect(diff.hasChanges).toBe(true);
    });

    it('should handle files with trailing newline', () => {
      const diff = computeUnifiedDiff('line1\nline2\n', 'line1\nline2\nline3\n');
      expect(diff.hasChanges).toBe(true);
    });
  });

  describe('complex change patterns', () => {
    it('should handle adjacent changes', () => {
      const oldContent = 'a\nb\nc\nd';
      const newContent = 'A\nB\nc\nd';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      const removedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'removed'));
      const addedLines = diff.hunks.flatMap(h => h.lines.filter(l => l.type === 'added'));
      
      expect(removedLines.length).toBe(2);
      expect(addedLines.length).toBe(2);
    });

    it('should handle changes at beginning of file', () => {
      const oldContent = 'first\nsecond\nthird';
      const newContent = 'FIRST\nsecond\nthird';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
      expect(diff.hunks[0].oldStart).toBe(1);
    });

    it('should handle changes at end of file', () => {
      const oldContent = 'first\nsecond\nlast';
      const newContent = 'first\nsecond\nLAST';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
    });

    it('should handle interleaved additions and removals', () => {
      const oldContent = 'keep1\nremove1\nkeep2\nremove2\nkeep3';
      const newContent = 'keep1\nadd1\nkeep2\nadd2\nkeep3';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
    });
  });

  describe('hunk merging', () => {
    it('should merge nearby changes into single hunk', () => {
      const lines = Array.from({ length: 10 }, (_, i) => `line${i + 1}`);
      const oldContent = lines.join('\n');
      
      const newLines = [...lines];
      newLines[2] = 'CHANGED3';
      newLines[4] = 'CHANGED5';
      const newContent = newLines.join('\n');
      
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hunks.length).toBeLessThanOrEqual(2);
    });

    it('should separate distant changes into separate hunks', () => {
      const lines = Array.from({ length: 50 }, (_, i) => `line${i + 1}`);
      const oldContent = lines.join('\n');
      
      const newLines = [...lines];
      newLines[2] = 'CHANGED_EARLY';
      newLines[45] = 'CHANGED_LATE';
      const newContent = newLines.join('\n');
      
      const diff = computeUnifiedDiff(oldContent, newContent, 3);
      
      expect(diff.hunks.length).toBe(2);
    });
  });

  describe('performance with large files', () => {
    it('should handle 1000 line file efficiently', () => {
      const lines = Array.from({ length: 1000 }, (_, i) => `line ${i}`);
      const oldContent = lines.join('\n');
      
      const newLines = [...lines];
      newLines[500] = 'MODIFIED';
      const newContent = newLines.join('\n');
      
      const start = performance.now();
      const diff = computeUnifiedDiff(oldContent, newContent);
      const duration = performance.now() - start;
      
      expect(diff.hasChanges).toBe(true);
      expect(duration).toBeLessThan(500);
    });

    it('should handle many small changes efficiently', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
      const oldContent = lines.join('\n');
      
      const newLines = lines.map((l, i) => i % 10 === 0 ? `MODIFIED ${i}` : l);
      const newContent = newLines.join('\n');
      
      const start = performance.now();
      const diff = computeUnifiedDiff(oldContent, newContent);
      const duration = performance.now() - start;
      
      expect(diff.hasChanges).toBe(true);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('special characters', () => {
    it('should handle lines with special regex characters', () => {
      const oldContent = 'function test() { return /regex/g; }';
      const newContent = 'function test() { return /newregex/g; }';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
    });

    it('should handle unicode content', () => {
      const oldContent = 'Hello 世界\n你好世界';
      const newContent = 'Hello 世界\n你好世界！';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
    });

    it('should handle tabs and special whitespace', () => {
      const oldContent = '\tindented\n  spaces';
      const newContent = '\ttabbed\n  spaces';
      const diff = computeUnifiedDiff(oldContent, newContent);
      
      expect(diff.hasChanges).toBe(true);
    });
  });
});

describe('formatDiff output', () => {
  it('should produce git-style diff format', () => {
    const oldContent = 'line1\nline2\nline3';
    const newContent = 'line1\nmodified\nline3';
    const formatted = computeAndFormatDiff(oldContent, newContent, 'test.ts');
    
    expect(formatted).toContain('--- a/test.ts');
    expect(formatted).toContain('+++ b/test.ts');
    expect(formatted).toContain('@@');
  });

  it('should handle file paths with directories', () => {
    const oldContent = 'a';
    const newContent = 'b';
    const formatted = computeAndFormatDiff(oldContent, newContent, 'src/components/Button.tsx');
    
    expect(formatted).toContain('--- a/src/components/Button.tsx');
    expect(formatted).toContain('+++ b/src/components/Button.tsx');
  });

  it('should prefix lines correctly', () => {
    const oldContent = 'removed';
    const newContent = 'added';
    const diff = computeUnifiedDiff(oldContent, newContent);
    const formatted = formatDiff('test.ts', diff);
    
    const lines = formatted.split('\n');
    const removedLine = lines.find(l => l.startsWith('-') && !l.startsWith('---'));
    const addedLine = lines.find(l => l.startsWith('+') && !l.startsWith('+++'));
    
    expect(removedLine).toBeDefined();
    expect(addedLine).toBeDefined();
  });
});

describe('determinism', () => {
  it('should produce identical output for identical inputs', () => {
    const oldContent = 'a\nb\nc\nd\ne';
    const newContent = 'a\nB\nc\nD\ne';
    
    const diff1 = computeUnifiedDiff(oldContent, newContent);
    const diff2 = computeUnifiedDiff(oldContent, newContent);
    
    expect(diff1.hunks).toEqual(diff2.hunks);
  });

  it('should produce consistent hunk boundaries', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line${i}`);
    const oldContent = lines.join('\n');
    const newLines = [...lines];
    newLines[50] = 'CHANGED';
    const newContent = newLines.join('\n');
    
    const diff1 = computeUnifiedDiff(oldContent, newContent);
    const diff2 = computeUnifiedDiff(oldContent, newContent);
    
    expect(diff1.hunks[0].oldStart).toBe(diff2.hunks[0].oldStart);
    expect(diff1.hunks[0].newStart).toBe(diff2.hunks[0].newStart);
  });
});
