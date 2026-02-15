const PROPERTY_PREFIX_MAP: Record<string, string[]> = {
  'color': ['text-'],
  'background-color': ['bg-'],
  'background': ['bg-'],
  'font-size': ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl', 'text-'],
  'font-weight': ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
  'display': ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden', 'contents', 'table', 'table-cell', 'table-row', 'flow-root'],
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
  'border-style': ['border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-hidden', 'border-none'],
  'flex-direction': ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'],
  'flex-wrap': ['flex-wrap', 'flex-nowrap', 'flex-wrap-reverse'],
  'justify-content': ['justify-'],
  'align-items': ['items-'],
  'align-content': ['content-'],
  'align-self': ['self-'],
  'text-align': ['text-left', 'text-center', 'text-right', 'text-justify', 'text-start', 'text-end'],
  'text-decoration': ['underline', 'line-through', 'no-underline'],
  'text-transform': ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
  'letter-spacing': ['tracking-'],
  'line-height': ['leading-'],
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
  'inset': ['inset-'],
  'aspect-ratio': ['aspect-'],
  'object-fit': ['object-contain', 'object-cover', 'object-fill', 'object-none', 'object-scale-down'],
  'object-position': ['object-'],
  'flex': ['flex-1', 'flex-auto', 'flex-initial', 'flex-none'],
  'flex-grow': ['grow-', 'grow'],
  'flex-shrink': ['shrink-', 'shrink'],
  'flex-basis': ['basis-'],
  'word-break': ['break-normal', 'break-all', 'break-words', 'break-keep'],
  'grid-template-columns': ['grid-cols-'],
  'grid-template-rows': ['grid-rows-'],
  'grid-column': ['col-span-', 'col-start-', 'col-end-', 'col-'],
  'grid-row': ['row-span-', 'row-start-', 'row-end-', 'row-'],
  'place-items': ['place-items-'],
  'place-content': ['place-content-'],
  'place-self': ['place-self-']
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
  'flow-root': 'display',
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
  'flex-1': 'flex',
  'flex-auto': 'flex',
  'flex-initial': 'flex',
  'flex-none': 'flex',
  'grow': 'flex-grow',
  'grow-0': 'flex-grow',
  'shrink': 'flex-shrink',
  'shrink-0': 'flex-shrink',
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
  'rounded-full': 'border-radius',
  'underline': 'text-decoration',
  'line-through': 'text-decoration',
  'no-underline': 'text-decoration',
  'uppercase': 'text-transform',
  'lowercase': 'text-transform',
  'capitalize': 'text-transform',
  'normal-case': 'text-transform',
  'border-solid': 'border-style',
  'border-dashed': 'border-style',
  'border-dotted': 'border-style',
  'border-double': 'border-style',
  'border-hidden': 'border-style',
  'border-none': 'border-style',
  'object-contain': 'object-fit',
  'object-cover': 'object-fit',
  'object-fill': 'object-fit',
  'object-none': 'object-fit',
  'object-scale-down': 'object-fit',
  'object-center': 'object-position',
  'object-top': 'object-position',
  'object-bottom': 'object-position',
  'object-left': 'object-position',
  'object-right': 'object-position',
  'object-left-top': 'object-position',
  'object-right-top': 'object-position',
  'object-left-bottom': 'object-position',
  'object-right-bottom': 'object-position',
  'break-normal': 'word-break',
  'break-all': 'word-break',
  'break-words': 'word-break',
  'break-keep': 'word-break',
  'aspect-square': 'aspect-ratio',
  'aspect-video': 'aspect-ratio',
  'aspect-auto': 'aspect-ratio'
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
  'inset-': 'inset',
  'tracking-': 'letter-spacing',
  'leading-': 'line-height',
  'aspect-': 'aspect-ratio',
  'object-': 'object-position',
  'basis-': 'flex-basis',
  'grow-': 'flex-grow',
  'shrink-': 'flex-shrink',
  'grid-cols-': 'grid-template-columns',
  'grid-rows-': 'grid-template-rows',
  'col-span-': 'grid-column',
  'col-start-': 'grid-column',
  'col-end-': 'grid-column',
  'col-': 'grid-column',
  'row-span-': 'grid-row',
  'row-start-': 'grid-row',
  'row-end-': 'grid-row',
  'row-': 'grid-row',
  'place-items-': 'place-items',
  'place-content-': 'place-content',
  'place-self-': 'place-self'
};

const FONT_SIZE_UTILITIES = new Set([
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl',
  'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl',
  'text-7xl', 'text-8xl', 'text-9xl'
]);

const LINE_HEIGHT_UTILITIES = new Set([
  'leading-none', 'leading-tight', 'leading-snug', 'leading-normal',
  'leading-relaxed', 'leading-loose', 'leading-3', 'leading-4', 'leading-5',
  'leading-6', 'leading-7', 'leading-8', 'leading-9', 'leading-10'
]);

