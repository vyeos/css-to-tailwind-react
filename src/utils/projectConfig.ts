import path from 'path';
import fs from 'fs';
import { logger } from './logger';

export type LogLevel = 'silent' | 'info' | 'verbose';
export type OutputMode = 'write' | 'dry-run';

export interface Config {
  include: string[];
  exclude: string[];
  strictMode: boolean;
  preserveOriginalCSS: boolean;
  disableArbitraryValues: boolean;
  customSpacingScale: Record<string, string>;
  ignoreSelectors: string[];
  ignoreProperties: string[];
  logLevel: LogLevel;
  outputMode: OutputMode;
  deleteCss?: boolean;
  skipExternal?: boolean;
  skipInline?: boolean;
  skipInternal?: boolean;
}

export interface ConfigFile {
  include?: string[];
  exclude?: string[];
  strictMode?: boolean;
  preserveOriginalCSS?: boolean;
  disableArbitraryValues?: boolean;
  customSpacingScale?: Record<string, string>;
  ignoreSelectors?: string[];
  ignoreProperties?: string[];
  logLevel?: LogLevel;
  outputMode?: OutputMode;
  deleteCss?: boolean;
  skipExternal?: boolean;
  skipInline?: boolean;
  skipInternal?: boolean;
}

export interface CLIConfigOverrides {
  dryRun?: boolean;
  preview?: boolean;
  silent?: boolean;
  verbose?: boolean;
  deleteCss?: boolean;
  skipExternal?: boolean;
  skipInline?: boolean;
  skipInternal?: boolean;
  strictMode?: boolean;
  preserveOriginalCSS?: boolean;
  disableArbitraryValues?: boolean;
  include?: string[];
  exclude?: string[];
  ignoreSelectors?: string[];
  ignoreProperties?: string[];
}

export const DEFAULT_CONFIG: Config = {
  include: ['**/*.{js,jsx,ts,tsx}', '**/*.css'],
  exclude: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/*.d.ts',
    '**/.*'
  ],
  strictMode: false,
  preserveOriginalCSS: false,
  disableArbitraryValues: false,
  customSpacingScale: {},
  ignoreSelectors: [],
  ignoreProperties: [],
  logLevel: 'info',
  outputMode: 'write'
};

const CONFIG_FILE_NAMES = [
  'css-to-tailwind.config.ts',
  'css-to-tailwind.config.js',
  'css-to-tailwind.config.mjs',
  'css-to-tailwind.config.cjs',
  'css-to-tailwind.config.json'
] as const;

const VALID_CONFIG_KEYS = [
  'include',
  'exclude',
  'strictMode',
  'preserveOriginalCSS',
  'disableArbitraryValues',
  'customSpacingScale',
  'ignoreSelectors',
  'ignoreProperties',
  'logLevel',
  'outputMode',
  'deleteCss',
  'skipExternal',
  'skipInline',
  'skipInternal'
] as const;

const VALID_LOG_LEVELS: LogLevel[] = ['silent', 'info', 'verbose'];
const VALID_OUTPUT_MODES: OutputMode[] = ['write', 'dry-run'];

export class ConfigValidationError extends Error {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    this.name = 'ConfigValidationError';
    this.errors = errors;
  }
}

