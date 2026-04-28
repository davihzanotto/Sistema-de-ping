import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  CondominioStatus,
  dashboard,
  excluirCondominio,
  mensagemErro,
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { EmptyState } from '@/components/EmptyState';
import { ActionSheet, ActionItem } from '@/components/ActionSheet';
import { useConfirm } from '@/components/ConfirmDialog';
import { colors, spacing, typography } from '@/theme/theme';

export function DashboardScreen({ navigation }: any) {
  const { usuario } = useAuth();
  const toast = useToast();
  const confirmar = useConfirm();
  const [dados, setDados] = useState<CondominioStatus[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [acoesAlvo, setAcoesAlvo] = useState<CondominioStatus | null>(null);
  const [primeiraCarga, setPrimeiraCarga] = useState(true);

  async function carregar() {
    try {
      setCarregando(true);
      const d = await dashboard();
      setDados(d);
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao carregar dashboard'));
    } finally {
      setCarregando(false);
      setPrimeiraCarga(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, []),
  );

  async function excluir(condo: CondominioStatus) {
    const ok = await confirmar({
      title: `Excluir ${condo.nome}?`,
      message:
        'Excluir vai remover todas as câmeras e o histórico deste condomínio. Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await excluirCondominio(condo.id);
      toast.success('Condomínio excluído');
      setDados((d) => d.filter((c) => c.id !== condo.id));
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao excluir condomínio'));
    }
  }

  const acoes: ActionItem[] = acoesAlvo
    ? [
        {
          key: 'editar',
          label: 'Editar',
          icon: 'create-outline',
          onPress: () =>
            navigation.navigate('EditarCondominio', { id: acoesAlvo.id }),
        },
        {
          key: 'excluir',
          label: 'Excluir condomínio',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => excluir(acoesAlvo),
        },
      ]
    : [];

  const nomePrimeiro =
    usuario?.nome?.split(' ')[0] ?? usuario?.email?.split('@')[0] ?? '';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const letra = (nomePrimeiro || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <FlatList
        data={dados}
        keyExtractor={(i) => String(i.id)}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={carregar}
            tintColor={colors.textMuted}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.marca}>TRIETEL</Text>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{letra}</Text>
              </View>
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.saudacao}>
                {saudacao}
                {nomePrimeiro ? `, ${nomePrimeiro}` : ''}
              </Text>
              <Text style={styles.titulo}>Condomínios</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {dados.length} {dados.length === 1 ? 'cadastrado' : 'cadastrados'}
              </Text>
              <Pressable
                onPress={() => navigation.navigate('NovoCondominio')}
                hitSlop={10}
                style={styles.novoBtn}
              >
                <Ionicons name="add" size={14} color={colors.textMuted} />
                <Text style={styles.novoTxt}>Novo</Text>
              </Pressable>
            </View>

            {dados.length > 0 && <View style={styles.separator} />}
          </View>
        }
        renderItem={({ item }) => (
          <CondominioRow
            item={item}
            onPress={() =>
              navigation.navigate('CondominioDetalhe', { id: item.id, nome: item.nome })
            }
            onLongPress={() => setAcoesAlvo(item)}
          />
        )}
        ListEmptyComponent={
          primeiraCarga ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : (
            <EmptyState
              icon="business-outline"
              title="Nenhum condomínio"
              subtitle="Crie seu primeiro condomínio para começar."
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 60 }}
      />

      <ActionSheet
        visible={!!acoesAlvo}
        title={acoesAlvo?.nome}
        subtitle={acoesAlvo?.endereco ?? undefined}
        items={acoes}
        onClose={() => setAcoesAlvo(null)}
      />
    </SafeAreaView>
  );
}

function CondominioRow({
  item,
  onPress,
  onLongPress,
}: {
  item: CondominioStatus;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const temOffline = item.offline > 0;
  const cor = temOffline
    ? colors.danger
    : item.total_cameras === 0
    ? colors.textSubtle
    : colors.success;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={styles.rowNome} numberOfLines={1}>
          {item.nome}
        </Text>
        {item.endereco ? (
          <Text style={styles.rowEndereco} numberOfLines={1}>
            {item.endereco}
          </Text>
        ) : null}
      </View>

      <View style={styles.rowRight}>
        <View style={styles.rowStatus}>
          <View style={[styles.statusDot, { backgroundColor: cor }]} />
          <Text style={styles.rowCount}>
            {item.online}
            <Text style={styles.rowCountMuted}>/{item.total_cameras}</Text>
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.textSubtle}
          style={{ marginLeft: 10 }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  marca: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 2,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 11, fontWeight: '600', color: colors.textMuted },

  titleBlock: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
  },
  saudacao: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: 6,
  },
  titulo: {
    ...typography.display,
    color: colors.text,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  novoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  novoTxt: { fontSize: 12, fontWeight: '500', color: colors.textMuted },

  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  rowNome: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  rowEndereco: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSubtle,
    marginTop: 3,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  rowCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  rowCountMuted: { color: colors.textSubtle, fontWeight: '400' },

  loadingWrap: { paddingTop: 80, alignItems: 'center' },
});
