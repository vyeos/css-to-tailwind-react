import glob from 'fast-glob';
import path from 'path';

export interface ScannedFile {
  path: string;
  type: 'jsx' | 'css';
}

export async function scanProject(directory: string): Promise<ScannedFile[]> {
  const absoluteDir = path.resolve(directory);
  
  // Patterns for React components
  const jsxPatterns = [
    '**/*.{js,jsx,ts,tsx}',
  ];
  
  // Patterns for CSS files
  const cssPatterns = [
    '**/*.css',
  ];
  
  // Ignore patterns
  const ignorePatterns = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/*.d.ts',
    '**/.*' // hidden files
  ];

  try {
    // Scan for JSX/TSX files
    const jsxFiles = await glob(jsxPatterns, {
      cwd: absoluteDir,
      ignore: ignorePatterns,
      absolute: true,
      onlyFiles: true
    });

    // Scan for CSS files
    const cssFiles = await glob(cssPatterns, {
      cwd: absoluteDir,
      ignore: ignorePatterns,
      absolute: true,
      onlyFiles: true
    });

    const files: ScannedFile[] = [
      ...jsxFiles.map(file => ({ path: file, type: 'jsx' as const })),
      ...cssFiles.map(file => ({ path: file, type: 'css' as const }))
    ];

    return files.sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    throw new Error(`Failed to scan directory: ${error}`);
  }
}
