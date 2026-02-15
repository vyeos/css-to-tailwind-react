import path from 'path';
import fs from 'fs';
import resolve from 'resolve';

export interface TailwindConfig {
  theme?: {
    extend?: Record<string, any>;
    spacing?: Record<string, string>;
    colors?: Record<string, any>;
    fontSize?: Record<string, any>;
    fontWeight?: Record<string, string>;
    borderRadius?: Record<string, string>;
    screens?: Record<string, string | [string, string]>;
    [key: string]: any;
  };
  content?: string[];
  [key: string]: any;
}

export async function loadTailwindConfig(projectRoot: string): Promise<TailwindConfig | null> {
  const configPaths = [
    'tailwind.config.js',
    'tailwind.config.ts',
    'tailwind.config.mjs',
    'tailwind.config.cjs'
  ];

  for (const configPath of configPaths) {
    const fullPath = path.join(projectRoot, configPath);
    
    if (fs.existsSync(fullPath)) {
      try {
        // Clear require cache for hot reloading
        delete require.cache[require.resolve(fullPath)];
        
        // Load the config
        let config: TailwindConfig;
        
        if (configPath.endsWith('.ts')) {
          // For TypeScript configs, we need to use a dynamic import
          // But for CLI usage, we'll use a simpler approach
          // Try to resolve tailwindcss and use its config resolution
          const tailwindcssPath = resolve.sync('tailwindcss', { basedir: projectRoot });
          const tailwindcss = require(tailwindcssPath);
          
          if (tailwindcss.resolveConfig) {
            const userConfig = require(fullPath);
            config = tailwindcss.resolveConfig(userConfig.default || userConfig);
          } else {
            config = require(fullPath);
          }
        } else {
          const userConfig = require(fullPath);
          config = userConfig.default || userConfig;
        }

        return config;
      } catch (error) {
        console.warn(`Failed to load Tailwind config at ${fullPath}:`, error);
        continue;
      }
    }
  }

  // Return default Tailwind-like config
  return {
    theme: {
      spacing: {
        '0': '0px',
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '32': '8rem',
        '40': '10rem',
        '48': '12rem',
        '56': '14rem',
        '64': '16rem'
      },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px'
      },
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        black: '#000000',
        white: '#ffffff',
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        },
        red: {
          500: '#ef4444',
          600: '#dc2626'
        },
        blue: {
          500: '#3b82f6',
          600: '#2563eb'
        },
        green: {
          500: '#22c55e',
          600: '#16a34a'
        }
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }]
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900'
      },
      borderRadius: {
        'none': '0px',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px'
      }
    }
  };
}
