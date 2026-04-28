import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import {
  mensagemErro,
  obterCondominio,
  rotacionarToken,
} from '@/services/api';
import { Button } from './Button';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';
import { colors, radius, spacing, typography } from '@/theme/theme';

type Props = {
  visible: boolean;
  condominioId: number | null;
  onClose: () => void;
};

export function TokenModal({ visible, condominioId, onClose }: Props) {
  const toast = useToast();
  const confirmar = useConfirm();
  const [token, setToken] = useState<string>('');
  const [carregando, setCarregando] = useState(false);
  const [rotacionando, setRotacionando] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    translate.setValue(20);
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
        speed: 18,
        bounciness: 4,
      }),
    ]).start();
  }, [visible, fade, translate]);

  useEffect(() => {
    if (!visible || !condominioId) return;
    setCarregando(true);
    setToken('');
    obterCondominio(condominioId)
      .then((c) => setToken(c.token_unico))
      .catch((e) => toast.error(mensagemErro(e, 'Falha ao carregar token')))
      .finally(() => setCarregando(false));
  }, [visible, condominioId]);

  function fechar() {
    Animated.timing(fade, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => onClose());
  }

  async function copiar() {
    if (!token) return;
    await Clipboard.setStringAsync(token);
    toast.success('Token copiado para a área de transferência');
  }

  async function regenerar() {
    if (!condominioId) return;
    const ok = await confirmar({
      title: 'Regenerar token?',
      message:
        'O agente atual vai parar de funcionar até ser reconfigurado com o novo token. Esta ação não pode ser desfeita.',
      confirmText: 'Regenerar',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (!ok) return;

    try {
      setRotacionando(true);
      const novo = await rotacionarToken(condominioId);
      setToken(novo.token_unico);
      toast.success('Novo token gerado. Atualize o agente.');
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao regenerar token'));
    } finally {
      setRotacionando(false);
    }
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
            styles.card,
            { opacity: fade, transform: [{ translateY: translate }] },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>TOKEN DO AGENTE</Text>
              <Text style={styles.titulo}>Configuração do agente local</Text>
            </View>
            <Pressable onPress={fechar} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.desc}>
            Cole este token no <Text style={styles.mono}>config.json</Text> do
            agente instalado no servidor do condomínio.
          </Text>

          <View style={styles.tokenBox}>
            {carregando ? (
              <ActivityIndicator color={colors.textMuted} style={{ paddingVertical: spacing.lg }} />
            ) : (
              <Text selectable style={styles.tokenValor}>
                {token || '—'}
              </Text>
            )}
          </View>

          <View style={styles.acoes}>
            <Button
              variant="secondary"
              icon="copy-outline"
              onPress={copiar}
              disabled={!token || carregando}
              style={{ flex: 1 }}
            >
              Copiar
            </Button>
            <Button
              variant="danger"
              icon="refresh-outline"
              onPress={regenerar}
              loading={rotacionando}
              disabled={!token || carregando}
              style={{ flex: 1 }}
            >
              Regenerar
            </Button>
          </View>

          <View style={styles.aviso}>
            <Ionicons name="warning-outline" size={14} color={colors.warning} />
            <Text style={styles.avisoTxt}>
              Mantenha este token em segurança. Quem tiver acesso a ele pode
              reportar status para o seu condomínio.
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
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
    maxWidth: 420,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  titulo: { ...typography.h2, color: colors.text },
  desc: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  mono: { fontFamily: 'monospace', color: colors.text },
  tokenBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    minHeight: 56,
    justifyContent: 'center',
  },
  tokenValor: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  acoes: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  aviso: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  avisoTxt: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 17,
  },
});
