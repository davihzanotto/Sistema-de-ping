import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/theme/theme';

type Props = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  errorText?: string;
  helperText?: string;
  success?: boolean;
  containerStyle?: ViewStyle;
  password?: boolean;
};

export function Input({
  label,
  icon,
  errorText,
  helperText,
  success,
  containerStyle,
  password,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!password);

  const borderColor = errorText
    ? colors.danger
    : focused
    ? colors.borderStrong
    : colors.border;

  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, { borderColor }]}>
        {icon && (
          <Ionicons
            name={icon}
            size={15}
            color={focused ? colors.text : colors.textSubtle}
            style={{ marginRight: 10 }}
          />
        )}
        <TextInput
          {...rest}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, rest.style]}
        />
        {password && (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={15}
              color={colors.textMuted}
            />
          </Pressable>
        )}
        {success && !password && (
          <Ionicons name="checkmark" size={15} color={colors.success} />
        )}
      </View>
      {errorText ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.smallMedium,
    color: colors.textMuted,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
    fontWeight: '400',
  },
  error: { ...typography.small, color: colors.danger, marginTop: 6 },
  helper: { ...typography.small, color: colors.textSubtle, marginTop: 6 },
});
