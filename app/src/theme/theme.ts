export const colors = {
  background: '#000000',
  surface: '#0A0A0A',
  surfaceElevated: '#0d1117',
  surfaceHover: '#111827',
  border: '#1e293b',
  borderStrong: '#1e40af',

  primary: '#1a56db',
  primaryHover: '#1e40af',
  primaryDark: '#1e3a8a',
  accentBlue: '#60a5fa',

  success: '#22c55e',
  successDim: '#16a34a',
  danger: '#ef4444',
  dangerDim: '#dc2626',
  warning: '#f59e0b',
  info: '#06b6d4',

  text: '#ffffff',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  textDisabled: '#334155',

  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(26, 86, 219, 0.25)',

  online: '#22c55e',
  offline: '#ef4444',
  unknown: '#64748b',
};

export const gradients = {
  primary: ['#1a56db', '#1e40af'] as string[],
  primaryDiag: ['#1a56db', '#1e3a8a'] as string[],
  dark: ['#0d1b4b', '#000000'] as string[],
  success: ['#22c55e', '#16a34a'] as string[],
  danger: ['#ef4444', '#dc2626'] as string[],
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  displayLarge: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  display: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.8 },
  h1: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const },
  bodyBold: { fontSize: 14, fontWeight: '600' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  smallMedium: { fontSize: 12, fontWeight: '500' as const },
  tiny: { fontSize: 10, fontWeight: '500' as const, letterSpacing: 0.4 },
  mono: { fontSize: 12, fontFamily: 'monospace' as const },
  numberLarge: { fontSize: 38, fontWeight: '800' as const, letterSpacing: -1.5 },
  numberXL: { fontSize: 48, fontWeight: '300' as const, letterSpacing: -2 },
};

export const shadows = {
  soft: {
    shadowColor: '#1a56db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    shadowColor: '#1a56db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  blue: {
    shadowColor: '#1a56db',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
};

export const theme = { colors, gradients, spacing, radius, typography, shadows };
export type Theme = typeof theme;
