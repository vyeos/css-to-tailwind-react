import { TailwindConfig } from './utils/config';
import { logger } from './utils/logger';

export interface CSSProperty {
  property: string;
  value: string;
}

export interface ConversionResult {
  className: string | null;
  skipped: boolean;
  reason?: string;
}

export class TailwindMapper {
  private config: TailwindConfig;
  private spacingScale: Map<number, string>;

  constructor(config: TailwindConfig) {
    this.config = config;
    this.spacingScale = this.buildSpacingScale();
  }

  private buildSpacingScale(): Map<number, string> {
    const scale = new Map<number, string>();
    const spacing = this.config.theme?.spacing || {};

    Object.entries(spacing).forEach(([key, value]) => {
      // Convert rem to pixels for comparison (assuming 1rem = 16px)
      const remMatch = value.match(/([\d.]+)rem/);
      if (remMatch) {
        const pixels = parseFloat(remMatch[1]) * 16;
        scale.set(Math.round(pixels), key);
      }

      // Also handle pixel values
      const pxMatch = value.match(/([\d.]+)px/);
      if (pxMatch) {
        scale.set(Math.round(parseFloat(pxMatch[1])), key);
      }
    });

    return scale;
  }

  private pxToSpacing(px: number): string | null {
    // Try exact match first
    if (this.spacingScale.has(px)) {
      return this.spacingScale.get(px)!;
    }

    // Find closest match
    let closestKey: number | null = null;
    let closestDiff: number = Infinity;
    
    this.spacingScale.forEach((_, key) => {
      const diff = Math.abs(key - px);
      if (diff < closestDiff) {
        closestKey = key;
        closestDiff = diff;
      }
    });

    // Only accept if within reasonable tolerance (20%)
    if (closestKey !== null && closestDiff / px < 0.2) {
      return this.spacingScale.get(closestKey) || null;
    }

    return null;
  }

  private extractPx(value: string): number | null {
    const pxMatch = value.match(/^([\d.]+)px$/);
    if (pxMatch) {
      return parseFloat(pxMatch[1]);
    }

    // Handle rem values
    const remMatch = value.match(/^([\d.]+)rem$/);
    if (remMatch) {
      return parseFloat(remMatch[1]) * 16;
    }

    return null;
  }

  convertProperty(property: string, value: string): ConversionResult {
    const normalizedProp = property.toLowerCase().trim();
    const normalizedValue = value.toLowerCase().trim();

    logger.verbose(`Converting: ${normalizedProp}: ${normalizedValue}`);

    // Display properties
    if (normalizedProp === 'display') {
      return this.convertDisplay(normalizedValue);
    }

    // Position properties
    if (normalizedProp === 'position') {
      return { className: normalizedValue, skipped: false };
    }

    // Margin properties
    if (normalizedProp.startsWith('margin')) {
      return this.convertMargin(normalizedProp, normalizedValue);
    }

    // Padding properties
    if (normalizedProp.startsWith('padding')) {
      return this.convertPadding(normalizedProp, normalizedValue);
    }

    // Font properties
    if (normalizedProp === 'font-weight') {
      return this.convertFontWeight(normalizedValue);
    }

    if (normalizedProp === 'font-size') {
      return this.convertFontSize(normalizedValue);
    }

    // Text properties
    if (normalizedProp === 'text-align') {
      return { className: `text-${normalizedValue}`, skipped: false };
    }

    // Flexbox properties
    if (normalizedProp.startsWith('flex') || 
        normalizedProp.startsWith('justify') || 
        normalizedProp.startsWith('align')) {
      return this.convertFlexbox(normalizedProp, normalizedValue);
    }

    // Gap properties
    if (normalizedProp === 'gap') {
      return this.convertGap(normalizedValue);
    }

    // Width and Height
    if (normalizedProp === 'width') {
      return this.convertWidth(normalizedValue);
    }

    if (normalizedProp === 'height') {
      return this.convertHeight(normalizedValue);
    }

    // Colors
    if (normalizedProp === 'background-color') {
      return this.convertBackgroundColor(normalizedValue);
    }

    if (normalizedProp === 'color') {
      return this.convertTextColor(normalizedValue);
    }

    // Border radius
    if (normalizedProp === 'border-radius') {
      return this.convertBorderRadius(normalizedValue);
    }

    // Unsupported properties
    return {
      className: null,
      skipped: true,
      reason: `Unsupported property: ${property}`
    };
  }

