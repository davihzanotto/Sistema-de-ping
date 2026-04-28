import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, typography } from '@/theme/theme';

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning';

type Props = {
  label: string;
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  style?: ViewStyle;
};

const toneColors: Record<Tone, { fg: string; dot: string }> = {
  neutral: { fg: colors.textMuted, dot: colors.textSubtle },
  primary: { fg: colors.primaryLight, dot: colors.primary },
  success: { fg: colors.success, dot: colors.success },
  danger: { fg: colors.danger, dot: colors.danger },
  warning: { fg: colors.warning, dot: colors.warning },
};

export function Badge({ label, tone = 'neutral', dot, pulse, style }: Props) {
  const c = toneColors[tone];
  const op = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, op]);

  return (
    <View style={[styles.base, style]}>
      {dot && (
        <Animated.View
          style={[styles.dot, { backgroundColor: c.dot, opacity: pulse ? op : 1 }]}
        />
      )}
      <Text style={[styles.label, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    marginRight: 6,
  },
  label: { ...typography.smallMedium },
});
