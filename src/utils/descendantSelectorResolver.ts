import { logger } from './logger';

export type SelectorType = 'class' | 'element';

export interface SelectorPart {
  type: SelectorType;
  name: string;
}

export interface DescendantSelector {
  parent?: SelectorPart;
  target: SelectorPart;
  isComplex: boolean;
  reason?: string;
}

const HTML_ELEMENTS = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'audio',
  'b', 'blockquote', 'body', 'br', 'button',
  'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
  'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
  'em', 'embed',
  'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
  'i', 'iframe', 'img', 'input', 'ins',
  'kbd',
  'label', 'legend', 'li', 'link',
  'main', 'map', 'mark', 'menu', 'meta', 'meter',
  'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output',
  'p', 'param', 'picture', 'pre', 'progress',
  'q',
  'rp', 'rt', 'ruby',
  's', 'samp', 'script', 'search', 'section', 'select', 'slot', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'svg',
  'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track',
  'u', 'ul',
  'var', 'video',
  'wbr'
]);

export function isHtmlElement(name: string): boolean {
  return HTML_ELEMENTS.has(name.toLowerCase());
}

function parseSelectorPart(part: string): SelectorPart | null {
  const trimmed = part.trim();
  if (!trimmed) return null;
  
  if (trimmed.startsWith('.')) {
    const className = trimmed.slice(1);
    if (!className || !/^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(className)) {
      return null;
    }
    return { type: 'class', name: className };
  }
  
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmed)) {
    return { type: 'element', name: trimmed.toLowerCase() };
  }
  
  return null;
}

export function parseDescendantSelector(selector: string): DescendantSelector {
  const trimmed = selector.trim();
  
  if (trimmed.includes(',')) {
    return {
      parent: undefined,
      target: { type: 'element', name: '' },
      isComplex: true,
      reason: `Skipped comma-separated selector (${selector})`
    };
  }
  
  if (trimmed.includes('>')) {
    return {
      parent: undefined,
      target: { type: 'element', name: '' },
      isComplex: true,
      reason: `Skipped child combinator selector (${selector})`
    };
  }
  
  if (trimmed.includes('+')) {
    return {
      parent: undefined,
      target: { type: 'element', name: '' },
      isComplex: true,
      reason: `Skipped adjacent sibling selector (${selector})`
    };
  }
  
  if (trimmed.includes('~')) {
    return {
      parent: undefined,
      target: { type: 'element', name: '' },
      isComplex: true,
      reason: `Skipped general sibling selector (${selector})`
    };
  }
  
  if (trimmed.includes(':not') || trimmed.includes(':has') || trimmed.includes(':is') || trimmed.includes(':where')) {
    return {
      parent: undefined,
      target: { type: 'element', name: '' },
      isComplex: true,
      reason: `Skipped pseudo-class with argument (${selector})`
    };
  }
  
  if (trimmed.includes('[') && trimmed.includes(']')) {
    return {
      parent: undefined,
      target: { type: 'element', name: '' },
      isComplex: true,
      reason: `Skipped attribute selector (${selector})`
    };
  }
  
  if (trimmed.includes(':')) {
    const colonCount = (trimmed.match(/:/g) || []).length;
    if (colonCount > 2 || trimmed.includes('::before') || trimmed.includes('::after')) {
      return {
        parent: undefined,
        target: { type: 'element', name: '' },
        isComplex: true,
        reason: `Skipped selector with pseudo (${selector})`
      };
    }
  }
  
  const parts = trimmed.split(/\s+/).filter(Boolean);
  
  if (parts.length === 1) {
    const part = parseSelectorPart(parts[0]);
    if (!part) {
      return {
        parent: undefined,
        target: { type: 'element', name: '' },
        isComplex: true,
        reason: `Invalid selector part (${parts[0]})`
      };
    }
    
    return {
      parent: undefined,
      target: part,
      isComplex: false
    };
  }
  
  if (parts.length === 2) {
    const parentPart = parseSelectorPart(parts[0]);
    const targetPart = parseSelectorPart(parts[1]);
    
    if (!parentPart || !targetPart) {
      return {
        parent: undefined,
        target: { type: 'element', name: '' },
        isComplex: true,
        reason: `Invalid selector part in (${selector})`
      };
    }
    
    return {
      parent: parentPart,
      target: targetPart,
      isComplex: false
    };
  }
  
  if (parts.length > 2) {
    return {
      parent: undefined,
      target: { type: 'element', name: '' },
      isComplex: true,
      reason: `Skipped multi-level descendant selector (${selector})`
    };
  }
  
  return {
    parent: undefined,
    target: { type: 'element', name: '' },
    isComplex: true,
    reason: `Unable to parse selector (${selector})`
  };
}

export function isDescendantSelector(selector: string): boolean {
  const parsed = parseDescendantSelector(selector);
  return !parsed.isComplex && parsed.parent !== undefined;
}

export function isSimpleSelector(selector: string): boolean {
  const parsed = parseDescendantSelector(selector);
  return !parsed.isComplex && parsed.parent === undefined;
}

export function processDescendantSelector(selector: string): {
  parsed: DescendantSelector | null;
  skipped: boolean;
  reason?: string;
} {
  const parsed = parseDescendantSelector(selector);
  
  if (parsed.isComplex) {
    logger.verbose(parsed.reason || `Skipped complex selector: ${selector}`);
    return { parsed: null, skipped: true, reason: parsed.reason };
  }
  
  if (parsed.parent) {
    const parentDesc = parsed.parent.type === 'class' 
      ? `.${parsed.parent.name}` 
      : parsed.parent.name;
    const targetDesc = parsed.target.type === 'class' 
      ? `.${parsed.target.name}` 
      : parsed.target.name;
    logger.verbose(`Parsed descendant selector: ${parentDesc} ${targetDesc}`);
  }
  
  return { parsed, skipped: false };
}