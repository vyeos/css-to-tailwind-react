import glob from 'fast-glob';
import path from 'path';
import { Config, DEFAULT_CONFIG } from './utils/projectConfig';

export interface ScannedFile {
  path: string;
  type: 'jsx' | 'css';
}

export interface ScanOptions {
  config?: Config;
}

function categorizePatterns(include: string[]): { jsx: string[]; css: string[] } {
  const jsx: string[] = [];
  const css: string[] = [];

  for (const pattern of include) {
    if (pattern.includes('.css') || pattern.endsWith('.css')) {
      css.push(pattern);
    } else if (pattern.includes('.{js,jsx,ts,tsx}') || pattern.includes('.js') || pattern.includes('.jsx') || pattern.includes('.ts') || pattern.includes('.tsx')) {
      jsx.push(pattern);
    } else {
      jsx.push(pattern);
    }
  }

  return { jsx, css };
}

export async function scanProject(directory: string, options?: ScanOptions): Promise<ScannedFile[]> {
  const absoluteDir = path.resolve(directory);
  const config = options?.config ?? DEFAULT_CONFIG;

  const { jsx: jsxPatterns, css: cssPatterns } = categorizePatterns(config.include);

  const ignorePatterns = config.exclude;

  try {
    const jsxFiles = jsxPatterns.length > 0 
      ? await glob(jsxPatterns, {
          cwd: absoluteDir,
          ignore: ignorePatterns,
          absolute: true,
          onlyFiles: true
        })
      : [];

    const cssFiles = cssPatterns.length > 0
      ? await glob(cssPatterns, {
          cwd: absoluteDir,
          ignore: ignorePatterns,
          absolute: true,
          onlyFiles: true
        })
      : [];

    const files: ScannedFile[] = [
      ...jsxFiles.map(file => ({ path: file, type: 'jsx' as const })),
      ...cssFiles.map(file => ({ path: file, type: 'css' as const }))
    ];

    return files.sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    throw new Error(`Failed to scan directory: ${error}`);
  }
}