export function validateConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config === null || config === undefined) {
    return { valid: true, errors: [] };
  }

  if (typeof config !== 'object' || Array.isArray(config)) {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }

  const cfg = config as Record<string, unknown>;

  for (const key of Object.keys(cfg)) {
    if (!VALID_CONFIG_KEYS.includes(key as typeof VALID_CONFIG_KEYS[number])) {
      errors.push(`Unknown configuration key: "${key}"`);
    }
  }

  if (cfg.include !== undefined) {
    if (!Array.isArray(cfg.include)) {
      errors.push('"include" must be an array of glob patterns');
    } else if (!cfg.include.every(item => typeof item === 'string')) {
      errors.push('"include" must contain only string values');
    }
  }

  if (cfg.exclude !== undefined) {
    if (!Array.isArray(cfg.exclude)) {
      errors.push('"exclude" must be an array of glob patterns');
    } else if (!cfg.exclude.every(item => typeof item === 'string')) {
      errors.push('"exclude" must contain only string values');
    }
  }

  if (cfg.strictMode !== undefined && typeof cfg.strictMode !== 'boolean') {
    errors.push('"strictMode" must be a boolean');
  }

  if (cfg.preserveOriginalCSS !== undefined && typeof cfg.preserveOriginalCSS !== 'boolean') {
    errors.push('"preserveOriginalCSS" must be a boolean');
  }

  if (cfg.disableArbitraryValues !== undefined && typeof cfg.disableArbitraryValues !== 'boolean') {
    errors.push('"disableArbitraryValues" must be a boolean');
  }

  if (cfg.customSpacingScale !== undefined) {
    if (typeof cfg.customSpacingScale !== 'object' || Array.isArray(cfg.customSpacingScale)) {
      errors.push('"customSpacingScale" must be an object');
    } else {
      const scale = cfg.customSpacingScale as Record<string, unknown>;
      for (const [key, value] of Object.entries(scale)) {
        if (typeof value !== 'string') {
          errors.push(`"customSpacingScale.${key}" must be a string`);
        }
      }
    }
  }

  if (cfg.ignoreSelectors !== undefined) {
    if (!Array.isArray(cfg.ignoreSelectors)) {
      errors.push('"ignoreSelectors" must be an array');
    } else if (!cfg.ignoreSelectors.every(item => typeof item === 'string')) {
      errors.push('"ignoreSelectors" must contain only string values');
    }
  }

  if (cfg.ignoreProperties !== undefined) {
    if (!Array.isArray(cfg.ignoreProperties)) {
      errors.push('"ignoreProperties" must be an array');
    } else if (!cfg.ignoreProperties.every(item => typeof item === 'string')) {
      errors.push('"ignoreProperties" must contain only string values');
    }
  }

  if (cfg.logLevel !== undefined) {
    if (!VALID_LOG_LEVELS.includes(cfg.logLevel as LogLevel)) {
      errors.push(`"logLevel" must be one of: ${VALID_LOG_LEVELS.join(', ')}`);
    }
  }

  if (cfg.outputMode !== undefined) {
    if (!VALID_OUTPUT_MODES.includes(cfg.outputMode as OutputMode)) {
      errors.push(`"outputMode" must be one of: ${VALID_OUTPUT_MODES.join(', ')}`);
    }
  }

  if (cfg.deleteCss !== undefined && typeof cfg.deleteCss !== 'boolean') {
    errors.push('"deleteCss" must be a boolean');
  }

  if (cfg.skipExternal !== undefined && typeof cfg.skipExternal !== 'boolean') {
    errors.push('"skipExternal" must be a boolean');
  }

  if (cfg.skipInline !== undefined && typeof cfg.skipInline !== 'boolean') {
    errors.push('"skipInline" must be a boolean');
  }

  if (cfg.skipInternal !== undefined && typeof cfg.skipInternal !== 'boolean') {
    errors.push('"skipInternal" must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}

function findConfigFile(projectRoot: string): string | null {
  for (const fileName of CONFIG_FILE_NAMES) {
    const fullPath = path.join(projectRoot, fileName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

async function loadTypeScriptConfig(configPath: string): Promise<ConfigFile> {
  try {
    const ts = await import('typescript');
    const sourceFile = fs.readFileSync(configPath, 'utf-8');
    
    const result = ts.transpileModule(sourceFile, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true
      }
    });

    const tempPath = `${configPath}.compiled.${Date.now()}.js`;
    fs.writeFileSync(tempPath, result.outputText, 'utf-8');
    
    try {
      delete require.cache[require.resolve(tempPath)];
      const loaded = require(tempPath);
      return loaded.default || loaded;
    } finally {
      fs.unlinkSync(tempPath);
    }
  } catch (error) {
    throw new Error(`Failed to load TypeScript config: ${configPath}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

function loadJavaScriptConfig(configPath: string): ConfigFile {
  try {
    delete require.cache[require.resolve(configPath)];
    const loaded = require(configPath);
    return loaded.default || loaded;
  } catch (error) {
    throw new Error(`Failed to load config: ${configPath}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

function loadJSONConfig(configPath: string): ConfigFile {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON config: ${configPath}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadConfigFile(projectRoot: string): Promise<{ config: ConfigFile | null; configPath: string | null }> {
  const configPath = findConfigFile(projectRoot);
  
  if (!configPath) {
    return { config: null, configPath: null };
  }

  const ext = path.extname(configPath);
  
  let config: ConfigFile;

  if (ext === '.ts') {
    config = await loadTypeScriptConfig(configPath);
  } else if (ext === '.json') {
    config = loadJSONConfig(configPath);
  } else if (['.js', '.mjs', '.cjs'].includes(ext)) {
    config = loadJavaScriptConfig(configPath);
  } else {
    throw new Error(`Unsupported config file extension: ${ext}`);
  }

  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new ConfigValidationError(validation.errors);
  }

  return { config, configPath };
}

export function mergeConfigWithDefaults(fileConfig: ConfigFile | null): Config {
  if (!fileConfig) {
    return { ...DEFAULT_CONFIG };
  }

  return {
    include: fileConfig.include ?? DEFAULT_CONFIG.include,
    exclude: fileConfig.exclude ?? DEFAULT_CONFIG.exclude,
    strictMode: fileConfig.strictMode ?? DEFAULT_CONFIG.strictMode,
    preserveOriginalCSS: fileConfig.preserveOriginalCSS ?? DEFAULT_CONFIG.preserveOriginalCSS,
    disableArbitraryValues: fileConfig.disableArbitraryValues ?? DEFAULT_CONFIG.disableArbitraryValues,
    customSpacingScale: fileConfig.customSpacingScale ?? DEFAULT_CONFIG.customSpacingScale,
    ignoreSelectors: fileConfig.ignoreSelectors ?? DEFAULT_CONFIG.ignoreSelectors,
    ignoreProperties: fileConfig.ignoreProperties ?? DEFAULT_CONFIG.ignoreProperties,
    logLevel: fileConfig.logLevel ?? DEFAULT_CONFIG.logLevel,
    outputMode: fileConfig.outputMode ?? DEFAULT_CONFIG.outputMode,
    deleteCss: fileConfig.deleteCss,
    skipExternal: fileConfig.skipExternal,
    skipInline: fileConfig.skipInline,
    skipInternal: fileConfig.skipInternal
  };
}

export function applyCLIOverrides(config: Config, overrides: CLIConfigOverrides): Config {
  const result = { ...config };

  if (overrides.dryRun || overrides.preview) {
    result.outputMode = 'dry-run';
  }

  if (overrides.silent) {
    result.logLevel = 'silent';
  } else if (overrides.verbose) {
    result.logLevel = 'verbose';
  }

  if (overrides.strictMode !== undefined) {
    result.strictMode = overrides.strictMode;
  }

  if (overrides.preserveOriginalCSS !== undefined) {
    result.preserveOriginalCSS = overrides.preserveOriginalCSS;
  }

  if (overrides.disableArbitraryValues !== undefined) {
    result.disableArbitraryValues = overrides.disableArbitraryValues;
  }

  if (overrides.deleteCss !== undefined) {
    result.deleteCss = overrides.deleteCss;
  }

  if (overrides.skipExternal !== undefined) {
    result.skipExternal = overrides.skipExternal;
  }

  if (overrides.skipInline !== undefined) {
    result.skipInline = overrides.skipInline;
  }

  if (overrides.skipInternal !== undefined) {
    result.skipInternal = overrides.skipInternal;
  }

  if (overrides.include && overrides.include.length > 0) {
    result.include = overrides.include;
  }

  if (overrides.exclude && overrides.exclude.length > 0) {
    result.exclude = overrides.exclude;
  }

  if (overrides.ignoreSelectors && overrides.ignoreSelectors.length > 0) {
    result.ignoreSelectors = overrides.ignoreSelectors;
  }

  if (overrides.ignoreProperties && overrides.ignoreProperties.length > 0) {
    result.ignoreProperties = overrides.ignoreProperties;
  }

  return result;
}

export async function resolveConfig(projectRoot: string, overrides: CLIConfigOverrides = {}): Promise<{ config: Config; configPath: string | null }> {
  const { config: fileConfig, configPath } = await loadConfigFile(projectRoot);
  
  const mergedConfig = mergeConfigWithDefaults(fileConfig);
  
  const finalConfig = applyCLIOverrides(mergedConfig, overrides);

  return { config: finalConfig, configPath };
}

export function formatConfigForDebug(config: Config): string {
  return JSON.stringify(config, null, 2);
}

export function logConfigInfo(config: Config, configPath: string | null, verbose: boolean): void {
  if (configPath) {
    logger.info(`📝 Loaded config from: ${path.basename(configPath)}`);
  } else {
    logger.info('📝 Using default configuration');
  }

  if (verbose) {
    logger.debug('Resolved configuration:');
    console.log(formatConfigForDebug(config));
  }
}