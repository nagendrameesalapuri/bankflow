import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'bf-balance-card': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        value?: string;
        trend?: string;
        tone?: 'brand' | 'teal' | 'sunset';
      };
      'bf-rating-widget': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        value?: string;
      };
    }
  }
}

export {};
