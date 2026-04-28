import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/theme/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  onPress?: () => void;
  children: React.ReactNode;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  full?: boolean;
  small?: boolean;
};

export function Button({
  onPress,
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  style,
  full,
  small,
}: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const pressIn = () =>
    Animated.timing(opacity, { toValue: 0.7, duration: 80, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();

  const bg =
    variant === 'primary'
      ? colors.text
      : variant === 'danger'
      ? 'transparent'
      : variant === 'ghost'
      ? 'transparent'
      : colors.surface;
  const border =
    variant === 'primary'
      ? undefined
      : variant === 'danger'
      ? { borderWidth: 1, borderColor: colors.border }
      : { borderWidth: 1, borderColor: colors.border };

  const txtColor =
    variant === 'primary'
      ? colors.background
      : variant === 'danger'
      ? colors.danger
      : variant === 'ghost'
      ? colors.textMuted
      : colors.text;

  return (
    <Animated.View
      style={[
        { opacity, alignSelf: full ? 'stretch' : 'auto' },
        isDisabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[
          styles.base,
          small ? styles.small : styles.regular,
          { backgroundColor: bg },
          border,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={txtColor} size="small" />
        ) : (
          <View style={styles.row}>
            {icon && (
              <Ionicons
                name={icon}
                size={small ? 14 : 16}
                color={txtColor}
                style={{ marginRight: 6 }}
              />
            )}
            <Text style={[styles.label, { color: txtColor, fontSize: small ? 13 : 14 }]}>
              {children}
            </Text>
            {iconRight && (
              <Ionicons
                name={iconRight}
                size={small ? 14 : 16}
                color={txtColor}
                style={{ marginLeft: 6 }}
              />
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regular: { paddingVertical: 11, paddingHorizontal: spacing.lg },
  small: { paddingVertical: 7, paddingHorizontal: spacing.md },
  label: { fontWeight: '500', letterSpacing: -0.1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
