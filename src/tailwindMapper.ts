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

export interface MultiConversionResult {
  classes: string[];
  warnings: string[];
  cssProperties: string[];
}

interface ParsedSpacingValue {
  value: string;
  px: number | null;
  spacingKey: string | null;
}

export class TailwindMapper {
  private config: TailwindConfig;
  private spacingScale: Map<number, string>;
  private maxWidthScale: Map<string, string>;
  private fontSizeScale: Map<number, string>;
  private lineHeightScale: Map<string, string>;
  private letterSpacingScale: Map<string, string>;
  private zIndexScale: Map<number, string>;
  private opacityScale: Map<number, string>;

  constructor(config: TailwindConfig) {
    this.config = config;
    this.spacingScale = this.buildSpacingScale();
    this.maxWidthScale = this.buildMaxWidthScale();
    this.fontSizeScale = this.buildFontSizeScale();
    this.lineHeightScale = this.buildLineHeightScale();
    this.letterSpacingScale = this.buildLetterSpacingScale();
    this.zIndexScale = this.buildZIndexScale();
    this.opacityScale = this.buildOpacityScale();
  }

  private buildSpacingScale(): Map<number, string> {
    const scale = new Map<number, string>();
    const spacing = this.config.theme?.spacing || {};

    Object.entries(spacing).forEach(([key, value]) => {
      const remMatch = value.match(/([\d.]+)rem/);
      if (remMatch) {
        const pixels = parseFloat(remMatch[1]) * 16;
        scale.set(Math.round(pixels), key);
      }

      const pxMatch = value.match(/([\d.]+)px/);
      if (pxMatch) {
        scale.set(Math.round(parseFloat(pxMatch[1])), key);
      }
    });

    return scale;
  }

  private buildMaxWidthScale(): Map<string, string> {
    const scale = new Map<string, string>();
    const maxWidth = this.config.theme?.maxWidth || {};

    Object.entries(maxWidth).forEach(([key, value]) => {
      if (typeof value === 'string') {
        scale.set(value, key);
      }
    });

    scale.set('100%', 'full');
    scale.set('min-content', 'min');
    scale.set('max-content', 'max');
    scale.set('fit-content', 'fit');

    return scale;
  }

