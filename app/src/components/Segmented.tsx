import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '@/theme/theme';

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
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={styles.opt}
          >
            <Text style={[styles.txt, active && styles.txtActive]}>{opt.label}</Text>
            {active && <View style={styles.underline} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xl,
  },
  opt: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  txt: { ...typography.smallMedium, color: colors.textSubtle },
  txtActive: { color: colors.text },
  underline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: colors.text,
  },
});
