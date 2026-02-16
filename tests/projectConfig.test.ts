import {
  validateConfig,
  mergeConfigWithDefaults,
  applyCLIOverrides,
  DEFAULT_CONFIG,
  Config,
  ConfigFile,
  CLIConfigOverrides,
  ConfigValidationError
} from '../src/utils/projectConfig';
import * as fs from 'fs';
import * as path from 'path';

describe('Config Validation', () => {
  describe('validateConfig', () => {
    it('should accept null or undefined config', () => {
      expect(validateConfig(null).valid).toBe(true);
      expect(validateConfig(undefined).valid).toBe(true);
    });

    it('should reject non-object config', () => {
      const result = validateConfig('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    it('should reject array config', () => {
      const result = validateConfig([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    it('should reject unknown keys', () => {
      const result = validateConfig({ unknownKey: 'value' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unknown configuration key: "unknownKey"'))).toBe(true);
    });

    it('should validate include as array of strings', () => {
      expect(validateConfig({ include: ['**/*.ts'] }).valid).toBe(true);
      expect(validateConfig({ include: 'invalid' }).valid).toBe(false);
      expect(validateConfig({ include: [123] }).valid).toBe(false);
    });

    it('should validate exclude as array of strings', () => {
      expect(validateConfig({ exclude: ['**/node_modules/**'] }).valid).toBe(true);
      expect(validateConfig({ exclude: 'invalid' }).valid).toBe(false);
      expect(validateConfig({ exclude: [123] }).valid).toBe(false);
    });

    it('should validate strictMode as boolean', () => {
      expect(validateConfig({ strictMode: true }).valid).toBe(true);
      expect(validateConfig({ strictMode: false }).valid).toBe(true);
      expect(validateConfig({ strictMode: 'true' }).valid).toBe(false);
    });

    it('should validate preserveOriginalCSS as boolean', () => {
      expect(validateConfig({ preserveOriginalCSS: true }).valid).toBe(true);
      expect(validateConfig({ preserveOriginalCSS: 'true' }).valid).toBe(false);
    });

    it('should validate disableArbitraryValues as boolean', () => {
      expect(validateConfig({ disableArbitraryValues: true }).valid).toBe(true);
      expect(validateConfig({ disableArbitraryValues: 'true' }).valid).toBe(false);
    });

    it('should validate customSpacingScale as object with string values', () => {
      expect(validateConfig({ customSpacingScale: { '18px': '4.5' } }).valid).toBe(true);
      expect(validateConfig({ customSpacingScale: 'invalid' }).valid).toBe(false);
      expect(validateConfig({ customSpacingScale: { '18px': 4.5 } }).valid).toBe(false);
    });

    it('should validate ignoreSelectors as array of strings', () => {
      expect(validateConfig({ ignoreSelectors: ['.no-convert'] }).valid).toBe(true);
      expect(validateConfig({ ignoreSelectors: 'invalid' }).valid).toBe(false);
    });

    it('should validate ignoreProperties as array of strings', () => {
      expect(validateConfig({ ignoreProperties: ['animation'] }).valid).toBe(true);
      expect(validateConfig({ ignoreProperties: 'invalid' }).valid).toBe(false);
    });

    it('should validate logLevel as valid value', () => {
      expect(validateConfig({ logLevel: 'silent' }).valid).toBe(true);
      expect(validateConfig({ logLevel: 'info' }).valid).toBe(true);
      expect(validateConfig({ logLevel: 'verbose' }).valid).toBe(true);
      expect(validateConfig({ logLevel: 'debug' }).valid).toBe(false);
    });

    it('should validate outputMode as valid value', () => {
      expect(validateConfig({ outputMode: 'write' }).valid).toBe(true);
      expect(validateConfig({ outputMode: 'dry-run' }).valid).toBe(true);
      expect(validateConfig({ outputMode: 'invalid' }).valid).toBe(false);
    });

    it('should collect multiple errors', () => {
      const result = validateConfig({
        unknownKey: 'value',
        strictMode: 'not-a-bool',
        logLevel: 'invalid',
        include: 123
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

describe('Config Merging', () => {
  describe('mergeConfigWithDefaults', () => {
    it('should return default config when file config is null', () => {
      const result = mergeConfigWithDefaults(null);
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it('should merge include patterns', () => {
      const fileConfig: ConfigFile = { include: ['**/*.tsx'] };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.include).toEqual(['**/*.tsx']);
      expect(result.strictMode).toBe(DEFAULT_CONFIG.strictMode);
    });

    it('should merge exclude patterns', () => {
      const fileConfig: ConfigFile = { exclude: ['**/custom/**'] };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.exclude).toEqual(['**/custom/**']);
    });

    it('should merge strictMode', () => {
      const fileConfig: ConfigFile = { strictMode: true };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.strictMode).toBe(true);
    });

    it('should merge preserveOriginalCSS', () => {
      const fileConfig: ConfigFile = { preserveOriginalCSS: true };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.preserveOriginalCSS).toBe(true);
    });

    it('should merge disableArbitraryValues', () => {
      const fileConfig: ConfigFile = { disableArbitraryValues: true };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.disableArbitraryValues).toBe(true);
    });

    it('should merge customSpacingScale', () => {
      const fileConfig: ConfigFile = { 
        customSpacingScale: { '18px': '4.5', '22px': '5.5' } 
      };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.customSpacingScale['18px']).toBe('4.5');
      expect(result.customSpacingScale['22px']).toBe('5.5');
    });

    it('should merge ignoreSelectors', () => {
      const fileConfig: ConfigFile = { ignoreSelectors: ['.no-convert', '.legacy'] };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.ignoreSelectors).toEqual(['.no-convert', '.legacy']);
    });

    it('should merge ignoreProperties', () => {
      const fileConfig: ConfigFile = { ignoreProperties: ['animation', 'transition'] };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.ignoreProperties).toEqual(['animation', 'transition']);
    });

    it('should merge logLevel', () => {
      const fileConfig: ConfigFile = { logLevel: 'verbose' };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.logLevel).toBe('verbose');
    });

    it('should merge outputMode', () => {
      const fileConfig: ConfigFile = { outputMode: 'dry-run' };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.outputMode).toBe('dry-run');
    });

    it('should merge all options together', () => {
      const fileConfig: ConfigFile = {
        include: ['**/*.tsx'],
        exclude: ['**/test/**'],
        strictMode: true,
        preserveOriginalCSS: true,
        disableArbitraryValues: true,
        customSpacingScale: { '18px': '4.5' },
        ignoreSelectors: ['.no-convert'],
        ignoreProperties: ['animation'],
        logLevel: 'verbose',
        outputMode: 'dry-run'
      };
      const result = mergeConfigWithDefaults(fileConfig);
      expect(result.include).toEqual(['**/*.tsx']);
      expect(result.exclude).toEqual(['**/test/**']);
      expect(result.strictMode).toBe(true);
      expect(result.preserveOriginalCSS).toBe(true);
      expect(result.disableArbitraryValues).toBe(true);
      expect(result.customSpacingScale['18px']).toBe('4.5');
      expect(result.ignoreSelectors).toEqual(['.no-convert']);
      expect(result.ignoreProperties).toEqual(['animation']);
      expect(result.logLevel).toBe('verbose');
      expect(result.outputMode).toBe('dry-run');
    });
  });
});

describe('CLI Overrides', () => {
  describe('applyCLIOverrides', () => {
    it('should apply dryRun override', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { dryRun: true };
      const result = applyCLIOverrides(config, overrides);
      expect(result.outputMode).toBe('dry-run');
    });

    it('should apply preview override (same as dryRun)', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { preview: true };
      const result = applyCLIOverrides(config, overrides);
      expect(result.outputMode).toBe('dry-run');
    });

    it('should apply silent override', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { silent: true };
      const result = applyCLIOverrides(config, overrides);
      expect(result.logLevel).toBe('silent');
    });

    it('should apply verbose override', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { verbose: true };
      const result = applyCLIOverrides(config, overrides);
      expect(result.logLevel).toBe('verbose');
    });

    it('should apply strictMode override', () => {
      const config: Config = { ...DEFAULT_CONFIG, strictMode: false };
      const overrides: CLIConfigOverrides = { strictMode: true };
      const result = applyCLIOverrides(config, overrides);
      expect(result.strictMode).toBe(true);
    });

    it('should apply preserveOriginalCSS override', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { preserveOriginalCSS: true };
      const result = applyCLIOverrides(config, overrides);
      expect(result.preserveOriginalCSS).toBe(true);
    });

    it('should apply disableArbitraryValues override', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { disableArbitraryValues: true };
      const result = applyCLIOverrides(config, overrides);
      expect(result.disableArbitraryValues).toBe(true);
    });

    it('should apply include override', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { include: ['**/*.tsx'] };
      const result = applyCLIOverrides(config, overrides);
      expect(result.include).toEqual(['**/*.tsx']);
    });

    it('should apply exclude override', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { exclude: ['**/test/**'] };
      const result = applyCLIOverrides(config, overrides);
      expect(result.exclude).toEqual(['**/test/**']);
    });

    it('should apply ignoreSelectors override', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { ignoreSelectors: ['.no-convert'] };
      const result = applyCLIOverrides(config, overrides);
      expect(result.ignoreSelectors).toEqual(['.no-convert']);
    });

    it('should apply ignoreProperties override', () => {
      const config: Config = { ...DEFAULT_CONFIG };
      const overrides: CLIConfigOverrides = { ignoreProperties: ['animation'] };
      const result = applyCLIOverrides(config, overrides);
      expect(result.ignoreProperties).toEqual(['animation']);
    });

    it('should preserve config values when no overrides provided', () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        strictMode: true,
        logLevel: 'verbose'
      };
      const overrides: CLIConfigOverrides = {};
      const result = applyCLIOverrides(config, overrides);
      expect(result.strictMode).toBe(true);
      expect(result.logLevel).toBe('verbose');
    });

    it('CLI overrides should win over config file values', () => {
      const fileConfig: Config = {
        ...DEFAULT_CONFIG,
        strictMode: false,
        logLevel: 'silent',
        outputMode: 'write'
      };
      const overrides: CLIConfigOverrides = {
        strictMode: true,
        verbose: true,
        dryRun: true
      };
      const result = applyCLIOverrides(fileConfig, overrides);
      expect(result.strictMode).toBe(true);
      expect(result.logLevel).toBe('verbose');
      expect(result.outputMode).toBe('dry-run');
    });
  });
});

