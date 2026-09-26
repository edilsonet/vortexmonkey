import type { SVGProps } from 'react';

export const VortexLogo = ({ variant = 'primary', ...props }: SVGProps<SVGSVGElement> & { variant?: 'primary' | 'mono' | 'white' }) => {
  const color = variant === 'white' ? '#FFFFFF' : variant === 'mono' ? 'currentColor' : 'var(--vtx-primary, #0B3D91)';
  return <svg viewBox="0 0 64 64" role="img" aria-label="VORTEX" {...props}><path fill={color} d="M32 4C18 4 7.2 13.4 5.1 26.4h10.2C17.2 19 23.8 14 32 14c6.1 0 11.5 2.8 15 7.2L39.5 29H60V8.5l-6 6C48.7 8.1 40.8 4 32 4Z"/><path fill={color} opacity=".72" d="M58.9 37.6H48.7C46.8 45 40.2 50 32 50c-6.1 0-11.5-2.8-15-7.2l7.5-7.8H4v20.5l6-6C15.3 55.9 23.2 60 32 60c14 0 24.8-9.4 26.9-22.4Z"/><circle cx="32" cy="32" r="7" fill={color}/></svg>;
};
