import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Polyline } from 'react-native-svg';

// ─── Types ───────────────────────────────────────────────────────────────────

type RawTone = 'success' | 'error' | 'info';
type Tone    = 'success' | 'error' | 'retry';

type ToastItem = { id: number; title: string; subtitle?: string; tone: Tone };

type Ctx = {
  show:    (title: string, opts?: { subtitle?: string; tone?: RawTone }) => void;
  success: (title: string, subtitle?: string) => void;
  error:   (title: string, subtitle?: string) => void;
  info:    (title: string, subtitle?: string) => void;
};

function mapTone(t: RawTone): Tone {
  return t === 'info' ? 'retry' : t;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

const TONE_CFG = {
  success: { color: '#2d8659', label: 'SUCESSO' },
  error:   { color: '#c74545', label: 'ERRO'    },
  retry:   { color: '#a76b1e', label: 'ATENÇÃO' },
} as const;

const DURATION = 3500;
const MONO: object = { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' };
const ToastCtx = createContext<Ctx | null>(null);

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function BellSvg({ color, size = 30 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L12 3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path
        d="M12 3.5C8.5 3.5 6 6.5 6 10L6 15.5L18 15.5L18 10C18 6.5 15.5 3.5 12 3.5Z"
        stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none"
      />
      <Path d="M4 15.5L20 15.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="12" cy="18.5" r="1.5" stroke={color} strokeWidth="1.8" fill="none" />
    </Svg>
  );
}

function TypeIconSvg({ tone, size = 13 }: { tone: Tone; size?: number }) {
  const col = TONE_CFG[tone].color;
  if (tone === 'success') {
    return (
      <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <Polyline
          points="3,8 6.5,12 13,4"
          stroke={col} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (tone === 'error') {
    return (
      <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <Line x1="4" y1="4" x2="12" y2="12" stroke={col} strokeWidth="2.2" strokeLinecap="round" />
        <Line x1="12" y1="4" x2="4" y2="12" stroke={col} strokeWidth="2.2" strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M13.5 3C11.5 1.2 8.5 0.8 6 2.5C3.5 4 2.5 7 3.5 10"
        stroke={col} strokeWidth="1.8" strokeLinecap="round" fill="none"
      />
      <Polygon points="14,0.5 14,5.5 9.5,3" fill={col} />
    </Svg>
  );
}

// ─── Toast Card ───────────────────────────────────────────────────────────────

interface CardHandle { exit(): void }
interface CardProps  { toast: ToastItem; onDone(): void }

const ToastCard = forwardRef<CardHandle, CardProps>(function ToastCard({ toast, onDone }, ref) {
  const mounted  = useRef(true);
  const opacity  = useRef(new Animated.Value(0)).current;
  const ty       = useRef(new Animated.Value(-90)).current;
  const bellRot  = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { mounted.current = false; }, []);

  const doExit = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0, duration: 220,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(ty, {
        toValue: -60, duration: 220,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
    ]).start(() => { if (mounted.current) onDone(); });
  }, [opacity, ty, onDone]);

  useImperativeHandle(ref, () => ({ exit: doExit }));

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 10 }),
    ]).start();

    // Bell swing — 3 cycles
    Animated.sequence([
      Animated.delay(240),
      Animated.timing(bellRot, { toValue:  1, duration:  80, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(bellRot, { toValue: -1, duration: 160, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(bellRot, { toValue:  1, duration: 160, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(bellRot, { toValue: -1, duration: 160, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(bellRot, { toValue:  1, duration: 160, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(bellRot, { toValue:  0, duration:  80, useNativeDriver: true, easing: Easing.linear }),
    ]).start();
  }, []);

  const bellRotation = bellRot.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-22deg', '0deg', '22deg'],
  });

  const { color, label } = TONE_CFG[toast.tone];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.outer, { opacity, transform: [{ translateY: ty }] }]}
    >
      {/* Solid offset shadow layer */}
      <View style={styles.shadowBlue} pointerEvents="none" />

      {/* Card */}
      <View style={styles.card}>
        {/* Bell + type badge */}
        <View style={styles.bellCol}>
          <Animated.View style={{ transform: [{ rotate: bellRotation }] }}>
            <BellSvg color={color} size={30} />
          </Animated.View>
          <View style={[styles.badge, { borderColor: color }]}>
            <TypeIconSvg tone={toast.tone} size={13} />
          </View>
        </View>

        {/* Text content */}
        <View style={styles.content}>
          <Text style={[styles.typeLabel, { color }, MONO]}>{label}</Text>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          {toast.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>{toast.subtitle}</Text>
          ) : null}
        </View>

        {/* Vertical TAP ✕ dismiss */}
        <Pressable onPress={doExit} style={styles.dismissCol} hitSlop={8}>
          {'TAP ✕'.split('').map((ch, i) => (
            <Text key={i} style={[styles.dismissChar, MONO]}>{ch}</Text>
          ))}
        </Pressable>
      </View>
    </Animated.View>
  );
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const cardRef = useRef<CardHandle>(null);
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((title: string, opts?: { subtitle?: string; tone?: RawTone }) => {
    if (timer.current) clearTimeout(timer.current);
    const item: ToastItem = {
      id: Date.now(),
      title,
      subtitle: opts?.subtitle,
      tone: mapTone(opts?.tone ?? 'info'),
    };
    setToast(item);
    timer.current = setTimeout(() => cardRef.current?.exit(), DURATION);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const ctx: Ctx = {
    show,
    success: (t, s) => show(t, { subtitle: s, tone: 'success' }),
    error:   (t, s) => show(t, { subtitle: s, tone: 'error'   }),
    info:    (t, s) => show(t, { subtitle: s, tone: 'info'    }),
  };

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      {toast && (
        <ToastCard
          key={toast.id}
          ref={cardRef}
          toast={toast}
          onDone={() => setToast(prev => (prev?.id === toast.id ? null : prev))}
        />
      )}
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast requires ToastProvider');
  return ctx;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    top: 64,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  shadowBlue: {
    position: 'absolute',
    top: 5,
    left: 4,
    right: -4,
    bottom: -5,
    backgroundColor: '#1a56db',
    borderRadius: 12,
  },
  card: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  bellCol: {
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#1e3a8a',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 17,
  },
  dismissCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    minWidth: 16,
  },
  dismissChar: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    lineHeight: 14,
  },
});