  private buildFontSizeScale(): Map<number, string> {
    const scale = new Map<number, string>();
    const fontSize = this.config.theme?.fontSize || {};

    Object.entries(fontSize).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const remMatch = value.match(/([\d.]+)rem/);
        if (remMatch) {
          scale.set(Math.round(parseFloat(remMatch[1]) * 16), key);
        }
        const pxMatch = value.match(/([\d.]+)px/);
        if (pxMatch) {
          scale.set(Math.round(parseFloat(pxMatch[1])), key);
        }
      } else if (Array.isArray(value) && typeof value[0] === 'string') {
        const remMatch = value[0].match(/([\d.]+)rem/);
        if (remMatch) {
          scale.set(Math.round(parseFloat(remMatch[1]) * 16), key);
        }
        const pxMatch = value[0].match(/([\d.]+)px/);
        if (pxMatch) {
          scale.set(Math.round(parseFloat(pxMatch[1])), key);
        }
      }
    });

    return scale;
  }

  private buildLineHeightScale(): Map<string, string> {
    const scale = new Map<string, string>();
    const lineHeight = this.config.theme?.lineHeight || {};

    Object.entries(lineHeight).forEach(([key, value]) => {
      if (typeof value === 'string') {
        scale.set(value, key);
      }
    });

    scale.set('1', 'none');
    scale.set('1.25', 'tight');
    scale.set('1.375', 'snug');
    scale.set('1.5', 'normal');
    scale.set('1.625', 'relaxed');
    scale.set('2', 'loose');

    return scale;
  }

  private buildLetterSpacingScale(): Map<string, string> {
    const scale = new Map<string, string>();
    const letterSpacing = this.config.theme?.letterSpacing || {};

    Object.entries(letterSpacing).forEach(([key, value]) => {
      if (typeof value === 'string') {
        scale.set(value, key);
      }
    });

    return scale;
  }

  private buildZIndexScale(): Map<number, string> {
    const scale = new Map<number, string>();
    const zIndex = this.config.theme?.zIndex || {};

    Object.entries(zIndex).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
          scale.set(num, key);
        }
      }
    });

    scale.set(0, '0');
    scale.set(10, '10');
    scale.set(20, '20');
    scale.set(30, '30');
    scale.set(40, '40');
    scale.set(50, '50');

    return scale;
  }

  private buildOpacityScale(): Map<number, string> {
    const scale = new Map<number, string>();
    const opacity = this.config.theme?.opacity || {};

    Object.entries(opacity).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(num)) {
          scale.set(Math.round(num * 100), key);
        }
      }
    });

    for (let i = 0; i <= 100; i += 5) {
      if (!scale.has(i)) {
        scale.set(i, String(i));
      }
    }

    return scale;
  }

  private pxToSpacing(px: number): string | null {
    if (this.spacingScale.has(px)) {
      return this.spacingScale.get(px)!;
    }

    let closestKey: number | null = null;
    let closestDiff: number = Infinity;
    
    this.spacingScale.forEach((_, key) => {
      const diff = Math.abs(key - px);
      if (diff < closestDiff) {
        closestKey = key;
        closestDiff = diff;
      }
    });

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

    const remMatch = value.match(/^([\d.]+)rem$/);
    if (remMatch) {
      return parseFloat(remMatch[1]) * 16;
    }

    return null;
  }

  private parseSpacingValue(value: string): ParsedSpacingValue {
    const px = this.extractPx(value);
    const spacingKey = px !== null ? this.pxToSpacing(px) : null;

    return {
      value,
      px,
      spacingKey
    };
  }

  private buildSpacingUtility(prefix: string, parsed: ParsedSpacingValue): string {
    if (parsed.spacingKey) {
      return `${prefix}-${parsed.spacingKey}`;
    }
    return `${prefix}-[${parsed.value}]`;
  }

  private tokenizeValue(value: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let parenDepth = 0;
    let inFunction = false;

    for (let i = 0; i < value.length; i++) {
      const char = value[i];

      if (char === '(') {
        parenDepth++;
        inFunction = true;
        current += char;
      } else if (char === ')') {
        parenDepth--;
        current += char;
        if (parenDepth === 0) {
          inFunction = false;
        }
      } else if (char === ' ' && parenDepth === 0) {
        if (current.trim()) {
          tokens.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  convertProperty(property: string, value: string): ConversionResult {
    const normalizedProp = property.toLowerCase().trim();
    const normalizedValue = value.toLowerCase().trim();

    logger.verbose(`Converting: ${normalizedProp}: ${normalizedValue}`);

    if (normalizedProp.startsWith('--')) {
      return { className: null, skipped: true, reason: `CSS variable declaration: ${property}` };
    }

    if (normalizedProp === 'display') {
      return this.convertDisplay(normalizedValue);
    }

    if (normalizedProp === 'position') {
      return { className: normalizedValue, skipped: false };
    }

    if (normalizedProp.startsWith('margin')) {
      return this.convertMargin(normalizedProp, normalizedValue);
    }

    if (normalizedProp.startsWith('padding')) {
      return this.convertPadding(normalizedProp, normalizedValue);
    }

    if (normalizedProp === 'max-width' || normalizedProp === 'min-width') {
      return this.convertDimensionConstraint(normalizedProp, normalizedValue);
    }

    if (normalizedProp === 'max-height' || normalizedProp === 'min-height') {
      return this.convertDimensionConstraint(normalizedProp, normalizedValue);
    }

    if (normalizedProp === 'width') {
      return this.convertWidth(normalizedValue);
    }

    if (normalizedProp === 'height') {
      return this.convertHeight(normalizedValue);
    }

    if (normalizedProp === 'font-weight') {
      return this.convertFontWeight(normalizedValue);
    }

    if (normalizedProp === 'font-size') {
      return this.convertFontSize(normalizedValue);
    }

    if (normalizedProp === 'text-align') {
      return { className: `text-${normalizedValue}`, skipped: false };
    }

    if (normalizedProp === 'text-decoration') {
      return this.convertTextDecoration(normalizedValue);
    }

    if (normalizedProp === 'text-transform') {
      return this.convertTextTransform(normalizedValue);
    }

    if (normalizedProp === 'letter-spacing') {
      return this.convertLetterSpacing(normalizedValue);
    }

    if (normalizedProp === 'line-height') {
      return this.convertLineHeight(normalizedValue);
    }

    if (normalizedProp.startsWith('flex') || 
        normalizedProp.startsWith('justify') || 
        normalizedProp.startsWith('align')) {
      return this.convertFlexbox(normalizedProp, normalizedValue);
    }

    if (normalizedProp === 'gap') {
      return this.convertGap(normalizedValue);
    }

    if (normalizedProp === 'background-color') {
      return this.convertBackgroundColor(normalizedValue);
    }

    if (normalizedProp === 'background') {
      const result = this.convertBackgroundShorthand(normalizedValue);
      if (result.classes.length > 0) {
        return { className: result.classes[0], skipped: false };
      }
      return { className: null, skipped: true, reason: result.warnings[0] || `Could not convert background: ${normalizedValue}` };
    }

    if (normalizedProp === 'color') {
      return this.convertTextColor(normalizedValue);
    }

    if (normalizedProp === 'border-radius') {
      return this.convertBorderRadius(normalizedValue);
    }

    if (normalizedProp.startsWith('border')) {
      return this.convertBorder(normalizedProp, normalizedValue);
    }

    if (normalizedProp === 'aspect-ratio') {
      return this.convertAspectRatio(normalizedValue);
    }

    if (normalizedProp === 'overflow' || normalizedProp === 'overflow-x' || normalizedProp === 'overflow-y') {
      return this.convertOverflow(normalizedProp, normalizedValue);
    }

    if (normalizedProp === 'object-fit') {
      return this.convertObjectFit(normalizedValue);
    }

    if (normalizedProp === 'object-position') {
      return this.convertObjectPosition(normalizedValue);
    }

    if (normalizedProp === 'opacity') {
      return this.convertOpacity(normalizedValue);
    }

    if (normalizedProp === 'word-break') {
      return this.convertWordBreak(normalizedValue);
    }

    if (normalizedProp === 'z-index') {
      return this.convertZIndex(normalizedValue);
    }

    return {
      className: null,
      skipped: true,
      reason: `Unsupported property: ${property}`
    };
  }

  convertPropertyWithMultiple(property: string, value: string): MultiConversionResult {
    const normalizedProp = property.toLowerCase().trim();
    const normalizedValue = value.toLowerCase().trim();

    if (normalizedProp === 'margin' || normalizedProp === 'padding') {
      return this.convertSpacingShorthand(normalizedProp, normalizedValue);
    }

    if (normalizedProp === 'border') {
      return this.convertBorderShorthand(normalizedValue);
    }

    if (normalizedProp.startsWith('border-') && 
        ['border-top', 'border-right', 'border-bottom', 'border-left'].includes(normalizedProp)) {
      return this.convertDirectionalBorderShorthand(normalizedProp, normalizedValue);
    }

    if (normalizedProp === 'flex') {
      return this.convertFlexShorthand(normalizedValue);
    }

    if (normalizedProp === 'background') {
      return this.convertBackgroundShorthand(normalizedValue);
    }

    const result = this.convertProperty(property, value);
    return {
      classes: result.className ? [result.className] : [],
      warnings: result.reason ? [result.reason] : [],
      cssProperties: result.className ? [property] : []
    };
  }

  private convertBackgroundShorthand(value: string): MultiConversionResult {
    const classes: string[] = [];
    const warnings: string[] = [];
    const cssProperties: string[] = [];

    if (value === 'transparent') {
      classes.push('bg-transparent');
      cssProperties.push('background-color');
      return { classes, warnings, cssProperties };
    }

    if (value === 'none') {
      classes.push('bg-none');
      cssProperties.push('background-image');
      return { classes, warnings, cssProperties };
    }

    const colorValue = this.extractColorFromBackground(value);
    
    if (colorValue) {
      if (colorValue.startsWith('#')) {
        classes.push(`bg-[${colorValue}]`);
      } else if (colorValue.startsWith('rgb')) {
        classes.push(`bg-[${colorValue}]`);
      } else if (colorValue.startsWith('hsl')) {
        classes.push(`bg-[${colorValue}]`);
      } else {
        const colorMap: Record<string, string> = {
          'white': 'bg-white',
          'black': 'bg-black',
          'red': 'bg-red-500',
          'blue': 'bg-blue-500',
          'green': 'bg-green-500',
          'gray': 'bg-gray-500',
          'transparent': 'bg-transparent'
        };
        
        if (colorMap[colorValue]) {
          classes.push(colorMap[colorValue]);
        } else {
          classes.push(`bg-${colorValue}`);
        }
      }
      cssProperties.push('background-color');
    } else {
      warnings.push(`Cannot extract color from background shorthand: ${value}`);
    }

    return { classes, warnings, cssProperties };
  }

  private extractColorFromBackground(value: string): string | null {
    const tokens = this.tokenizeValue(value);
    
    for (const token of tokens) {
      if (token.startsWith('#')) {
        return token;
      }
      
      if (token.startsWith('rgb') || token.startsWith('hsl')) {
        return token;
      }
      
      if (token.startsWith('url(') || token === 'none') {
        continue;
      }
      
      if (/^(linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient|repeating-conic-gradient)\(/i.test(token)) {
        continue;
      }
      
      if (/^(repeat|no-repeat|repeat-x|repeat-y|space|round)$/i.test(token)) {
        continue;
      }
      
      if (/^(scroll|fixed|local)$/i.test(token)) {
        continue;
      }
      
      if (/^(center|top|bottom|left|right|\d+%|\d+px)/i.test(token)) {
        continue;
      }
      
      if (/^(cover|contain)$/i.test(token)) {
        continue;
      }
      
      if (/^(border-box|padding-box|content-box)$/i.test(token)) {
        continue;
      }
      
      if (/^(clip|border|padding|content)$/i.test(token)) {
        continue;
      }
      
      if (/^\d/.test(token) && !token.includes('gradient')) {
        continue;
      }
      
      if (/^(transparent|white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|brown|cyan|magenta|olive|lime|aqua|navy|teal|maroon|silver|fuchsia)$/i.test(token)) {
        return token;
      }
      
      if (/^(aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|blanchedalmond|blueviolet|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|gainsboro|ghostwhite|gold|goldenrod|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|limegreen|linen|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|oldlace|olivedrab|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|plum|powderblue|rebeccapurple|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|thistle|tomato|turquoise|violet|wheat|whitesmoke|yellowgreen)$/i.test(token)) {
        return token;
      }
    }
    
    return null;
  }

  private convertSpacingShorthand(prop: string, value: string): MultiConversionResult {
    const tokens = this.tokenizeValue(value);
    const classes: string[] = [];
    const warnings: string[] = [];
    const cssProperties: string[] = [];
    const prefix = prop === 'margin' ? 'm' : 'p';
    const propPrefix = prop === 'margin' ? 'margin' : 'padding';

    if (tokens.length === 0) {
      return { classes, warnings: ['Empty spacing value'], cssProperties };
    }

    const parsedTokens = tokens.map(t => this.parseSpacingValue(t));

    if (tokens.length === 1) {
      const parsed = parsedTokens[0];
      if (parsed.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[0])) {
        classes.push(this.buildSpacingUtility(prefix, parsed));
        cssProperties.push(prop);
      } else {
        warnings.push(`Invalid ${prop} value: ${tokens[0]}`);
      }
    } else if (tokens.length === 2) {
      const [vertical, horizontal] = parsedTokens;
      
      if (vertical.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[0])) {
        classes.push(this.buildSpacingUtility(`${prefix}y`, vertical));
        cssProperties.push(`${propPrefix}-y`);
      } else {
        warnings.push(`Invalid ${prop} vertical value: ${tokens[0]}`);
      }

      if (horizontal.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[1])) {
        classes.push(this.buildSpacingUtility(`${prefix}x`, horizontal));
        cssProperties.push(`${propPrefix}-x`);
      } else {
        warnings.push(`Invalid ${prop} horizontal value: ${tokens[1]}`);
      }
    } else if (tokens.length === 3) {
      const [top, horizontal, bottom] = parsedTokens;

      if (top.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[0])) {
        classes.push(this.buildSpacingUtility(`${prefix}t`, top));
        cssProperties.push(`${propPrefix}-top`);
      } else {
        warnings.push(`Invalid ${prop}-top value: ${tokens[0]}`);
      }

      if (horizontal.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[1])) {
        classes.push(this.buildSpacingUtility(`${prefix}x`, horizontal));
        cssProperties.push(`${propPrefix}-x`);
      } else {
        warnings.push(`Invalid ${prop} horizontal value: ${tokens[1]}`);
      }

      if (bottom.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[2])) {
        classes.push(this.buildSpacingUtility(`${prefix}b`, bottom));
        cssProperties.push(`${propPrefix}-bottom`);
      } else {
        warnings.push(`Invalid ${prop}-bottom value: ${tokens[2]}`);
      }
    } else if (tokens.length >= 4) {
      const [top, right, bottom, left] = parsedTokens;

      if (top.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[0])) {
        classes.push(this.buildSpacingUtility(`${prefix}t`, top));
        cssProperties.push(`${propPrefix}-top`);
      } else {
        warnings.push(`Invalid ${prop}-top value: ${tokens[0]}`);
      }

      if (right.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[1])) {
        classes.push(this.buildSpacingUtility(`${prefix}r`, right));
        cssProperties.push(`${propPrefix}-right`);
      } else {
        warnings.push(`Invalid ${prop}-right value: ${tokens[1]}`);
      }

      if (bottom.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[2])) {
        classes.push(this.buildSpacingUtility(`${prefix}b`, bottom));
        cssProperties.push(`${propPrefix}-bottom`);
      } else {
        warnings.push(`Invalid ${prop}-bottom value: ${tokens[2]}`);
      }

      if (left.px !== null || /^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(tokens[3])) {
        classes.push(this.buildSpacingUtility(`${prefix}l`, left));
        cssProperties.push(`${propPrefix}-left`);
      } else {
        warnings.push(`Invalid ${prop}-left value: ${tokens[3]}`);
      }
    }

    return { classes, warnings, cssProperties };
  }

  private convertDisplay(value: string): ConversionResult {
    const displayMap: Record<string, string> = {
      'flex': 'flex',
      'block': 'block',
      'inline': 'inline',
      'inline-block': 'inline-block',
      'grid': 'grid',
      'inline-flex': 'inline-flex',
      'inline-grid': 'inline-grid',
      'none': 'hidden',
      'contents': 'contents',
      'table': 'table',
      'table-cell': 'table-cell',
      'table-row': 'table-row',
      'flow-root': 'flow-root'
    };

    if (displayMap[value]) {
      return { className: displayMap[value], skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown display value: ${value}` };
  }

  private convertMargin(prop: string, value: string): ConversionResult {
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
    
    const isNegative = value.startsWith('-');
    const absoluteValue = isNegative ? value.slice(1) : value;
    const px = this.extractPx(absoluteValue);
    
    if (value === 'auto') {
      return { className: `${prefix}-auto`, skipped: false };
    }
    
    if (px === null) {
      if (/^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(value)) {
        return { className: `${prefix}-[${value}]`, skipped: false };
      }
      return { className: null, skipped: true, reason: `Non-pixel margin value: ${value}` };
    }

    const spacing = this.pxToSpacing(px);
    if (!spacing) {
      return { className: `${prefix}-[${value}]`, skipped: false };
    }

    return { className: isNegative ? `-${prefix}-${spacing}` : `${prefix}-${spacing}`, skipped: false };
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
      if (/^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(value)) {
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

  private convertDimensionConstraint(prop: string, value: string): ConversionResult {
    const prefixMap: Record<string, string> = {
      'max-width': 'max-w',
      'min-width': 'min-w',
      'max-height': 'max-h',
      'min-height': 'min-h'
    };
    const prefix = prefixMap[prop];

    if (value === '100%') {
      return { className: `${prefix}-full`, skipped: false };
    }
    if (value === '0' || value === '0px') {
      return { className: `${prefix}-0`, skipped: false };
    }
    if (value === 'none') {
      return { className: `${prefix}-none`, skipped: false };
    }

    if (prop === 'max-width') {
      if (value === 'min-content') {
        return { className: 'max-w-min', skipped: false };
      }
      if (value === 'max-content') {
        return { className: 'max-w-max', skipped: false };
      }
      if (value === 'fit-content') {
        return { className: 'max-w-fit', skipped: false };
      }

      const maxWProseSizes: Record<string, string> = {
        '65ch': 'prose',
        '80ch': 'prose-lg'
      };
      if (maxWProseSizes[value]) {
        return { className: `max-w-${maxWProseSizes[value]}`, skipped: false };
      }

      if (this.maxWidthScale.has(value)) {
        return { className: `max-w-${this.maxWidthScale.get(value)}`, skipped: false };
      }
    }

    const px = this.extractPx(value);
    if (px !== null) {
      const spacing = this.pxToSpacing(px);
      if (spacing) {
        return { className: `${prefix}-${spacing}`, skipped: false };
      }
    }

    if (/^\d+(\.\d+)?(px|rem|em|%|ch|vw|vh)?$/.test(value)) {
      return { className: `${prefix}-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Complex ${prop} value: ${value}` };
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
      if (this.fontSizeScale.has(px)) {
        return { className: `text-${this.fontSizeScale.get(px)}`, skipped: false };
      }
      
      return { className: `text-[${value}]`, skipped: false };
    }

    if (/^\d+(\.\d+)?(px|rem|em|%)?$/.test(value)) {
      return { className: `text-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Non-standard font-size: ${value}` };
  }

  private convertTextDecoration(value: string): ConversionResult {
    const decorationMap: Record<string, string> = {
      'underline': 'underline',
      'line-through': 'line-through',
      'none': 'no-underline',
      'no-underline': 'no-underline'
    };

    if (decorationMap[value]) {
      return { className: decorationMap[value], skipped: false };
    }

    logger.warn(`Unsupported text-decoration value: ${value}`);
    return { className: null, skipped: true, reason: `Unsupported text-decoration: ${value}` };
  }

  private convertTextTransform(value: string): ConversionResult {
    const transformMap: Record<string, string> = {
      'uppercase': 'uppercase',
      'lowercase': 'lowercase',
      'capitalize': 'capitalize',
      'none': 'normal-case',
      'initial': 'normal-case'
    };

    if (transformMap[value]) {
      return { className: transformMap[value], skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown text-transform: ${value}` };
  }

  private convertLetterSpacing(value: string): ConversionResult {
    if (this.letterSpacingScale.has(value)) {
      return { className: `tracking-${this.letterSpacingScale.get(value)}`, skipped: false };
    }

    const knownMappings: Record<string, string> = {
      '-0.025em': 'tight',
      '-0.05em': 'tighter',
      '0.025em': 'wide',
      '0.05em': 'wider',
      '0.1em': 'widest',
      '0em': 'normal'
    };

    if (knownMappings[value]) {
      return { className: `tracking-${knownMappings[value]}`, skipped: false };
    }

    if (/^-?\d+(\.\d+)?(em|px|rem)?$/.test(value)) {
      return { className: `tracking-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown letter-spacing: ${value}` };
  }

  private convertLineHeight(value: string): ConversionResult {
    if (this.lineHeightScale.has(value)) {
      return { className: `leading-${this.lineHeightScale.get(value)}`, skipped: false };
    }

    const knownMappings: Record<string, string> = {
      '1': 'none',
      '1.25': 'tight',
      '1.375': 'snug',
      '1.5': 'normal',
      '1.625': 'relaxed',
      '2': 'loose'
    };

    if (knownMappings[value]) {
      return { className: `leading-${knownMappings[value]}`, skipped: false };
    }

    if (/^\d+(\.\d+)?$/.test(value)) {
      return { className: `leading-[${value}]`, skipped: false };
    }

    if (/^\d+(\.\d+)?(px|rem|em)?$/.test(value)) {
      return { className: `leading-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown line-height: ${value}` };
  }

  private convertFlexbox(prop: string, value: string): ConversionResult {
    if (prop === 'flex-direction') {
      const dirMap: Record<string, string> = {
        'row': 'flex-row',
        'row-reverse': 'flex-row-reverse',
        'column': 'flex-col',
        'column-reverse': 'flex-col-reverse'
      };
      return { className: dirMap[value] || null, skipped: !dirMap[value] };
    }

    if (prop === 'flex-wrap') {
      const wrapMap: Record<string, string> = {
        'wrap': 'flex-wrap',
        'nowrap': 'flex-nowrap',
        'wrap-reverse': 'flex-wrap-reverse'
      };
      return { className: wrapMap[value] || null, skipped: !wrapMap[value] };
    }

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

    if (prop === 'align-content') {
      const alignMap: Record<string, string> = {
        'flex-start': 'content-start',
        'flex-end': 'content-end',
        'center': 'content-center',
        'space-between': 'content-between',
        'space-around': 'content-around',
        'stretch': 'content-stretch'
      };
      return { className: alignMap[value] || null, skipped: !alignMap[value] };
    }

    if (prop === 'align-self') {
      const alignSelfMap: Record<string, string> = {
        'auto': 'self-auto',
        'flex-start': 'self-start',
        'flex-end': 'self-end',
        'center': 'self-center',
        'stretch': 'self-stretch',
        'baseline': 'self-baseline'
      };
      return { className: alignSelfMap[value] || null, skipped: !alignSelfMap[value] };
    }

    if (prop === 'flex-grow') {
      if (value === '0') {
        return { className: 'grow-0', skipped: false };
      }
      if (value === '1') {
        return { className: 'grow', skipped: false };
      }
      return { className: `grow-[${value}]`, skipped: false };
    }

    if (prop === 'flex-shrink') {
      if (value === '0') {
        return { className: 'shrink-0', skipped: false };
      }
      if (value === '1') {
        return { className: 'shrink', skipped: false };
      }
      return { className: `shrink-[${value}]`, skipped: false };
    }

    if (prop === 'flex-basis') {
      if (value === 'auto') {
        return { className: 'basis-auto', skipped: false };
      }
      if (value === '0' || value === '0px') {
        return { className: 'basis-0', skipped: false };
      }
      const px = this.extractPx(value);
      if (px !== null) {
        const spacing = this.pxToSpacing(px);
        if (spacing) {
          return { className: `basis-${spacing}`, skipped: false };
        }
      }
      if (/^\d+(\.\d+)?(px|rem|em|%|vw|vh)?$/.test(value)) {
        return { className: `basis-[${value}]`, skipped: false };
      }
    }

    return { className: null, skipped: true, reason: `Unsupported flexbox property: ${prop}` };
  }

  private convertFlexShorthand(value: string): MultiConversionResult {
    const classes: string[] = [];
    const warnings: string[] = [];
    const cssProperties: string[] = [];

    if (value === '1') {
      classes.push('flex-1');
      cssProperties.push('flex');
      return { classes, warnings, cssProperties };
    }
    if (value === 'auto') {
      classes.push('flex-auto');
      cssProperties.push('flex');
      return { classes, warnings, cssProperties };
    }
    if (value === 'none') {
      classes.push('flex-none');
      cssProperties.push('flex');
      return { classes, warnings, cssProperties };
    }
    if (value === 'initial') {
      classes.push('flex-initial');
      cssProperties.push('flex');
      return { classes, warnings, cssProperties };
    }

    const tokens = this.tokenizeValue(value);
    if (tokens.length === 3) {
      const [grow, shrink, basis] = tokens;
      
      if (grow === '1' && shrink === '1' && basis === '0%') {
        classes.push('flex-1');
        cssProperties.push('flex');
      } else if (grow === '1' && shrink === '1' && basis === 'auto') {
        classes.push('flex-auto');
        cssProperties.push('flex');
      } else if (grow === '0' && shrink === '1' && basis === 'auto') {
        classes.push('flex-initial');
        cssProperties.push('flex');
      } else if (grow === '0' && shrink === '0' && basis === 'auto') {
        classes.push('flex-none');
        cssProperties.push('flex');
      } else {
        classes.push(`flex-[${value}]`);
        cssProperties.push('flex');
      }

      return { classes, warnings, cssProperties };
    }

    if (tokens.length === 1 || tokens.length === 2) {
      classes.push(`flex-[${value}]`);
      cssProperties.push('flex');
      return { classes, warnings, cssProperties };
    }

    warnings.push(`Complex flex shorthand: ${value}`);
    return { classes, warnings, cssProperties };
  }

  private convertGap(value: string): ConversionResult {
    const px = this.extractPx(value);
    if (px === null) {
      if (/^\d+(\.\d+)?(px|rem|em|%)?$/.test(value)) {
        return { className: `gap-[${value}]`, skipped: false };
      }
      return { className: null, skipped: true, reason: `Non-pixel gap value: ${value}` };
    }

    const spacing = this.pxToSpacing(px);
    if (!spacing) {
      return { className: `gap-[${value}]`, skipped: false };
    }

    return { className: `gap-${spacing}`, skipped: false };
  }

  private convertWidth(value: string): ConversionResult {
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
    if (value === 'auto') {
      return { className: 'w-auto', skipped: false };
    }
    if (value === 'fit-content') {
      return { className: 'w-fit', skipped: false };
    }
    if (value === 'min-content') {
      return { className: 'w-min', skipped: false };
    }
    if (value === 'max-content') {
      return { className: 'w-max', skipped: false };
    }

    const px = this.extractPx(value);
    if (px !== null) {
      const spacing = this.pxToSpacing(px);
      if (spacing) {
        return { className: `w-${spacing}`, skipped: false };
      }
      return { className: `w-[${value}]`, skipped: false };
    }

    if (/^\d+(\.\d+)?(px|rem|em|%|vw)?$/.test(value)) {
      return { className: `w-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Complex width value: ${value}` };
  }

  private convertHeight(value: string): ConversionResult {
    if (value === '100%') {
      return { className: 'h-full', skipped: false };
    }
    if (value === '50%') {
      return { className: 'h-1/2', skipped: false };
    }
    if (value === 'auto') {
      return { className: 'h-auto', skipped: false };
    }
    if (value === 'fit-content') {
      return { className: 'h-fit', skipped: false };
    }
    if (value === 'min-content') {
      return { className: 'h-min', skipped: false };
    }
    if (value === 'max-content') {
      return { className: 'h-max', skipped: false };
    }
    if (value === '100vh') {
      return { className: 'h-screen', skipped: false };
    }

    const px = this.extractPx(value);
    if (px !== null) {
      const spacing = this.pxToSpacing(px);
      if (spacing) {
        return { className: `h-${spacing}`, skipped: false };
      }
      return { className: `h-[${value}]`, skipped: false };
    }

    if (/^\d+(\.\d+)?(px|rem|em|%|vh)?$/.test(value)) {
      return { className: `h-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Complex height value: ${value}` };
  }

  private convertBackgroundColor(value: string): ConversionResult {
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

    if (value.startsWith('#')) {
      return { className: `bg-[${value}]`, skipped: false };
    }

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
      if (value === '50%') {
        return { className: 'rounded-full', skipped: false };
      }
      if (/^\d+(\.\d+)?(px|rem|em|%)?$/.test(value)) {
        return { className: `rounded-[${value}]`, skipped: false };
      }
      return { className: null, skipped: true, reason: `Complex border-radius: ${value}` };
    }

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

    return { className: `rounded-[${value}]`, skipped: false };
  }

  private convertBorder(prop: string, value: string): ConversionResult {
    if (prop === 'border-width') {
      const widthMap: Record<string, string> = {
        '0': 'border-0',
        '1px': 'border',
        '2px': 'border-2',
        '4px': 'border-4',
        '8px': 'border-8'
      };

      if (widthMap[value]) {
        return { className: widthMap[value], skipped: false };
      }

      if (/^\d+(\.\d+)?(px|rem|em)?$/.test(value)) {
        return { className: `border-[${value}]`, skipped: false };
      }

      return { className: null, skipped: true, reason: `Unknown border-width: ${value}` };
    }

    if (prop === 'border-style') {
      const styleMap: Record<string, string> = {
        'solid': '',
        'dashed': 'border-dashed',
        'dotted': 'border-dotted',
        'double': 'border-double',
        'hidden': 'border-hidden',
        'none': 'border-none'
      };

      if (value === 'solid') {
        return { className: null, skipped: false };
      }

      if (styleMap[value]) {
        return { className: styleMap[value], skipped: false };
      }

      return { className: null, skipped: true, reason: `Unknown border-style: ${value}` };
    }

    if (prop === 'border-color') {
      if (value.startsWith('#')) {
        return { className: `border-[${value}]`, skipped: false };
      }
      if (value.startsWith('rgb')) {
        return { className: `border-[${value}]`, skipped: false };
      }

      const colorMap: Record<string, string> = {
        'transparent': 'border-transparent',
        'white': 'border-white',
        'black': 'border-black',
        'red': 'border-red-500',
        'blue': 'border-blue-500',
        'green': 'border-green-500',
        'gray': 'border-gray-500'
      };

      if (colorMap[value]) {
        return { className: colorMap[value], skipped: false };
      }

      return { className: `border-${value}`, skipped: false };
    }

    if (prop === 'border-top-width' || prop === 'border-right-width' || 
        prop === 'border-bottom-width' || prop === 'border-left-width') {
      const sideMap: Record<string, string> = {
        'border-top-width': 'border-t',
        'border-right-width': 'border-r',
        'border-bottom-width': 'border-b',
        'border-left-width': 'border-l'
      };
      const prefix = sideMap[prop];

      const widthMap: Record<string, string> = {
        '0': `${prefix}-0`,
        '1px': prefix,
        '2px': `${prefix}-2`,
        '4px': `${prefix}-4`,
        '8px': `${prefix}-8`
      };

      if (widthMap[value]) {
        return { className: widthMap[value], skipped: false };
      }

      if (/^\d+(\.\d+)?(px|rem|em)?$/.test(value)) {
        return { className: `${prefix}-[${value}]`, skipped: false };
      }

      return { className: null, skipped: true, reason: `Unknown ${prop}: ${value}` };
    }

    return { className: null, skipped: true, reason: `Unknown border property: ${prop}` };
  }

  private convertBorderShorthand(value: string): MultiConversionResult {
    const classes: string[] = [];
    const warnings: string[] = [];
    const cssProperties: string[] = [];

    const tokens = this.tokenizeValue(value);

    let width: string | null = null;
    let style: string | null = null;
    let color: string | null = null;

    for (const token of tokens) {
      if (/^\d+(\.\d+)?(px|rem|em|thin|medium|thick)?$/.test(token) || 
          token === 'thin' || token === 'medium' || token === 'thick') {
        width = token;
      } else if (['solid', 'dashed', 'dotted', 'double', 'hidden', 'none', 'groove', 'ridge', 'inset', 'outset'].includes(token)) {
        style = token;
      } else {
        color = token;
      }
    }

    if (width) {
      const widthMap: Record<string, string> = {
        '0': 'border-0',
        '1px': 'border',
        '2px': 'border-2',
        '4px': 'border-4',
        '8px': 'border-8',
        'thin': 'border',
        'medium': 'border-2',
        'thick': 'border-4'
      };

      if (widthMap[width]) {
        classes.push(widthMap[width]);
      } else {
        classes.push(`border-[${width}]`);
      }
      cssProperties.push('border-width');
    }

    if (style && style !== 'solid') {
      const styleMap: Record<string, string> = {
        'dashed': 'border-dashed',
        'dotted': 'border-dotted',
        'double': 'border-double',
        'hidden': 'border-hidden',
        'none': 'border-none'
      };

      if (styleMap[style]) {
        classes.push(styleMap[style]);
        cssProperties.push('border-style');
      } else {
        warnings.push(`Unsupported border-style: ${style}`);
      }
    }

    if (color) {
      if (color.startsWith('#')) {
        classes.push(`border-[${color}]`);
      } else if (color.startsWith('rgb')) {
        classes.push(`border-[${color}]`);
      } else {
        const colorMap: Record<string, string> = {
          'transparent': 'border-transparent',
          'white': 'border-white',
          'black': 'border-black'
        };

        if (colorMap[color]) {
          classes.push(colorMap[color]);
        } else {
          classes.push(`border-${color}`);
        }
      }
      cssProperties.push('border-color');
    }

    return { classes, warnings, cssProperties };
  }

  private convertDirectionalBorderShorthand(prop: string, value: string): MultiConversionResult {
    const classes: string[] = [];
    const warnings: string[] = [];
    const cssProperties: string[] = [];

    const sideMap: Record<string, { prefix: string; widthProp: string; colorProp: string }> = {
      'border-top': { prefix: 'border-t', widthProp: 'border-top-width', colorProp: 'border-top-color' },
      'border-right': { prefix: 'border-r', widthProp: 'border-right-width', colorProp: 'border-right-color' },
      'border-bottom': { prefix: 'border-b', widthProp: 'border-bottom-width', colorProp: 'border-bottom-color' },
      'border-left': { prefix: 'border-l', widthProp: 'border-left-width', colorProp: 'border-left-color' }
    };

    const side = sideMap[prop];
    if (!side) {
      return { classes, warnings: [`Unknown directional border: ${prop}`], cssProperties };
    }

    const tokens = this.tokenizeValue(value);

    let width: string | null = null;
    let style: string | null = null;
    let color: string | null = null;

    for (const token of tokens) {
      if (/^\d+(\.\d+)?(px|rem|em|thin|medium|thick)?$/.test(token) || 
          token === 'thin' || token === 'medium' || token === 'thick') {
        width = token;
      } else if (['solid', 'dashed', 'dotted', 'double', 'hidden', 'none'].includes(token)) {
        style = token;
      } else {
        color = token;
      }
    }

    if (width) {
      const widthMap: Record<string, string> = {
        '0': `${side.prefix}-0`,
        '1px': side.prefix,
        '2px': `${side.prefix}-2`,
        '4px': `${side.prefix}-4`,
        '8px': `${side.prefix}-8`
      };

      if (widthMap[width]) {
        classes.push(widthMap[width]);
      } else {
        classes.push(`${side.prefix}-[${width}]`);
      }
      cssProperties.push(side.widthProp);
    }

    if (style && style !== 'solid') {
      warnings.push(`Border style '${style}' for ${prop} applies to all borders`);
    }

    if (color) {
      if (color.startsWith('#')) {
        classes.push(`${side.prefix}-[${color}]`);
      } else if (color.startsWith('rgb')) {
        classes.push(`${side.prefix}-[${color}]`);
      } else {
        classes.push(`${side.prefix}-${color}`);
      }
      cssProperties.push(side.colorProp);
    }

    return { classes, warnings, cssProperties };
  }

  private convertAspectRatio(value: string): ConversionResult {
    const ratioMap: Record<string, string> = {
      '1/1': 'aspect-square',
      '16/9': 'aspect-video',
      '4/3': 'aspect-[4/3]',
      '3/4': 'aspect-[3/4]',
      '2/3': 'aspect-[2/3]',
      '3/2': 'aspect-[3/2]',
      '1/2': 'aspect-[1/2]',
      '2/1': 'aspect-[2/1]',
      'auto': 'aspect-auto'
    };

    if (ratioMap[value]) {
      return { className: ratioMap[value], skipped: false };
    }

    if (/^\d+(\.\d+)?$/.test(value)) {
      return { className: `aspect-[${value}]`, skipped: false };
    }

    if (/^\d+\/\d+$/.test(value)) {
      return { className: `aspect-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown aspect-ratio: ${value}` };
  }

  private convertOverflow(prop: string, value: string): ConversionResult {
    const prefixMap: Record<string, string> = {
      'overflow': 'overflow',
      'overflow-x': 'overflow-x',
      'overflow-y': 'overflow-y'
    };

    const prefix = prefixMap[prop];

    const valueMap: Record<string, string> = {
      'auto': `${prefix}-auto`,
      'hidden': `${prefix}-hidden`,
      'visible': `${prefix}-visible`,
      'scroll': `${prefix}-scroll`,
      'clip': `${prefix}-clip`
    };

    if (valueMap[value]) {
      return { className: valueMap[value], skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown overflow value: ${value}` };
  }

  private convertObjectFit(value: string): ConversionResult {
    const fitMap: Record<string, string> = {
      'contain': 'object-contain',
      'cover': 'object-cover',
      'fill': 'object-fill',
      'none': 'object-none',
      'scale-down': 'object-scale-down'
    };

    if (fitMap[value]) {
      return { className: fitMap[value], skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown object-fit: ${value}` };
  }

  private convertObjectPosition(value: string): ConversionResult {
    const positionMap: Record<string, string> = {
      'center': 'object-center',
      'top': 'object-top',
      'bottom': 'object-bottom',
      'left': 'object-left',
      'right': 'object-right',
      'center center': 'object-center',
      'center top': 'object-top',
      'center bottom': 'object-bottom',
      'left center': 'object-left',
      'right center': 'object-right',
      'left top': 'object-left-top',
      'right top': 'object-right-top',
      'left bottom': 'object-left-bottom',
      'right bottom': 'object-right-bottom'
    };

    if (positionMap[value]) {
      return { className: positionMap[value], skipped: false };
    }

    if (/^\d+(\.\d+)?(%|px|rem|em)?(\s+\d+(\.\d+)?(%|px|rem|em)?)?$/.test(value)) {
      return { className: `object-[${value}]`, skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown object-position: ${value}` };
  }

  private convertOpacity(value: string): ConversionResult {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return { className: null, skipped: true, reason: `Invalid opacity value: ${value}` };
    }

    const percentValue = Math.round(numValue * 100);

    if (this.opacityScale.has(percentValue)) {
      return { className: `opacity-${this.opacityScale.get(percentValue)}`, skipped: false };
    }

    return { className: `opacity-[${value}]`, skipped: false };
  }

  private convertWordBreak(value: string): ConversionResult {
    const breakMap: Record<string, string> = {
      'normal': 'break-normal',
      'break-all': 'break-all',
      'break-word': 'break-words',
      'keep-all': 'break-keep'
    };

    if (breakMap[value]) {
      return { className: breakMap[value], skipped: false };
    }

    return { className: null, skipped: true, reason: `Unknown word-break: ${value}` };
  }

  private convertZIndex(value: string): ConversionResult {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      if (value === 'auto') {
        return { className: 'z-auto', skipped: false };
      }
      return { className: null, skipped: true, reason: `Invalid z-index value: ${value}` };
    }

    if (this.zIndexScale.has(numValue)) {
      return { className: `z-${this.zIndexScale.get(numValue)}`, skipped: false };
    }

    return { className: `z-[${value}]`, skipped: false };
  }

  convertMultiple(properties: CSSProperty[]): { classes: string[]; warnings: string[] } {
    const classes: string[] = [];
    const warnings: string[] = [];

    properties.forEach(({ property, value }) => {
      const multiResult = this.convertPropertyWithMultiple(property, value);
      
      classes.push(...multiResult.classes);
      warnings.push(...multiResult.warnings);

      if (multiResult.classes.length === 0 && multiResult.warnings.length === 0) {
        const result = this.convertProperty(property, value);
        
        if (result.skipped) {
          warnings.push(result.reason || `Skipped: ${property}: ${value}`);
          logger.verbose(`Skipped: ${property}: ${value} - ${result.reason}`);
        } else if (result.className) {
          classes.push(result.className);
          logger.verbose(`Converted: ${property}: ${value} → ${result.className}`);
        }
      } else {
        if (multiResult.classes.length > 0) {
          logger.verbose(`Converted: ${property}: ${value} → ${multiResult.classes.join(', ')}`);
        }
        multiResult.warnings.forEach(w => logger.verbose(`Warning: ${w}`));
      }
    });

    return { classes, warnings };
  }
}
