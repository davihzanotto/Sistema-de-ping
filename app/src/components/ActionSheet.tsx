import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/theme/theme';

export type ActionItem = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  items: ActionItem[];
  onClose: () => void;
};

export function ActionSheet({ visible, title, subtitle, items, onClose }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    translate.setValue(40);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translate, {
        toValue: 0,
        useNativeDriver: true,
        speed: 16,
        bounciness: 4,
      }),
    ]).start();
  }, [visible, fade, translate]);

  function fechar() {
    Animated.timing(fade, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => onClose());
  }

  function executar(item: ActionItem) {
    fechar();
    // Pequeno delay para a animação de saída terminar antes do destino abrir.
    setTimeout(() => item.onPress(), 130);
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={fechar}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={fechar} />
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: translate }] },
          ]}
        >
          {(title || subtitle) && (
            <View style={styles.header}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          )}
          {items.map((item, i) => (
            <Pressable
              key={item.key}
              onPress={() => executar(item)}
              style={({ pressed }) => [
                styles.row,
                i < items.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
                pressed && { backgroundColor: colors.surfaceElevated },
              ]}
            >
              {item.icon && (
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={item.destructive ? colors.danger : colors.textMuted}
                />
              )}
              <Text
                style={[
                  styles.label,
                  item.destructive && { color: colors.danger },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={fechar} style={styles.cancel}>
            <Text style={styles.cancelTxt}>Cancelar</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingBottom: 28,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.bodyBold, color: colors.text },
  subtitle: { ...typography.small, color: colors.textSubtle, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    gap: spacing.md,
  },
  label: { ...typography.body, color: colors.text, flex: 1 },
  cancel: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  cancelTxt: { ...typography.bodyMedium, color: colors.textMuted },
});
