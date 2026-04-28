import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import { useConfirm } from '@/components/ConfirmDialog';
import { colors, spacing, typography } from '@/theme/theme';

const VERSAO = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

export function ConfigScreen() {
  const { sair, usuario } = useAuth();
  const confirmar = useConfirm();
  const [saindo, setSaindo] = useState(false);

  const letra = (usuario?.nome ?? usuario?.email ?? 'U').charAt(0).toUpperCase();

  async function onSair() {
    const ok = await confirmar({
      title: 'Sair da conta?',
      message:
        'Você precisará entrar novamente com seu e-mail e senha para acessar o painel.',
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
      <View style={styles.header}>
        <Text style={styles.marca}>CONTA</Text>
      </View>

      <Text style={styles.titulo}>Conta</Text>

      <View style={styles.perfilBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{letra}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.perfilNome}>{usuario?.nome ?? 'Usuário'}</Text>
          <Text style={styles.perfilEmail}>{usuario?.email ?? '—'}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>SISTEMA</Text>
      <View style={styles.infoList}>
        <InfoRow label="Versão" valor={VERSAO} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ padding: spacing.xl }}>
        <Button variant="danger" full loading={saindo} onPress={onSair}>
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
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  marca: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 1.5,
  },
  titulo: {
    ...typography.display,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },

  perfilBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 16, fontWeight: '500', color: colors.text },
  perfilNome: { fontSize: 15, fontWeight: '500', color: colors.text },
  perfilEmail: { fontSize: 12, color: colors.textSubtle, marginTop: 3 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 1.2,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  infoList: {
    marginHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  infoLabel: { fontSize: 14, color: colors.text },
  infoValor: { fontSize: 13, color: colors.textMuted, fontFamily: 'monospace' },

  rodape: {
    ...typography.small,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
