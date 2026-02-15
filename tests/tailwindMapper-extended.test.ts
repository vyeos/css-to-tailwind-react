import { TailwindMapper, CSSProperty } from '../src/tailwindMapper';
import { TailwindConfig } from '../src/utils/config';

const defaultConfig: TailwindConfig = {
  theme: {
    spacing: {
      '0': '0px',
      '0.5': '0.125rem',
      '1': '0.25rem',
      '1.5': '0.375rem',
      '2': '0.5rem',
      '2.5': '0.625rem',
      '3': '0.75rem',
      '3.5': '0.875rem',
      '4': '1rem',
      '5': '1.25rem',
      '6': '1.5rem',
      '7': '1.75rem',
      '8': '2rem',
      '9': '2.25rem',
      '10': '2.5rem',
      '11': '2.75rem',
      '12': '3rem',
      '14': '3.5rem',
      '16': '4rem',
      '20': '5rem',
      '24': '6rem',
      '28': '7rem',
      '32': '8rem'
    },
    fontSize: {
      'xs': ['0.75rem'],
      'sm': ['0.875rem'],
      'base': ['1rem'],
      'lg': ['1.125rem'],
      'xl': ['1.25rem'],
      '2xl': ['1.5rem'],
      '3xl': ['1.875rem'],
      '4xl': ['2.25rem']
    },
    maxWidth: {
      'sm': '24rem',
      'md': '28rem',
      'lg': '32rem',
      'xl': '36rem',
      '2xl': '42rem'
    }
  }
};