const LETTER_SPACING_UTILITIES = new Set([
  'tracking-tighter', 'tracking-tight', 'tracking-normal',
  'tracking-wide', 'tracking-wider', 'tracking-widest'
]);

export function getPropertyForUtility(utility: string): string {
  const strippedUtility = stripVariants(utility);
  
  if (UTILITY_TO_PROPERTY_MAP[strippedUtility]) {
    return UTILITY_TO_PROPERTY_MAP[strippedUtility];
  }
  
  if (FONT_SIZE_UTILITIES.has(strippedUtility)) {
    return 'font-size';
  }

  if (LINE_HEIGHT_UTILITIES.has(strippedUtility)) {
    return 'line-height';
  }

  if (LETTER_SPACING_UTILITIES.has(strippedUtility)) {
    return 'letter-spacing';
  }
  
  if (strippedUtility.startsWith('text-') && !FONT_SIZE_UTILITIES.has(strippedUtility)) {
    const value = strippedUtility.slice(5);
    if (/^\d/.test(value) || value.startsWith('[')) {
      return 'font-size';
    }
    return 'color';
  }

  if (strippedUtility.startsWith('leading-') && !LINE_HEIGHT_UTILITIES.has(strippedUtility)) {
    return 'line-height';
  }

  if (strippedUtility.startsWith('tracking-') && !LETTER_SPACING_UTILITIES.has(strippedUtility)) {
    return 'letter-spacing';
  }
  
  if (/^border-[trbl]-\[/.test(strippedUtility)) {
    const value = strippedUtility.match(/^border-[trbl]-\[(.+)\]$/)?.[1] || '';
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') || 
        value.startsWith('var(') || /^[a-z]/i.test(value)) {
      return 'border-color';
    }
  }
  
  if (strippedUtility.startsWith('border-') && strippedUtility.includes('[')) {
    const value = strippedUtility.match(/^border-\[(.+)\]$/)?.[1] || '';
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') || 
        value.startsWith('var(') || /^[a-z]/i.test(value)) {
      return 'border-color';
    }
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

export function isLineHeightUtility(utility: string): boolean {
  const stripped = stripVariants(utility);
  return LINE_HEIGHT_UTILITIES.has(stripped) || stripped.startsWith('leading-');
}

export function isLetterSpacingUtility(utility: string): boolean {
  const stripped = stripVariants(utility);
  return LETTER_SPACING_UTILITIES.has(stripped) || stripped.startsWith('tracking-');
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
  'flex': ['flex', 'flex-grow', 'flex-shrink', 'flex-basis'],
  'justify-content': ['justify-content'],
  'align-items': ['align-items'],
  'align-content': ['align-content'],
  'align-self': ['align-self'],
  'text-align': ['text-align'],
  'font-size': ['font-size'],
  'font-weight': ['font-weight'],
  'color': ['color'],
  'background-color': ['background-color', 'background'],
  'border-radius': ['border-radius'],
  'border-width': ['border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
  'border-color': ['border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'],
  'border-style': ['border-style'],
  'overflow': ['overflow', 'overflow-x', 'overflow-y'],
  'z-index': ['z-index'],
  'opacity': ['opacity'],
  'gap': ['gap'],
  'inset': ['inset', 'top', 'right', 'bottom', 'left'],
  'text-decoration': ['text-decoration'],
  'text-transform': ['text-transform'],
  'letter-spacing': ['letter-spacing'],
  'line-height': ['line-height'],
  'aspect-ratio': ['aspect-ratio'],
  'object-fit': ['object-fit'],
  'object-position': ['object-position'],
  'word-break': ['word-break'],
  'grid-template-columns': ['grid-template-columns'],
  'grid-template-rows': ['grid-template-rows'],
  'grid-column': ['grid-column', 'grid-column-start', 'grid-column-end'],
  'grid-row': ['grid-row', 'grid-row-start', 'grid-row-end'],
  'place-items': ['place-items'],
  'place-content': ['place-content'],
  'place-self': ['place-self']
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

    if (group1 === 'border-width') {
      if (prop1 === 'border-width' || prop2 === 'border-width') {
        return true;
      }
    }

    if (group1 === 'border-color') {
      if (prop1 === 'border-color' || prop2 === 'border-color') {
        return true;
      }
    }

    if (group1 === 'overflow') {
      if (prop1 === 'overflow' || prop2 === 'overflow') {
        return true;
      }
    }

    if (group1 === 'flex') {
      if (prop1 === 'flex' || prop2 === 'flex') {
        return true;
      }
    }
    
    return prop1 === prop2;
  }
  
  return prop1 === prop2;
}
