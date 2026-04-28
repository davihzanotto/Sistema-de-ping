import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from '@/theme/theme';

type Tone = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; tone: Tone };

type Ctx = {
  show: (message: string, tone?: Tone) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-30)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, tone: Tone = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, tone });
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 6 }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translate, { toValue: -30, duration: 200, useNativeDriver: true }),
        ]).start(() => setToast(null));
      }, 3200);
    },
    [opacity, translate],
  );

  const value: Ctx = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { opacity, transform: [{ translateY: translate }] }]}
        >
          <View style={[styles.toast, toneStyle(toast.tone)]}>
            <Ionicons name={iconFor(toast.tone)} size={20} color={iconColor(toast.tone)} />
            <Text style={styles.msg}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires ToastProvider');
  return ctx;
}

function toneStyle(t: Tone) {
  if (t === 'success') return { borderLeftColor: colors.success };
  if (t === 'error') return { borderLeftColor: colors.danger };
  return { borderLeftColor: colors.primary };
}
function iconColor(t: Tone) {
  if (t === 'success') return colors.success;
  if (t === 'error') return colors.danger;
  return colors.primary;
}
function iconFor(t: Tone): keyof typeof Ionicons.glyphMap {
  if (t === 'success') return 'checkmark-circle';
  if (t === 'error') return 'alert-circle';
  return 'information-circle';
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '80%',
    maxWidth: '100%',
    gap: spacing.md,
    ...shadows.soft,
  },
  msg: { ...typography.body, color: colors.text, flex: 1 },
});
