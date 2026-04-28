import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '@/theme/theme';

type Props = {
  value: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
};

export function ProgressBar({ value, color, height = 2, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.track, { height }, style]}>
      <Animated.View
        style={{
          width,
          height: '100%',
          backgroundColor: color ?? colors.text,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.border, overflow: 'hidden', width: '100%' },
});
