import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme/theme';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  elevated?: boolean;
  padded?: boolean;
};

export function Card({ children, onPress, style, padded = true }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  const baseStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? spacing.lg : 0,
  };

  if (!onPress) return <View style={[baseStyle, style]}>{children}</View>;

  return (
    <Animated.View style={{ opacity }}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.timing(opacity, { toValue: 0.6, duration: 80, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }).start()
        }
        style={[baseStyle, style]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export const cardStyles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
