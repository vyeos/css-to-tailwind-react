import {
  parseMediaQuery,
  findBreakpointForMinWidth,
  processMediaQuery,
  getDefaultBreakpoints,
  resolveBreakpointsFromConfig,
  prefixWithBreakpoint
} from '../src/utils/breakpointResolver';

describe('breakpointResolver', () => {
  beforeEach(() => {
    const { clearBreakpointCache } = require('../src/utils/breakpointResolver');
    clearBreakpointCache();
  });

  describe('parseMediaQuery', () => {
    it('should parse min-width media query with px', () => {
      const result = parseMediaQuery('(min-width: 768px)');
      expect(result.type).toBe('min-width');
      expect(result.value).toBe(768);
    });

    it('should parse min-width media query with rem', () => {
      const result = parseMediaQuery('(min-width: 48rem)');
      expect(result.type).toBe('min-width');
      expect(result.value).toBe(768);
    });

    it('should parse min-width media query with em', () => {
      const result = parseMediaQuery('(min-width: 40em)');
      expect(result.type).toBe('min-width');
      expect(result.value).toBe(640);
    });

    it('should identify max-width as unsupported', () => {
      const result = parseMediaQuery('(max-width: 768px)');
      expect(result.type).toBe('max-width');
      expect(result.value).toBeUndefined();
    });

    it('should identify orientation as unsupported', () => {
      const result = parseMediaQuery('(orientation: portrait)');
      expect(result.type).toBe('unsupported');
    });

    it('should identify print media as unsupported', () => {
      const result = parseMediaQuery('print');
      expect(result.type).toBe('unsupported');
    });

    it('should handle complex expressions as unsupported', () => {
      const result = parseMediaQuery('screen and (max-width: 768px)');
      expect(result.type).toBe('unsupported');
    });

    it('should parse with whitespace', () => {
      const result = parseMediaQuery('  (  min-width  :  768px  )  ');
      expect(result.type).toBe('min-width');
      expect(result.value).toBe(768);
    });
  });

  describe('getDefaultBreakpoints', () => {
    it('should return default Tailwind breakpoints', () => {
      const breakpoints = getDefaultBreakpoints();
      expect(breakpoints).toHaveLength(5);
      expect(breakpoints[0]).toEqual({ name: 'sm', minWidth: 640 });
      expect(breakpoints[1]).toEqual({ name: 'md', minWidth: 768 });
      expect(breakpoints[2]).toEqual({ name: 'lg', minWidth: 1024 });
      expect(breakpoints[3]).toEqual({ name: 'xl', minWidth: 1280 });
      expect(breakpoints[4]).toEqual({ name: '2xl', minWidth: 1536 });
    });
  });

  describe('resolveBreakpointsFromConfig', () => {
    it('should return default breakpoints when no config provided', () => {
      const breakpoints = resolveBreakpointsFromConfig(undefined);
      expect(breakpoints).toEqual(getDefaultBreakpoints());
    });

    it('should resolve breakpoints from config with string values', () => {
      const screens = {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px'
      };
      const breakpoints = resolveBreakpointsFromConfig(screens);
      expect(breakpoints).toHaveLength(3);
      expect(breakpoints.find(b => b.name === 'md')?.minWidth).toBe(768);
    });

    it('should resolve breakpoints from config with rem values', () => {
      const screens = {
        'sm': '40rem',
        'md': '48rem'
      };
      const breakpoints = resolveBreakpointsFromConfig(screens);
      expect(breakpoints.find(b => b.name === 'sm')?.minWidth).toBe(640);
      expect(breakpoints.find(b => b.name === 'md')?.minWidth).toBe(768);
    });

    it('should resolve breakpoints from config with array values', () => {
      const screens: Record<string, string | [string, string]> = {
        'sm': ['640px', '767px'] as [string, string],
        'md': ['768px', '1023px'] as [string, string]
      };
      const breakpoints = resolveBreakpointsFromConfig(screens);
      expect(breakpoints.find(b => b.name === 'sm')?.minWidth).toBe(640);
      expect(breakpoints.find(b => b.name === 'md')?.minWidth).toBe(768);
    });

    it('should sort breakpoints by minWidth', () => {
      const screens = {
        'xl': '1280px',
        'sm': '640px',
        'lg': '1024px'
      };
      const breakpoints = resolveBreakpointsFromConfig(screens);
      expect(breakpoints[0].name).toBe('sm');
      expect(breakpoints[1].name).toBe('lg');
      expect(breakpoints[2].name).toBe('xl');
    });
  });

  describe('findBreakpointForMinWidth', () => {
    const breakpoints = getDefaultBreakpoints();

    it('should find exact match for 640px', () => {
      const result = findBreakpointForMinWidth(640, breakpoints);
      expect(result).toBe('sm');
    });

    it('should find exact match for 768px', () => {
      const result = findBreakpointForMinWidth(768, breakpoints);
      expect(result).toBe('md');
    });

    it('should find exact match for 1024px', () => {
      const result = findBreakpointForMinWidth(1024, breakpoints);
      expect(result).toBe('lg');
    });

    it('should find closest match within tolerance', () => {
      const result = findBreakpointForMinWidth(770, breakpoints);
      expect(result).toBe('md');
    });

    it('should return null for value outside tolerance', () => {
      const result = findBreakpointForMinWidth(500, breakpoints);
      expect(result).toBeNull();
    });

    it('should return null for very large value', () => {
      const result = findBreakpointForMinWidth(5000, breakpoints);
      expect(result).toBeNull();
    });
  });

  describe('processMediaQuery', () => {
    const breakpoints = getDefaultBreakpoints();

    it('should process valid min-width query', () => {
      const result = processMediaQuery('(min-width: 768px)', breakpoints);
      expect(result.skipped).toBe(false);
      expect(result.breakpoint).toBe('md');
    });

    it('should skip max-width query', () => {
      const result = processMediaQuery('(max-width: 768px)', breakpoints);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('max-width');
    });

    it('should skip unsupported media types', () => {
      const result = processMediaQuery('print', breakpoints);
      expect(result.skipped).toBe(true);
    });

    it('should skip when no matching breakpoint', () => {
      const result = processMediaQuery('(min-width: 500px)', breakpoints);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('No matching breakpoint');
    });
  });

  describe('prefixWithBreakpoint', () => {
    it('should prefix utility with breakpoint', () => {
      const result = prefixWithBreakpoint('flex', 'md');
      expect(result).toBe('md:flex');
    });

    it('should prefix spacing utility', () => {
      const result = prefixWithBreakpoint('m-4', 'lg');
      expect(result).toBe('lg:m-4');
    });

    it('should prefix display utility', () => {
      const result = prefixWithBreakpoint('block', 'sm');
      expect(result).toBe('sm:block');
    });
  });
});