const PROPERTY_PREFIX_MAP: Record<string, string[]> = {
  'color': ['text-'],
  'background-color': ['bg-'],
  'font-size': ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl', 'text-'],
  'font-weight': ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
  'display': ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden', 'contents', 'table', 'table-cell', 'table-row'],
  'position': ['static', 'fixed', 'absolute', 'relative', 'sticky'],
  'width': ['w-'],
  'height': ['h-'],
  'min-width': ['min-w-'],
  'max-width': ['max-w-'],
  'min-height': ['min-h-'],
  'max-height': ['max-h-'],
  'margin': ['m-'],
  'margin-top': ['mt-'],
  'margin-right': ['mr-'],
  'margin-bottom': ['mb-'],
  'margin-left': ['ml-'],
  'margin-x': ['mx-'],
  'margin-y': ['my-'],
  'padding': ['p-'],
  'padding-top': ['pt-'],
  'padding-right': ['pr-'],
  'padding-bottom': ['pb-'],
  'padding-left': ['pl-'],
  'padding-x': ['px-'],
  'padding-y': ['py-'],
  'gap': ['gap-'],
  'border-radius': ['rounded-', 'rounded'],
  'border-width': ['border-', 'border-t-', 'border-r-', 'border-b-', 'border-l-'],
  'border-color': ['border-'],
  'flex-direction': ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'],
  'flex-wrap': ['flex-wrap', 'flex-nowrap', 'flex-wrap-reverse'],
  'justify-content': ['justify-'],
  'align-items': ['items-'],
  'align-content': ['content-'],
  'align-self': ['self-'],
  'text-align': ['text-left', 'text-center', 'text-right', 'text-justify', 'text-start', 'text-end'],
  'overflow': ['overflow-'],
  'overflow-x': ['overflow-x-'],
  'overflow-y': ['overflow-y-'],
  'z-index': ['z-'],
  'opacity': ['opacity-'],
  'cursor': ['cursor-'],
  'pointer-events': ['pointer-events-'],
  'user-select': ['select-'],
  'box-shadow': ['shadow-'],
  'transition': ['transition-'],
  'transform': ['scale-', 'rotate-', 'translate-', 'skew-'],
  'top': ['top-'],
  'right': ['right-'],
  'bottom': ['bottom-'],
  'left': ['left-'],
  'inset': ['inset-']
};

const UTILITY_TO_PROPERTY_MAP: Record<string, string> = {
  'block': 'display',
  'inline-block': 'display',
  'inline': 'display',
  'flex': 'display',
  'inline-flex': 'display',
  'grid': 'display',
  'inline-grid': 'display',
  'hidden': 'display',
  'contents': 'display',
  'static': 'position',
  'fixed': 'position',
  'absolute': 'position',
  'relative': 'position',
  'sticky': 'position',
  'flex-row': 'flex-direction',
  'flex-col': 'flex-direction',
  'flex-row-reverse': 'flex-direction',
  'flex-col-reverse': 'flex-direction',
  'flex-wrap': 'flex-wrap',
  'flex-nowrap': 'flex-wrap',
  'flex-wrap-reverse': 'flex-wrap',
  'text-left': 'text-align',
  'text-center': 'text-align',
  'text-right': 'text-align',
  'text-justify': 'text-align',
  'text-start': 'text-align',
  'text-end': 'text-align',
  'font-thin': 'font-weight',
  'font-extralight': 'font-weight',
  'font-light': 'font-weight',
  'font-normal': 'font-weight',
  'font-medium': 'font-weight',
  'font-semibold': 'font-weight',
  'font-bold': 'font-weight',
  'font-extrabold': 'font-weight',
  'font-black': 'font-weight',
  'rounded': 'border-radius',
  'rounded-none': 'border-radius',
  'rounded-sm': 'border-radius',
  'rounded-md': 'border-radius',
  'rounded-lg': 'border-radius',
  'rounded-xl': 'border-radius',
  'rounded-2xl': 'border-radius',
  'rounded-3xl': 'border-radius',
  'rounded-full': 'border-radius'
};

const PREFIX_PROPERTY_MAP: Record<string, string> = {
  'text-': 'color',
  'bg-': 'background-color',
  'w-': 'width',
  'h-': 'height',
  'min-w-': 'min-width',
  'max-w-': 'max-width',
  'min-h-': 'min-height',
  'max-h-': 'max-height',
  'm-': 'margin',
  'mt-': 'margin-top',
  'mr-': 'margin-right',
  'mb-': 'margin-bottom',
  'ml-': 'margin-left',
  'mx-': 'margin-x',
  'my-': 'margin-y',
  'p-': 'padding',
  'pt-': 'padding-top',
  'pr-': 'padding-right',
  'pb-': 'padding-bottom',
  'pl-': 'padding-left',
  'px-': 'padding-x',
  'py-': 'padding-y',
  'gap-': 'gap',
  'rounded-': 'border-radius',
  'justify-': 'justify-content',
  'items-': 'align-items',
  'content-': 'align-content',
  'self-': 'align-self',
  'overflow-': 'overflow',
  'overflow-x-': 'overflow-x',
  'overflow-y-': 'overflow-y',
  'z-': 'z-index',
  'opacity-': 'opacity',
  'cursor-': 'cursor',
  'shadow-': 'box-shadow',
  'border-': 'border-width',
  'border-t-': 'border-width',
  'border-r-': 'border-width',
  'border-b-': 'border-width',
  'border-l-': 'border-width',
  'top-': 'top',
  'right-': 'right',
  'bottom-': 'bottom',
  'left-': 'left',
  'inset-': 'inset'
};

