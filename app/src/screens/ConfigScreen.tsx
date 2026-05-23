import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import { useConfirm } from '@/components/ConfirmDialog';
import { colors, gradients, radius, spacing, typography } from '@/theme/theme';

const VERSAO = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

export function ConfigScreen() {
  const { sair, usuario } = useAuth();
  const confirmar = useConfirm();
  const [saindo, setSaindo] = useState(false);

  const letra = (usuario?.nome ?? usuario?.email ?? 'U').charAt(0).toUpperCase();
  const nome = usuario?.nome ?? 'Usuário';
  const email = usuario?.email ?? '—';

  async function onSair() {
    const ok = await confirmar({
      title: 'Sair da conta?',
      message: 'Você precisará entrar novamente com seu e-mail e senha para acessar o painel.',
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (!ok) return;
    setSaindo(true);
    try {
      await sair();
    } finally {
      setSaindo(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header gradient */}
      <LinearGradient
        colors={['#0d1b4b', '#000000']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.marca}>CONTA</Text>
        <Text style={styles.titulo}>Conta</Text>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <LinearGradient
            colors={gradients.primaryDiag}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarTxt}>{letra}</Text>
          </LinearGradient>
          <Text style={styles.perfilNome}>{nome}</Text>
          <Text style={styles.perfilEmail}>{email}</Text>
        </View>
      </LinearGradient>

      {/* Settings section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SISTEMA</Text>
        <View style={styles.settingsCard}>
          <InfoRow label="Versão do app" valor={VERSAO} />
          <View style={styles.rowDivider} />
          <InfoRow label="Plataforma" valor="TRIETEL Ping" />
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <Button variant="danger" full loading={saindo} onPress={onSair} icon="log-out-outline">
          Sair da conta
        </Button>
        <Text style={styles.rodape}>TRIETEL · v{VERSAO}</Text>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoRight}>
        <Text style={styles.infoValor}>{valor}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textSubtle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  marca: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentBlue,
    letterSpacing: 3,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  titulo: {
    ...typography.display,
    color: colors.text,
    alignSelf: 'flex-start',
    marginBottom: spacing.xxl,
  },

  avatarWrap: { alignItems: 'center' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarTxt: { fontSize: 32, fontWeight: '800', color: '#ffffff' },
  perfilNome: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  perfilEmail: { fontSize: 13, color: colors.textMuted },

  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSubtle,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  infoLabel: { fontSize: 14, color: colors.text, fontWeight: '400' },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValor: { fontSize: 13, color: colors.textMuted },

  footer: { padding: spacing.xl },
  rodape: {
    ...typography.small,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
