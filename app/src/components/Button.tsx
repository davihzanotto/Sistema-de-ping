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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, gradients, radius, spacing } from '@/theme/theme';

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
    Animated.timing(opacity, { toValue: 0.72, duration: 80, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();

  const h = small ? 40 : 52;
  const px = small ? spacing.md : spacing.xl;
  const sizeStyle = { height: h, paddingHorizontal: px };

  const txtColor =
    variant === 'primary'
      ? '#ffffff'
      : variant === 'danger'
      ? colors.danger
      : variant === 'ghost'
      ? colors.textMuted
      : colors.text;

  const content = loading ? (
    <ActivityIndicator color={txtColor} size="small" />
  ) : (
    <View style={styles.row}>
      {icon && (
        <Ionicons name={icon} size={small ? 14 : 16} color={txtColor} style={{ marginRight: 6 }} />
      )}
      <Text style={[styles.label, { color: txtColor, fontSize: small ? 13 : 15 }]}>
        {children}
      </Text>
      {iconRight && (
        <Ionicons name={iconRight} size={small ? 14 : 16} color={txtColor} style={{ marginLeft: 6 }} />
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <Animated.View
        style={[
          { opacity, alignSelf: full ? 'stretch' : 'auto' },
          isDisabled && { opacity: 0.45 },
          style,
        ]}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, sizeStyle]}
        >
          <Pressable
            onPress={isDisabled ? undefined : onPress}
            onPressIn={pressIn}
            onPressOut={pressOut}
            style={[StyleSheet.absoluteFill, styles.pressable]}
          >
            {content}
          </Pressable>
        </LinearGradient>
      </Animated.View>
    );
  }

  const bg =
    variant === 'danger'
      ? 'rgba(239,68,68,0.1)'
      : variant === 'ghost'
      ? 'transparent'
      : colors.surface;

  const border =
    variant === 'danger'
      ? { borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' }
      : variant === 'secondary'
      ? { borderWidth: 1, borderColor: colors.border }
      : {};

  return (
    <Animated.View
      style={[
        { opacity, alignSelf: full ? 'stretch' : 'auto' },
        isDisabled && { opacity: 0.45 },
        style,
      ]}
    >
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.base, sizeStyle, { backgroundColor: bg }, border]}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600', letterSpacing: -0.2 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
