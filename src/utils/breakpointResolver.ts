import { logger } from './logger';

export interface Breakpoint {
  name: string;
  minWidth: number;
}

export interface MediaQueryInfo {
  type: 'min-width' | 'max-width' | 'unsupported';
  value?: number;
  raw: string;
}

const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: 'sm', minWidth: 640 },
  { name: 'md', minWidth: 768 },
  { name: 'lg', minWidth: 1024 },
  { name: 'xl', minWidth: 1280 },
  { name: '2xl', minWidth: 1536 }
];

let cachedBreakpoints: Breakpoint[] | null = null;

export function getDefaultBreakpoints(): Breakpoint[] {
  return [...DEFAULT_BREAKPOINTS];
}

export function resolveBreakpointsFromConfig(screens: Record<string, string | [string, string]> | undefined): Breakpoint[] {
  if (!screens) {
    return getDefaultBreakpoints();
  }

  const breakpoints: Breakpoint[] = [];

  for (const [name, value] of Object.entries(screens)) {
    let minWidth: number | null = null;

    if (typeof value === 'string') {
      minWidth = parsePixelValue(value);
    } else if (Array.isArray(value)) {
      minWidth = parsePixelValue(value[0]);
    }

    if (minWidth !== null) {
      breakpoints.push({ name, minWidth });
    }
  }

  breakpoints.sort((a, b) => a.minWidth - b.minWidth);

  return breakpoints.length > 0 ? breakpoints : getDefaultBreakpoints();
}

function parsePixelValue(value: string): number | null {
  const pxMatch = value.match(/^([\d.]+)px$/);
  if (pxMatch) {
    return parseFloat(pxMatch[1]);
  }

  const remMatch = value.match(/^([\d.]+)rem$/);
  if (remMatch) {
    return parseFloat(remMatch[1]) * 16;
  }

  const emMatch = value.match(/^([\d.]+)em$/);
  if (emMatch) {
    return parseFloat(emMatch[1]) * 16;
  }

  return null;
}

export function getBreakpoints(screens?: Record<string, string | [string, string]>): Breakpoint[] {
  if (cachedBreakpoints && !screens) {
    return cachedBreakpoints;
  }

  const breakpoints = screens ? resolveBreakpointsFromConfig(screens) : getDefaultBreakpoints();
  
  if (!screens) {
    cachedBreakpoints = breakpoints;
  }
  
  return breakpoints;
}

export function clearBreakpointCache(): void {
  cachedBreakpoints = null;
}

export function parseMediaQuery(params: string): MediaQueryInfo {
  const trimmed = params.trim().toLowerCase();

  if (trimmed.includes('screen') && trimmed.includes('and')) {
    return {
      type: 'unsupported',
      raw: params
    };
  }

  if (trimmed.includes('orientation') || trimmed.includes('print')) {
    return {
      type: 'unsupported',
      raw: params
    };
  }

  const minMatch = trimmed.match(/\(\s*min-width\s*:\s*([\d.]+)(px|rem|em)\s*\)/);
  if (minMatch) {
    const value = parseFloat(minMatch[1]);
    const unit = minMatch[2];

    let pxValue = value;
    if (unit === 'rem' || unit === 'em') {
      pxValue = value * 16;
    }

    return {
      type: 'min-width',
      value: pxValue,
      raw: params
    };
  }

  const maxMatch = trimmed.match(/\(\s*max-width\s*:\s*([\d.]+)(px|rem|em)\s*\)/);
  if (maxMatch) {
    return {
      type: 'max-width',
      raw: params
    };
  }

  return {
    type: 'unsupported',
    raw: params
  };
}

export function findBreakpointForMinWidth(minWidth: number, breakpoints: Breakpoint[]): string | null {
  const exact = breakpoints.find(bp => bp.minWidth === minWidth);
  if (exact) {
    return exact.name;
  }

  const closest = breakpoints.reduce<Breakpoint | null>((closest, bp) => {
    if (!closest) return bp;

    const currentDiff = Math.abs(bp.minWidth - minWidth);
    const closestDiff = Math.abs(closest.minWidth - minWidth);

    return currentDiff < closestDiff ? bp : closest;
  }, null);

  if (closest) {
    const diff = Math.abs(closest.minWidth - minWidth);
    const tolerance = minWidth * 0.05;

    if (diff <= tolerance) {
      logger.verbose(`Matched min-width ${minWidth}px to closest breakpoint ${closest.name} (${closest.minWidth}px)`);
      return closest.name;
    }
  }

  return null;
}

export function prefixWithBreakpoint(className: string, breakpoint: string): string {
  return `${breakpoint}:${className}`;
}

export function processMediaQuery(params: string, breakpoints: Breakpoint[]): {
  breakpoint: string | null;
  skipped: boolean;
  reason?: string;
} {
  const info = parseMediaQuery(params);

  if (info.type !== 'min-width' || info.value === undefined) {
    const reason = info.type === 'max-width'
      ? `Skipped media query (max-width: ...) — unsupported`
      : `Skipped media query (${info.raw}) — unsupported`;

    logger.verbose(reason);
    return { breakpoint: null, skipped: true, reason };
  }

  const breakpoint = findBreakpointForMinWidth(info.value, breakpoints);

  if (!breakpoint) {
    const reason = `No matching breakpoint for min-width: ${info.value}px`;
    logger.verbose(reason);
    return { breakpoint: null, skipped: true, reason };
  }

  logger.verbose(`Converted media query (min-width: ${info.value}px) → ${breakpoint}`);

  return { breakpoint, skipped: false };
}