import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients, radius, spacing, typography } from '@/theme/theme';

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  style?: ViewStyle;
};

export function Segmented({ options, value, onChange, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)} style={styles.opt}>
            {active ? (
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activePill}
              >
                <Text style={styles.txtActive}>{opt.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.idlePill}>
                <Text style={styles.txt}>{opt.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  opt: {},
  activePill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  idlePill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  txt: { ...typography.smallMedium, color: colors.textMuted },
  txtActive: { ...typography.smallMedium, color: '#ffffff', fontWeight: '600' },
});