describe('TailwindMapper', () => {
  let mapper: TailwindMapper;

  beforeEach(() => {
    mapper = new TailwindMapper(defaultConfig);
  });

  describe('spacing shorthand parsing', () => {
    describe('padding shorthand', () => {
      it('should convert single value padding shorthand', () => {
        const result = mapper.convertPropertyWithMultiple('padding', '16px');
        expect(result.classes).toContain('p-4');
        expect(result.cssProperties).toContain('padding');
      });

      it('should convert two-value padding shorthand (vertical horizontal)', () => {
        const result = mapper.convertPropertyWithMultiple('padding', '16px 8px');
        expect(result.classes).toContain('py-4');
        expect(result.classes).toContain('px-2');
        expect(result.cssProperties).toContain('padding-y');
        expect(result.cssProperties).toContain('padding-x');
      });

      it('should convert three-value padding shorthand (top horizontal bottom)', () => {
        const result = mapper.convertPropertyWithMultiple('padding', '16px 8px 4px');
        expect(result.classes).toContain('pt-4');
        expect(result.classes).toContain('px-2');
        expect(result.classes).toContain('pb-1');
      });

      it('should convert four-value padding shorthand (top right bottom left)', () => {
        const result = mapper.convertPropertyWithMultiple('padding', '16px 8px 4px 2px');
        expect(result.classes).toContain('pt-4');
        expect(result.classes).toContain('pr-2');
        expect(result.classes).toContain('pb-1');
        expect(result.classes).toContain('pl-0.5');
      });

      it('should match scale values within tolerance', () => {
        const result = mapper.convertPropertyWithMultiple('padding', '15.5px');
        expect(result.classes).toContain('p-4');
      });

      it('should use arbitrary values for custom units like em', () => {
        const result = mapper.convertPropertyWithMultiple('padding', '2em');
        expect(result.classes).toContain('p-[2em]');
      });

      it('should handle rem values in shorthand', () => {
        const result = mapper.convertPropertyWithMultiple('padding', '1rem 0.5rem');
        expect(result.classes).toContain('py-4');
        expect(result.classes).toContain('px-2');
      });

      it('should handle percentage values', () => {
        const result = mapper.convertPropertyWithMultiple('padding', '10%');
        expect(result.classes).toContain('p-[10%]');
      });
    });

    describe('margin shorthand', () => {
      it('should convert single value margin shorthand', () => {
        const result = mapper.convertPropertyWithMultiple('margin', '16px');
        expect(result.classes).toContain('m-4');
      });

      it('should convert two-value margin shorthand', () => {
        const result = mapper.convertPropertyWithMultiple('margin', '16px 8px');
        expect(result.classes).toContain('my-4');
        expect(result.classes).toContain('mx-2');
      });

      it('should convert four-value margin shorthand', () => {
        const result = mapper.convertPropertyWithMultiple('margin', '16px 8px 4px 2px');
        expect(result.classes).toContain('mt-4');
        expect(result.classes).toContain('mr-2');
        expect(result.classes).toContain('mb-1');
        expect(result.classes).toContain('ml-0.5');
      });

      it('should handle auto value', () => {
        const result = mapper.convertProperty('margin-left', 'auto');
        expect(result.className).toBe('ml-auto');
      });

      it('should handle negative values', () => {
        const result = mapper.convertProperty('margin-top', '-16px');
        expect(result.className).toBe('-mt-4');
      });
    });

    describe('directional spacing', () => {
      it('should convert padding-top', () => {
        const result = mapper.convertProperty('padding-top', '16px');
        expect(result.className).toBe('pt-4');
      });

      it('should convert padding-right', () => {
        const result = mapper.convertProperty('padding-right', '8px');
        expect(result.className).toBe('pr-2');
      });

      it('should convert padding-bottom', () => {
        const result = mapper.convertProperty('padding-bottom', '4px');
        expect(result.className).toBe('pb-1');
      });

      it('should convert padding-left', () => {
        const result = mapper.convertProperty('padding-left', '2px');
        expect(result.className).toBe('pl-0.5');
      });

      it('should convert margin-top', () => {
        const result = mapper.convertProperty('margin-top', '16px');
        expect(result.className).toBe('mt-4');
      });

      it('should convert margin-right', () => {
        const result = mapper.convertProperty('margin-right', '8px');
        expect(result.className).toBe('mr-2');
      });

      it('should convert margin-bottom', () => {
        const result = mapper.convertProperty('margin-bottom', '4px');
        expect(result.className).toBe('mb-1');
      });

      it('should convert margin-left', () => {
        const result = mapper.convertProperty('margin-left', '2px');
        expect(result.className).toBe('ml-0.5');
      });
    });
  });

  describe('dimension constraints', () => {
    describe('max-width', () => {
      it('should convert max-width: 100%', () => {
        const result = mapper.convertProperty('max-width', '100%');
        expect(result.className).toBe('max-w-full');
      });

      it('should convert max-width: none', () => {
        const result = mapper.convertProperty('max-width', 'none');
        expect(result.className).toBe('max-w-none');
      });

      it('should convert max-width: min-content', () => {
        const result = mapper.convertProperty('max-width', 'min-content');
        expect(result.className).toBe('max-w-min');
      });

      it('should convert max-width: max-content', () => {
        const result = mapper.convertProperty('max-width', 'max-content');
        expect(result.className).toBe('max-w-max');
      });

      it('should convert max-width: fit-content', () => {
        const result = mapper.convertProperty('max-width', 'fit-content');
        expect(result.className).toBe('max-w-fit');
      });

      it('should use arbitrary values for custom max-width', () => {
        const result = mapper.convertProperty('max-width', '500px');
        expect(result.className).toBe('max-w-[500px]');
      });
    });

    describe('min-width', () => {
      it('should convert min-width: 100%', () => {
        const result = mapper.convertProperty('min-width', '100%');
        expect(result.className).toBe('min-w-full');
      });

      it('should convert min-width: 0', () => {
        const result = mapper.convertProperty('min-width', '0');
        expect(result.className).toBe('min-w-0');
      });

      it('should use arbitrary values for custom min-width', () => {
        const result = mapper.convertProperty('min-width', '300px');
        expect(result.className).toBe('min-w-[300px]');
      });
    });

    describe('max-height', () => {
      it('should convert max-height: 100%', () => {
        const result = mapper.convertProperty('max-height', '100%');
        expect(result.className).toBe('max-h-full');
      });

      it('should use arbitrary values for custom max-height', () => {
        const result = mapper.convertProperty('max-height', '400px');
        expect(result.className).toBe('max-h-[400px]');
      });
    });

    describe('min-height', () => {
      it('should convert min-height: 100%', () => {
        const result = mapper.convertProperty('min-height', '100%');
        expect(result.className).toBe('min-h-full');
      });

      it('should convert min-height: 0', () => {
        const result = mapper.convertProperty('min-height', '0');
        expect(result.className).toBe('min-h-0');
      });
    });
  });

  describe('border shorthand', () => {
    it('should convert border shorthand with all values', () => {
      const result = mapper.convertPropertyWithMultiple('border', '1px solid #000');
      expect(result.classes).toContain('border');
      expect(result.classes).toContain('border-[#000]');
    });

    it('should convert border shorthand with width only', () => {
      const result = mapper.convertPropertyWithMultiple('border', '2px');
      expect(result.classes).toContain('border-2');
    });

    it('should convert border with dashed style', () => {
      const result = mapper.convertPropertyWithMultiple('border', '1px dashed red');
      expect(result.classes).toContain('border');
      expect(result.classes).toContain('border-dashed');
      expect(result.classes).toContain('border-red');
    });

    it('should ignore solid style (default)', () => {
      const result = mapper.convertPropertyWithMultiple('border', '1px solid black');
      expect(result.classes).toContain('border');
      expect(result.classes).not.toContain('border-solid');
    });

    it('should convert border with dotted style', () => {
      const result = mapper.convertPropertyWithMultiple('border', '2px dotted blue');
      expect(result.classes).toContain('border-2');
      expect(result.classes).toContain('border-dotted');
    });

    it('should handle border-width property', () => {
      const result = mapper.convertProperty('border-width', '2px');
      expect(result.className).toBe('border-2');
    });

    it('should handle border-style property', () => {
      const result = mapper.convertProperty('border-style', 'dashed');
      expect(result.className).toBe('border-dashed');
    });

    it('should handle border-color property', () => {
      const result = mapper.convertProperty('border-color', '#ff0000');
      expect(result.className).toBe('border-[#ff0000]');
    });

    describe('directional borders', () => {
      it('should convert border-top shorthand', () => {
        const result = mapper.convertPropertyWithMultiple('border-top', '2px solid red');
        expect(result.classes).toContain('border-t-2');
        expect(result.classes).toContain('border-t-red');
      });

      it('should convert border-right shorthand', () => {
        const result = mapper.convertPropertyWithMultiple('border-right', '1px solid blue');
        expect(result.classes).toContain('border-r');
        expect(result.classes).toContain('border-r-blue');
      });

      it('should convert border-bottom shorthand', () => {
        const result = mapper.convertPropertyWithMultiple('border-bottom', '4px solid green');
        expect(result.classes).toContain('border-b-4');
        expect(result.classes).toContain('border-b-green');
      });

      it('should convert border-left shorthand', () => {
        const result = mapper.convertPropertyWithMultiple('border-left', '1px solid yellow');
        expect(result.classes).toContain('border-l');
        expect(result.classes).toContain('border-l-yellow');
      });
    });
  });

  describe('text-decoration', () => {
    it('should convert underline', () => {
      const result = mapper.convertProperty('text-decoration', 'underline');
      expect(result.className).toBe('underline');
    });

    it('should convert line-through', () => {
      const result = mapper.convertProperty('text-decoration', 'line-through');
      expect(result.className).toBe('line-through');
    });

    it('should convert none', () => {
      const result = mapper.convertProperty('text-decoration', 'none');
      expect(result.className).toBe('no-underline');
    });
  });

  describe('text-transform', () => {
    it('should convert uppercase', () => {
      const result = mapper.convertProperty('text-transform', 'uppercase');
      expect(result.className).toBe('uppercase');
    });

    it('should convert lowercase', () => {
      const result = mapper.convertProperty('text-transform', 'lowercase');
      expect(result.className).toBe('lowercase');
    });

    it('should convert capitalize', () => {
      const result = mapper.convertProperty('text-transform', 'capitalize');
      expect(result.className).toBe('capitalize');
    });

    it('should convert none', () => {
      const result = mapper.convertProperty('text-transform', 'none');
      expect(result.className).toBe('normal-case');
    });
  });

  describe('letter-spacing', () => {
    it('should convert known letter-spacing values', () => {
      const result = mapper.convertProperty('letter-spacing', '-0.025em');
      expect(result.className).toBe('tracking-tight');
    });

    it('should convert wider tracking', () => {
      const result = mapper.convertProperty('letter-spacing', '0.05em');
      expect(result.className).toBe('tracking-wider');
    });

    it('should use arbitrary values for custom spacing', () => {
      const result = mapper.convertProperty('letter-spacing', '0.15em');
      expect(result.className).toBe('tracking-[0.15em]');
    });
  });

  describe('line-height', () => {
    it('should convert line-height: 1', () => {
      const result = mapper.convertProperty('line-height', '1');
      expect(result.className).toBe('leading-none');
    });

    it('should convert line-height: 1.5', () => {
      const result = mapper.convertProperty('line-height', '1.5');
      expect(result.className).toBe('leading-normal');
    });

    it('should convert line-height: 2', () => {
      const result = mapper.convertProperty('line-height', '2');
      expect(result.className).toBe('leading-loose');
    });

    it('should use arbitrary values for custom line-height', () => {
      const result = mapper.convertProperty('line-height', '1.75');
      expect(result.className).toBe('leading-[1.75]');
    });
  });

  describe('aspect-ratio', () => {
    it('should convert aspect-ratio: 1/1', () => {
      const result = mapper.convertProperty('aspect-ratio', '1/1');
      expect(result.className).toBe('aspect-square');
    });

    it('should convert aspect-ratio: 16/9', () => {
      const result = mapper.convertProperty('aspect-ratio', '16/9');
      expect(result.className).toBe('aspect-video');
    });

    it('should convert aspect-ratio: auto', () => {
      const result = mapper.convertProperty('aspect-ratio', 'auto');
      expect(result.className).toBe('aspect-auto');
    });

    it('should use arbitrary values for custom ratios', () => {
      const result = mapper.convertProperty('aspect-ratio', '4/3');
      expect(result.className).toBe('aspect-[4/3]');
    });

    it('should handle decimal ratio', () => {
      const result = mapper.convertProperty('aspect-ratio', '1.5');
      expect(result.className).toBe('aspect-[1.5]');
    });
  });

  describe('overflow', () => {
    it('should convert overflow: hidden', () => {
      const result = mapper.convertProperty('overflow', 'hidden');
      expect(result.className).toBe('overflow-hidden');
    });

    it('should convert overflow: auto', () => {
      const result = mapper.convertProperty('overflow', 'auto');
      expect(result.className).toBe('overflow-auto');
    });

    it('should convert overflow: scroll', () => {
      const result = mapper.convertProperty('overflow', 'scroll');
      expect(result.className).toBe('overflow-scroll');
    });

    it('should convert overflow: visible', () => {
      const result = mapper.convertProperty('overflow', 'visible');
      expect(result.className).toBe('overflow-visible');
    });

    it('should convert overflow-x', () => {
      const result = mapper.convertProperty('overflow-x', 'auto');
      expect(result.className).toBe('overflow-x-auto');
    });

    it('should convert overflow-y', () => {
      const result = mapper.convertProperty('overflow-y', 'hidden');
      expect(result.className).toBe('overflow-y-hidden');
    });

    it('should convert overflow: clip', () => {
      const result = mapper.convertProperty('overflow', 'clip');
      expect(result.className).toBe('overflow-clip');
    });
  });

  describe('object-fit', () => {
    it('should convert object-fit: cover', () => {
      const result = mapper.convertProperty('object-fit', 'cover');
      expect(result.className).toBe('object-cover');
    });

    it('should convert object-fit: contain', () => {
      const result = mapper.convertProperty('object-fit', 'contain');
      expect(result.className).toBe('object-contain');
    });

    it('should convert object-fit: fill', () => {
      const result = mapper.convertProperty('object-fit', 'fill');
      expect(result.className).toBe('object-fill');
    });

    it('should convert object-fit: none', () => {
      const result = mapper.convertProperty('object-fit', 'none');
      expect(result.className).toBe('object-none');
    });

    it('should convert object-fit: scale-down', () => {
      const result = mapper.convertProperty('object-fit', 'scale-down');
      expect(result.className).toBe('object-scale-down');
    });
  });

  describe('object-position', () => {
    it('should convert object-position: center', () => {
      const result = mapper.convertProperty('object-position', 'center');
      expect(result.className).toBe('object-center');
    });

    it('should convert object-position: top', () => {
      const result = mapper.convertProperty('object-position', 'top');
      expect(result.className).toBe('object-top');
    });

    it('should convert object-position: bottom', () => {
      const result = mapper.convertProperty('object-position', 'bottom');
      expect(result.className).toBe('object-bottom');
    });

    it('should convert object-position: left', () => {
      const result = mapper.convertProperty('object-position', 'left');
      expect(result.className).toBe('object-left');
    });

    it('should convert object-position: right', () => {
      const result = mapper.convertProperty('object-position', 'right');
      expect(result.className).toBe('object-right');
    });

    it('should convert combined positions', () => {
      const result = mapper.convertProperty('object-position', 'left top');
      expect(result.className).toBe('object-left-top');
    });

    it('should use arbitrary values for custom positions', () => {
      const result = mapper.convertProperty('object-position', '25% 75%');
      expect(result.className).toBe('object-[25% 75%]');
    });
  });

  describe('flex shorthand', () => {
    it('should convert flex: 1', () => {
      const result = mapper.convertPropertyWithMultiple('flex', '1');
      expect(result.classes).toContain('flex-1');
    });

    it('should convert flex: auto', () => {
      const result = mapper.convertPropertyWithMultiple('flex', 'auto');
      expect(result.classes).toContain('flex-auto');
    });

    it('should convert flex: none', () => {
      const result = mapper.convertPropertyWithMultiple('flex', 'none');
      expect(result.classes).toContain('flex-none');
    });

    it('should convert flex: initial', () => {
      const result = mapper.convertPropertyWithMultiple('flex', 'initial');
      expect(result.classes).toContain('flex-initial');
    });

    it('should convert complex flex shorthand to arbitrary', () => {
      const result = mapper.convertPropertyWithMultiple('flex', '1 0 auto');
      expect(result.classes).toContain('flex-[1 0 auto]');
    });

    it('should convert flex-grow', () => {
      const result = mapper.convertProperty('flex-grow', '1');
      expect(result.className).toBe('grow');
    });

    it('should convert flex-grow: 0', () => {
      const result = mapper.convertProperty('flex-grow', '0');
      expect(result.className).toBe('grow-0');
    });

    it('should convert flex-shrink', () => {
      const result = mapper.convertProperty('flex-shrink', '1');
      expect(result.className).toBe('shrink');
    });

    it('should convert flex-basis', () => {
      const result = mapper.convertProperty('flex-basis', 'auto');
      expect(result.className).toBe('basis-auto');
    });

    it('should convert flex-basis with pixel value', () => {
      const result = mapper.convertProperty('flex-basis', '200px');
      expect(result.className).toBe('basis-[200px]');
    });
  });

  describe('display', () => {
    it('should convert display: flex', () => {
      const result = mapper.convertProperty('display', 'flex');
      expect(result.className).toBe('flex');
    });

    it('should convert display: block', () => {
      const result = mapper.convertProperty('display', 'block');
      expect(result.className).toBe('block');
    });

    it('should convert display: none', () => {
      const result = mapper.convertProperty('display', 'none');
      expect(result.className).toBe('hidden');
    });

    it('should convert display: grid', () => {
      const result = mapper.convertProperty('display', 'grid');
      expect(result.className).toBe('grid');
    });

    it('should convert display: inline-flex', () => {
      const result = mapper.convertProperty('display', 'inline-flex');
      expect(result.className).toBe('inline-flex');
    });

    it('should convert display: flow-root', () => {
      const result = mapper.convertProperty('display', 'flow-root');
      expect(result.className).toBe('flow-root');
    });
  });

  describe('opacity', () => {
    it('should convert opacity: 0', () => {
      const result = mapper.convertProperty('opacity', '0');
      expect(result.className).toBe('opacity-0');
    });

    it('should convert opacity: 0.5', () => {
      const result = mapper.convertProperty('opacity', '0.5');
      expect(result.className).toBe('opacity-50');
    });

    it('should convert opacity: 1', () => {
      const result = mapper.convertProperty('opacity', '1');
      expect(result.className).toBe('opacity-100');
    });

    it('should convert opacity: 0.25', () => {
      const result = mapper.convertProperty('opacity', '0.25');
      expect(result.className).toBe('opacity-25');
    });

    it('should use arbitrary values for non-scale opacity', () => {
      const result = mapper.convertProperty('opacity', '0.37');
      expect(result.className).toBe('opacity-[0.37]');
    });
  });

  describe('word-break', () => {
    it('should convert word-break: break-all', () => {
      const result = mapper.convertProperty('word-break', 'break-all');
      expect(result.className).toBe('break-all');
    });

    it('should convert word-break: break-word', () => {
      const result = mapper.convertProperty('word-break', 'break-word');
      expect(result.className).toBe('break-words');
    });

    it('should convert word-break: normal', () => {
      const result = mapper.convertProperty('word-break', 'normal');
      expect(result.className).toBe('break-normal');
    });

    it('should convert word-break: keep-all', () => {
      const result = mapper.convertProperty('word-break', 'keep-all');
      expect(result.className).toBe('break-keep');
    });
  });

  describe('z-index', () => {
    it('should convert z-index: 0', () => {
      const result = mapper.convertProperty('z-index', '0');
      expect(result.className).toBe('z-0');
    });

    it('should convert z-index: 10', () => {
      const result = mapper.convertProperty('z-index', '10');
      expect(result.className).toBe('z-10');
    });

    it('should convert z-index: 50', () => {
      const result = mapper.convertProperty('z-index', '50');
      expect(result.className).toBe('z-50');
    });

    it('should convert z-index: auto', () => {
      const result = mapper.convertProperty('z-index', 'auto');
      expect(result.className).toBe('z-auto');
    });

    it('should use arbitrary values for non-scale z-index', () => {
      const result = mapper.convertProperty('z-index', '100');
      expect(result.className).toBe('z-[100]');
    });

    it('should handle negative z-index with arbitrary value', () => {
      const result = mapper.convertProperty('z-index', '-1');
      expect(result.className).toBe('z-[-1]');
    });
  });

  describe('font-size', () => {
    it('should convert font-size: 12px to text-xs', () => {
      const result = mapper.convertProperty('font-size', '12px');
      expect(result.className).toBe('text-xs');
    });

    it('should convert font-size: 16px to text-base', () => {
      const result = mapper.convertProperty('font-size', '16px');
      expect(result.className).toBe('text-base');
    });

    it('should convert font-size: 24px to text-2xl', () => {
      const result = mapper.convertProperty('font-size', '24px');
      expect(result.className).toBe('text-2xl');
    });

    it('should use arbitrary values for custom sizes', () => {
      const result = mapper.convertProperty('font-size', '23px');
      expect(result.className).toBe('text-[23px]');
    });
  });

  describe('convertMultiple', () => {
    it('should convert multiple properties', () => {
      const properties: CSSProperty[] = [
        { property: 'display', value: 'flex' },
        { property: 'padding', value: '16px' },
        { property: 'margin', value: '8px' }
      ];
      const result = mapper.convertMultiple(properties);
      expect(result.classes).toContain('flex');
      expect(result.classes).toContain('p-4');
      expect(result.classes).toContain('m-2');
    });

    it('should handle shorthand properties in convertMultiple', () => {
      const properties: CSSProperty[] = [
        { property: 'padding', value: '16px 8px' },
        { property: 'border', value: '1px solid red' }
      ];
      const result = mapper.convertMultiple(properties);
      expect(result.classes).toContain('py-4');
      expect(result.classes).toContain('px-2');
      expect(result.classes).toContain('border');
      expect(result.classes).toContain('border-red');
    });
  });
});