const FONT_SIZE_UTILITIES = new Set([
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl',
  'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl',
  'text-7xl', 'text-8xl', 'text-9xl'
]);

export function getPropertyForUtility(utility: string): string {
  const strippedUtility = stripVariants(utility);
  
  if (UTILITY_TO_PROPERTY_MAP[strippedUtility]) {
    return UTILITY_TO_PROPERTY_MAP[strippedUtility];
  }
  
  if (FONT_SIZE_UTILITIES.has(strippedUtility)) {
    return 'font-size';
  }
  
  if (strippedUtility.startsWith('text-') && !FONT_SIZE_UTILITIES.has(strippedUtility)) {
    const value = strippedUtility.slice(5);
    if (/^\d/.test(value) || value.startsWith('[')) {
      return 'font-size';
    }
    return 'color';
  }
  
  const sortedPrefixes = Object.keys(PREFIX_PROPERTY_MAP).sort((a, b) => b.length - a.length);
  
  for (const prefix of sortedPrefixes) {
    if (strippedUtility.startsWith(prefix)) {
      return PREFIX_PROPERTY_MAP[prefix];
    }
  }
  
  return 'unknown';
}

function stripVariants(utility: string): string {
  const parts = utility.split(':');
  return parts[parts.length - 1];
}

export function isTextFontSizeUtility(utility: string): boolean {
  const stripped = stripVariants(utility);
  return FONT_SIZE_UTILITIES.has(stripped) || (
    stripped.startsWith('text-') && /^\d/.test(stripped.slice(5))
  );
}

export function isTextColorUtility(utility: string): boolean {
  const stripped = stripVariants(utility);
  
  if (FONT_SIZE_UTILITIES.has(stripped)) {
    return false;
  }
  
  if (stripped.startsWith('text-')) {
    const value = stripped.slice(5);
    if (/^\d/.test(value) || value.startsWith('[')) {
      return false;
    }
    return true;
  }
  
  return false;
}

export function getPropertiesForUtilities(utilities: string[]): Map<string, string[]> {
  const propertyMap = new Map<string, string[]>();
  
  for (const utility of utilities) {
    const property = getPropertyForUtility(utility);
    
    if (!propertyMap.has(property)) {
      propertyMap.set(property, []);
    }
    
    propertyMap.get(property)!.push(utility);
  }
  
  return propertyMap;
}

export const PROPERTY_CONFLICT_GROUPS: Record<string, string[]> = {
  'display': ['display'],
  'position': ['position'],
  'width': ['width', 'min-width', 'max-width'],
  'height': ['height', 'min-height', 'max-height'],
  'margin': ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-x', 'margin-y'],
  'padding': ['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-x', 'padding-y'],
  'flex-direction': ['flex-direction'],
  'flex-wrap': ['flex-wrap'],
  'justify-content': ['justify-content'],
  'align-items': ['align-items'],
  'text-align': ['text-align'],
  'font-size': ['font-size'],
  'font-weight': ['font-weight'],
  'color': ['color'],
  'background-color': ['background-color'],
  'border-radius': ['border-radius'],
  'border-width': ['border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
  'overflow': ['overflow', 'overflow-x', 'overflow-y'],
  'z-index': ['z-index'],
  'opacity': ['opacity'],
  'gap': ['gap'],
  'inset': ['inset', 'top', 'right', 'bottom', 'left']
};

export function getConflictGroup(property: string): string | null {
  for (const [groupName, properties] of Object.entries(PROPERTY_CONFLICT_GROUPS)) {
    if (properties.includes(property)) {
      return groupName;
    }
  }
  return null;
}

export function propertiesConflict(prop1: string, prop2: string): boolean {
  const group1 = getConflictGroup(prop1);
  const group2 = getConflictGroup(prop2);
  
  if (group1 && group2 && group1 === group2) {
    if (prop1 === prop2) {
      return true;
    }
    
    const group = PROPERTY_CONFLICT_GROUPS[group1];
    
    if (group.length === 1) {
      return true;
    }
    
    if (group1 === 'margin' || group1 === 'padding') {
      if (prop1 === group1 || prop2 === group1) {
        return true;
      }
    }
    
    if (group1 === 'inset') {
      if (prop1 === 'inset' || prop2 === 'inset') {
        return true;
      }
    }
    
    return prop1 === prop2;
  }
  
  return prop1 === prop2;
}