describe('Config File Loading', () => {
  const tempDir = path.join(__dirname, 'temp-config-test');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  describe('JSON config loading', () => {
    it('should load valid JSON config', async () => {
      const configPath = path.join(tempDir, 'css-to-tailwind.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        strictMode: true,
        logLevel: 'verbose'
      }));

      const { loadConfigFile } = await import('../src/utils/projectConfig');
      const { config, configPath: loadedPath } = await loadConfigFile(tempDir);
      
      expect(loadedPath).toBe(configPath);
      expect(config?.strictMode).toBe(true);
      expect(config?.logLevel).toBe('verbose');
    });

    it('should reject invalid JSON config', async () => {
      const configPath = path.join(tempDir, 'css-to-tailwind.config.json');
      fs.writeFileSync(configPath, '{ invalid json }');

      const { loadConfigFile } = await import('../src/utils/projectConfig');
      
      await expect(loadConfigFile(tempDir)).rejects.toThrow();
    });

    it('should reject JSON config with invalid schema', async () => {
      const configPath = path.join(tempDir, 'css-to-tailwind.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        invalidKey: 'value',
        strictMode: 'not-a-boolean'
      }));

      const { loadConfigFile } = await import('../src/utils/projectConfig');
      
      await expect(loadConfigFile(tempDir)).rejects.toThrow(ConfigValidationError);
    });
  });

  describe('JavaScript config loading', () => {
    it('should load valid JS config', async () => {
      const configPath = path.join(tempDir, 'css-to-tailwind.config.js');
      fs.writeFileSync(configPath, `
module.exports = {
  strictMode: true,
  logLevel: 'verbose'
};
`);

      const { loadConfigFile } = await import('../src/utils/projectConfig');
      const { config, configPath: loadedPath } = await loadConfigFile(tempDir);
      
      expect(loadedPath).toBe(configPath);
      expect(config?.strictMode).toBe(true);
      expect(config?.logLevel).toBe('verbose');
    });

    it('should load CommonJS config with cjs extension', async () => {
      const configPath = path.join(tempDir, 'css-to-tailwind.config.cjs');
      fs.writeFileSync(configPath, `
module.exports = {
  strictMode: true,
  logLevel: 'verbose'
};
`);

      const { loadConfigFile } = await import('../src/utils/projectConfig');
      const { config, configPath: loadedPath } = await loadConfigFile(tempDir);
      
      expect(loadedPath).toBe(configPath);
      expect(config?.strictMode).toBe(true);
    });
  });

  describe('Config file priority', () => {
    it('should prefer TypeScript config over JavaScript', async () => {
      const tsPath = path.join(tempDir, 'css-to-tailwind.config.ts');
      const jsPath = path.join(tempDir, 'css-to-tailwind.config.js');
      
      fs.writeFileSync(jsPath, `module.exports = { strictMode: false };`);
      fs.writeFileSync(tsPath, `export default { strictMode: true };`);

      const { loadConfigFile } = await import('../src/utils/projectConfig');
      const { configPath } = await loadConfigFile(tempDir);
      
      expect(configPath).toBe(tsPath);
    });

    it('should prefer JavaScript config over JSON', async () => {
      const jsPath = path.join(tempDir, 'css-to-tailwind.config.js');
      const jsonPath = path.join(tempDir, 'css-to-tailwind.config.json');
      
      fs.writeFileSync(jsPath, `module.exports = { strictMode: true };`);
      fs.writeFileSync(jsonPath, JSON.stringify({ strictMode: false }));

      const { loadConfigFile } = await import('../src/utils/projectConfig');
      const { configPath } = await loadConfigFile(tempDir);
      
      expect(configPath).toBe(jsPath);
    });

    it('should return null when no config file exists', async () => {
      const { loadConfigFile } = await import('../src/utils/projectConfig');
      const { config, configPath } = await loadConfigFile(tempDir);
      
      expect(config).toBeNull();
      expect(configPath).toBeNull();
    });
  });
});

describe('Full Config Resolution', () => {
  it('should resolve to defaults when no config file and no overrides', async () => {
    const { resolveConfig } = await import('../src/utils/projectConfig');
    const emptyDir = path.join(__dirname, 'empty-dir-' + Date.now());
    fs.mkdirSync(emptyDir, { recursive: true });
    
    try {
      const { config, configPath } = await resolveConfig(emptyDir, {});
      expect(configPath).toBeNull();
      expect(config).toEqual(DEFAULT_CONFIG);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});