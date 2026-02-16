export interface DiffLine {
  type: 'context' | 'added' | 'removed';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffResult {
  hunks: DiffHunk[];
  hasChanges: boolean;
}

function diffLines(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = [];
  
  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    for (let j = 0; j <= n; j++) {
      if (i === 0) {
        dp[i][j] = j;
      } else if (j === 0) {
        dp[i][j] = i;
      } else if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp;
}

function backtrackEditScript(
  dp: number[][],
  oldLines: string[],
  newLines: string[],
  i: number,
  j: number
): Array<{ type: 'context' | 'added' | 'removed'; oldIndex: number; newIndex: number }> {
  const script: Array<{ type: 'context' | 'added' | 'removed'; oldIndex: number; newIndex: number }> = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      script.unshift({ type: 'context', oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      script.unshift({ type: 'added', oldIndex: -1, newIndex: j - 1 });
      j--;
    } else if (i > 0) {
      script.unshift({ type: 'removed', oldIndex: i - 1, newIndex: -1 });
      i--;
    }
  }
  
  return script;
}

const DEFAULT_CONTEXT_LINES = 3;

export function computeUnifiedDiff(
  oldContent: string,
  newContent: string,
  contextLines: number = DEFAULT_CONTEXT_LINES
): DiffResult {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  if (oldLines.length === 0 && newLines.length === 0) {
    return { hunks: [], hasChanges: false };
  }
  
  if (oldContent === newContent) {
    return { hunks: [], hasChanges: false };
  }
  
  const dp = diffLines(oldLines, newLines);
  const editScript = backtrackEditScript(dp, oldLines, newLines, oldLines.length, newLines.length);
  
  const changeIndices: number[] = [];
  editScript.forEach((item, index) => {
    if (item.type !== 'context') {
      changeIndices.push(index);
    }
  });
  
  if (changeIndices.length === 0) {
    return { hunks: [], hasChanges: false };
  }
  
  const hunks: DiffHunk[] = [];
  const visited = new Set<number>();
  
  for (const changeIndex of changeIndices) {
    if (visited.has(changeIndex)) continue;
    
    let start = Math.max(0, changeIndex - contextLines);
    let end = Math.min(editScript.length - 1, changeIndex + contextLines);
    
    for (let i = changeIndex + contextLines + 1; i < editScript.length; i++) {
      if (editScript[i].type !== 'context') {
        const gapStart = end + 1;
        const gapEnd = i - contextLines;
        if (gapEnd <= gapStart) {
          end = i + contextLines;
        } else {
          break;
        }
      }
    }
    
    for (let i = start; i <= end; i++) {
      visited.add(i);
    }
    
    const hunkLines: DiffLine[] = [];
    let oldLineNum = 0;
    let newLineNum = 0;
    
    for (let i = 0; i < start; i++) {
      const item = editScript[i];
      if (item.type === 'context' || item.type === 'removed') {
        oldLineNum++;
      }
      if (item.type === 'context' || item.type === 'added') {
        newLineNum++;
      }
    }
    
    const hunkOldStart = oldLineNum + 1;
    const hunkNewStart = newLineNum + 1;
    let hunkOldLines = 0;
    let hunkNewLines = 0;
    
    for (let i = start; i <= end && i < editScript.length; i++) {
      const item = editScript[i];
      
      switch (item.type) {
        case 'context':
          oldLineNum++;
          newLineNum++;
          hunkLines.push({
            type: 'context',
            content: oldLines[item.oldIndex!],
            oldLineNumber: oldLineNum,
            newLineNumber: newLineNum
          });
          hunkOldLines++;
          hunkNewLines++;
          break;
        case 'removed':
          oldLineNum++;
          hunkLines.push({
            type: 'removed',
            content: oldLines[item.oldIndex!],
            oldLineNumber: oldLineNum
          });
          hunkOldLines++;
          break;
        case 'added':
          newLineNum++;
          hunkLines.push({
            type: 'added',
            content: newLines[item.newIndex!],
            newLineNumber: newLineNum
          });
          hunkNewLines++;
          break;
      }
    }
    
    hunks.push({
      oldStart: hunkOldStart,
      oldLines: hunkOldLines,
      newStart: hunkNewStart,
      newLines: hunkNewLines,
      lines: hunkLines
    });
  }
  
  return { hunks, hasChanges: true };
}

export function formatDiffHeader(filePath: string): string {
  return `--- a/${filePath}\n+++ b/${filePath}`;
}

export function formatDiffHunk(hunk: DiffHunk): string {
  const header = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
  const lines = hunk.lines.map(line => {
    switch (line.type) {
      case 'context':
        return ` ${line.content}`;
      case 'added':
        return `+${line.content}`;
      case 'removed':
        return `-${line.content}`;
    }
  });
  
  return [header, ...lines].join('\n');
}

export function formatDiff(filePath: string, diff: DiffResult): string {
  if (!diff.hasChanges) {
    return '';
  }
  
  const header = formatDiffHeader(filePath);
  const hunks = diff.hunks.map(formatDiffHunk);
  
  return [header, ...hunks].join('\n');
}

export function computeAndFormatDiff(
  oldContent: string,
  newContent: string,
  filePath: string
): string {
  const diff = computeUnifiedDiff(oldContent, newContent);
  return formatDiff(filePath, diff);
}

export function getChangeStats(diff: DiffResult): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  
  for (const hunk of diff.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    }
  }
  
  return { added, removed };
}
