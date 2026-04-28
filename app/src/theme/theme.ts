export const colors = {
  background: '#0A0A0A',
  surface: '#111111',
  surfaceElevated: '#161616',
  surfaceHover: '#1C1C1C',
  border: '#1E1E1E',
  borderStrong: '#2A2A2A',

  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryDark: '#1E40AF',
  primaryLight: '#3B82F6',

  success: '#22C55E',
  successDim: '#16A34A',
  danger: '#EF4444',
  dangerDim: '#DC2626',
  warning: '#F59E0B',
  info: '#06B6D4',

  text: '#FAFAFA',
  textMuted: '#A1A1A1',
  textSubtle: '#6B6B6B',
  textDisabled: '#454545',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',

  online: '#22C55E',
  offline: '#EF4444',
  unknown: '#6B6B6B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
};

export const typography = {
  displayLarge: { fontSize: 32, fontWeight: '600' as const, letterSpacing: -0.8 },
  display: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.6 },
  h1: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.4 },
  h2: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  h3: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const },
  bodyBold: { fontSize: 14, fontWeight: '600' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  smallMedium: { fontSize: 12, fontWeight: '500' as const },
  tiny: { fontSize: 10, fontWeight: '500' as const, letterSpacing: 0.4 },
  mono: { fontSize: 12, fontFamily: 'monospace' as const },
  numberLarge: { fontSize: 34, fontWeight: '600' as const, letterSpacing: -1 },
  numberXL: { fontSize: 42, fontWeight: '300' as const, letterSpacing: -1.5 },
};

export const shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
};

export const theme = { colors, spacing, radius, typography, shadows };
export type Theme = typeof theme;
