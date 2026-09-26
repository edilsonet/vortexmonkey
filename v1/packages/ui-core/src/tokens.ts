export const tokens = {
  color: {
    primary: '#0B3D91', primaryHover: '#082E6E', primarySoft: '#E8F0FF',
    success: '#137A4A', warning: '#A15C00', danger: '#B42318', info: '#0369A1',
    neutral950: '#0B1220', neutral800: '#1E293B', neutral600: '#475569',
    neutral400: '#94A3B8', neutral200: '#E2E8F0', neutral100: '#F1F5F9', white: '#FFFFFF',
  },
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px' },
  radius: { sm: '4px', md: '8px', lg: '12px', xl: '16px' },
  shadow: { sm: '0 1px 2px rgb(15 23 42 / .08)', md: '0 4px 12px rgb(15 23 42 / .10)', lg: '0 12px 24px rgb(15 23 42 / .12)', xl: '0 20px 40px rgb(15 23 42 / .16)' },
  type: { display: 'clamp(2rem, 5vw, 3.5rem)', title: '1.5rem', body: '1rem', caption: '.8125rem' },
} as const;
export const DESIGN_SYSTEM_VERSION = '1.0.0';
