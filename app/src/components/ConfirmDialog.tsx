import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from './Button';
import { colors, radius, spacing, typography } from '@/theme/theme';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type Ctx = {
  confirmar: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<Ctx | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [visivel, setVisivel] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  const confirmar = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setOpts(o);
        setVisivel(true);
        fade.setValue(0);
        scale.setValue(0.96);
        Animated.parallel([
          Animated.timing(fade, {
            toValue: 1,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 18,
            bounciness: 4,
          }),
        ]).start();
      }),
    [fade, scale],
  );

  const fechar = (resultado: boolean) => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setVisivel(false);
      resolverRef.current?.(resultado);
      resolverRef.current = null;
    });
  };

  return (
    <ConfirmContext.Provider value={{ confirmar }}>
      {children}
      <Modal
        transparent
        visible={visivel}
        animationType="none"
        onRequestClose={() => fechar(false)}
        statusBarTranslucent
      >
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => fechar(false)} />
          <Animated.View
            style={[
              styles.card,
              { opacity: fade, transform: [{ scale }] },
            ]}
          >
            <Text style={styles.titulo}>{opts?.title}</Text>
            {opts?.message ? <Text style={styles.mensagem}>{opts.message}</Text> : null}
            <View style={styles.botoes}>
              <Button
                variant="secondary"
                onPress={() => fechar(false)}
                style={{ flex: 1 }}
              >
                {opts?.cancelText ?? 'Cancelar'}
              </Button>
              <Button
                variant={opts?.destructive ? 'danger' : 'primary'}
                onPress={() => fechar(true)}
                style={{ flex: 1 }}
              >
                {opts?.confirmText ?? 'Confirmar'}
              </Button>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm requires ConfirmDialogProvider');
  return ctx.confirmar;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  titulo: { ...typography.h2, color: colors.text },
  mensagem: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  botoes: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