  private convertDisplay(value: string): ConversionResult {
    const displayMap: Record<string, string> = {
      'flex': 'flex',
      'block': 'block',
      'inline': 'inline',
      'inline-block': 'inline-block',
      'grid': 'grid',
      'none': 'hidden',
      'contents': 'contents',
      'table': 'table',
      'table-cell': 'table-cell'
    };

    if (displayMap[value]) {
      return { className: displayMap[value], skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown display value: ${value}` };
  }

  private convertMargin(prop: string, value: string): ConversionResult {
    const px = this.extractPx(value);
    
    const sideMap: Record<string, string> = {
      'margin': 'm',
      'margin-top': 'mt',
      'margin-right': 'mr',
      'margin-bottom': 'mb',
      'margin-left': 'ml',
      'margin-x': 'mx',
      'margin-y': 'my'
    };
    const prefix = sideMap[prop] || 'm';
    
    if (px === null) {
      if (/^-?\d+(\.\d+)?(px|rem|em)?$/.test(value)) {
        return { className: `${prefix}-[${value}]`, skipped: false };
      }
      return { className: null, skipped: true, reason: `Non-pixel margin value: ${value}` };
    }

    const spacing = this.pxToSpacing(px);
    if (!spacing) {
      return { className: `${prefix}-[${value}]`, skipped: false };
    }

    return { className: `${prefix}-${spacing}`, skipped: false };
  }

  private convertPadding(prop: string, value: string): ConversionResult {
    const px = this.extractPx(value);
    
    const sideMap: Record<string, string> = {
      'padding': 'p',
      'padding-top': 'pt',
      'padding-right': 'pr',
      'padding-bottom': 'pb',
      'padding-left': 'pl',
      'padding-x': 'px',
      'padding-y': 'py'
    };
    const prefix = sideMap[prop] || 'p';
    
    if (px === null) {
      if (/^-?\d+(\.\d+)?(px|rem|em)?$/.test(value)) {
        return { className: `${prefix}-[${value}]`, skipped: false };
      }
      return { className: null, skipped: true, reason: `Non-pixel padding value: ${value}` };
    }

    const spacing = this.pxToSpacing(px);
    if (!spacing) {
      return { className: `${prefix}-[${value}]`, skipped: false };
    }

    return { className: `${prefix}-${spacing}`, skipped: false };
  }

  private convertFontWeight(value: string): ConversionResult {
    const weightMap: Record<string, string> = {
      '100': 'font-thin',
      '200': 'font-extralight',
      '300': 'font-light',
      '400': 'font-normal',
      '500': 'font-medium',
      '600': 'font-semibold',
      '700': 'font-bold',
      '800': 'font-extrabold',
      '900': 'font-black',
      'normal': 'font-normal',
      'bold': 'font-bold'
    };

    if (weightMap[value]) {
      return { className: weightMap[value], skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown font-weight: ${value}` };
  }

  private convertFontSize(value: string): ConversionResult {
    const px = this.extractPx(value);
    if (px !== null) {
      // Map common font sizes
      const sizeMap: Record<number, string> = {
        12: 'text-xs',
        14: 'text-sm',
        16: 'text-base',
        18: 'text-lg',
        20: 'text-xl',
        24: 'text-2xl',
        30: 'text-3xl',
        36: 'text-4xl',
        48: 'text-5xl'
      };

      const closest = Object.keys(sizeMap)
        .map(Number)
        .reduce((prev, curr) => 
          Math.abs(curr - px) < Math.abs(prev - px) ? curr : prev
        );

      if (Math.abs(closest - px) / px < 0.15) {
        return { className: sizeMap[closest], skipped: false };
      }
      
      return { className: `text-[${value}]`, skipped: false };
    }

    if (/^\d+(\.\d+)?(px|rem|em)?$/.test(value)) {
      return { className: `text-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Non-standard font-size: ${value}` };
  }

  private convertFlexbox(prop: string, value: string): ConversionResult {
    // Flex direction
    if (prop === 'flex-direction') {
      const dirMap: Record<string, string> = {
        'row': 'flex-row',
        'row-reverse': 'flex-row-reverse',
        'column': 'flex-col',
        'column-reverse': 'flex-col-reverse'
      };
      return { className: dirMap[value] || null, skipped: !dirMap[value] };
    }

    // Flex wrap
    if (prop === 'flex-wrap') {
      const wrapMap: Record<string, string> = {
        'wrap': 'flex-wrap',
        'nowrap': 'flex-nowrap',
        'wrap-reverse': 'flex-wrap-reverse'
      };
      return { className: wrapMap[value] || null, skipped: !wrapMap[value] };
    }

    // Justify content
    if (prop === 'justify-content') {
      const justifyMap: Record<string, string> = {
        'flex-start': 'justify-start',
        'flex-end': 'justify-end',
        'center': 'justify-center',
        'space-between': 'justify-between',
        'space-around': 'justify-around',
        'space-evenly': 'justify-evenly'
      };
      return { className: justifyMap[value] || null, skipped: !justifyMap[value] };
    }

    // Align items
    if (prop === 'align-items') {
      const alignMap: Record<string, string> = {
        'flex-start': 'items-start',
        'flex-end': 'items-end',
        'center': 'items-center',
        'baseline': 'items-baseline',
        'stretch': 'items-stretch'
      };
      return { className: alignMap[value] || null, skipped: !alignMap[value] };
    }

    return { className: null, skipped: true, reason: `Unsupported flexbox property: ${prop}` };
  }

  private convertGap(value: string): ConversionResult {
    const px = this.extractPx(value);
    if (px === null) {
      return { className: null, skipped: true, reason: `Non-pixel gap value: ${value}` };
    }

    const spacing = this.pxToSpacing(px);
    if (!spacing) {
      return { className: null, skipped: true, reason: `No matching spacing for: ${value}` };
    }

    return { className: `gap-${spacing}`, skipped: false };
  }

  private convertWidth(value: string): ConversionResult {
    // Handle percentage values
    if (value === '100%') {
      return { className: 'w-full', skipped: false };
    }
    if (value === '50%') {
      return { className: 'w-1/2', skipped: false };
    }
    if (value === '33.333%' || value === '33.33%') {
      return { className: 'w-1/3', skipped: false };
    }
    if (value === '66.666%' || value === '66.67%') {
      return { className: 'w-2/3', skipped: false };
    }
    if (value === '25%') {
      return { className: 'w-1/4', skipped: false };
    }
    if (value === '75%') {
      return { className: 'w-3/4', skipped: false };
    }

    // Handle pixel values
    const px = this.extractPx(value);
    if (px !== null) {
      const spacing = this.pxToSpacing(px);
      if (spacing) {
        return { className: `w-${spacing}`, skipped: false };
      }
      // Try arbitrary values for larger sizes
      return { className: `w-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Complex width value: ${value}` };
  }

  private convertHeight(value: string): ConversionResult {
    // Handle percentage values
    if (value === '100%') {
      return { className: 'h-full', skipped: false };
    }
    if (value === '50%') {
      return { className: 'h-1/2', skipped: false };
    }

    // Handle pixel values
    const px = this.extractPx(value);
    if (px !== null) {
      const spacing = this.pxToSpacing(px);
      if (spacing) {
        return { className: `h-${spacing}`, skipped: false };
      }
      return { className: `h-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Complex height value: ${value}` };
  }

  private convertBackgroundColor(value: string): ConversionResult {
    // Handle named colors and hex
    const colorMap: Record<string, string> = {
      'transparent': 'bg-transparent',
      'white': 'bg-white',
      'black': 'bg-black',
      'red': 'bg-red-500',
      'blue': 'bg-blue-500',
      'green': 'bg-green-500',
      'gray': 'bg-gray-500'
    };

    if (colorMap[value]) {
      return { className: colorMap[value], skipped: false };
    }

    // Handle hex colors - use arbitrary values
    if (value.startsWith('#')) {
      return { className: `bg-[${value}]`, skipped: false };
    }

    // Handle rgb/rgba
    if (value.startsWith('rgb')) {
      return { className: `bg-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Complex background-color: ${value}` };
  }

  private convertTextColor(value: string): ConversionResult {
    const colorMap: Record<string, string> = {
      'transparent': 'text-transparent',
      'white': 'text-white',
      'black': 'text-black',
      'red': 'text-red-500',
      'blue': 'text-blue-500',
      'green': 'text-green-500',
      'gray': 'text-gray-500'
    };

    if (colorMap[value]) {
      return { className: colorMap[value], skipped: false };
    }

    if (value.startsWith('#')) {
      return { className: `text-[${value}]`, skipped: false };
    }

    if (value.startsWith('rgb')) {
      return { className: `text-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Complex color: ${value}` };
  }

  private convertBorderRadius(value: string): ConversionResult {
    const px = this.extractPx(value);
    
    if (px === null) {
      // Handle named values
      if (value === '50%') {
        return { className: 'rounded-full', skipped: false };
      }
      return { className: null, skipped: true, reason: `Complex border-radius: ${value}` };
    }

    // Map to Tailwind radius scale
    const radiusMap: Record<number, string> = {
      0: 'rounded-none',
      2: 'rounded-sm',
      4: 'rounded',
      6: 'rounded-md',
      8: 'rounded-lg',
      12: 'rounded-xl',
      16: 'rounded-2xl',
      24: 'rounded-3xl'
    };

    const closest = Object.keys(radiusMap)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - px) < Math.abs(prev - px) ? curr : prev
      );

    if (Math.abs(closest - px) / (px || 1) < 0.2) {
      return { className: radiusMap[closest], skipped: false };
    }

    // Use arbitrary value
    return { className: `rounded-[${value}]`, skipped: false };
  }

  convertMultiple(properties: CSSProperty[]): { classes: string[]; warnings: string[] } {
    const classes: string[] = [];
    const warnings: string[] = [];

    properties.forEach(({ property, value }) => {
      const result = this.convertProperty(property, value);
      
      if (result.skipped) {
        warnings.push(result.reason || `Skipped: ${property}: ${value}`);
        logger.verbose(`Skipped: ${property}: ${value} - ${result.reason}`);
      } else if (result.className) {
        classes.push(result.className);
        logger.verbose(`Converted: ${property}: ${value} → ${result.className}`);
      }
    });

    return { classes, warnings };
  }
}
