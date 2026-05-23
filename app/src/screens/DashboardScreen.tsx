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
import { LinearGradient } from 'expo-linear-gradient';
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
import { colors, gradients, radius, shadows, spacing, typography } from '@/theme/theme';

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

  useFocusEffect(useCallback(() => { carregar(); }, []));

  async function excluir(condo: CondominioStatus) {
    const ok = await confirmar({
      title: `Excluir ${condo.nome}?`,
      message: 'Excluir vai remover todas as câmeras e o histórico deste condomínio. Esta ação não pode ser desfeita.',
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
          onPress: () => navigation.navigate('EditarCondominio', { id: acoesAlvo.id }),
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

  const nomePrimeiro = usuario?.nome?.split(' ')[0] ?? usuario?.email?.split('@')[0] ?? '';
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
            tintColor={colors.accentBlue}
          />
        }
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={['#0d1b4b', '#000000']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerTop}>
                <Text style={styles.marca}>TRIETEL</Text>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{letra}</Text>
                </View>
              </View>
              <Text style={styles.saudacao}>
                {saudacao}{nomePrimeiro ? `, ${nomePrimeiro}` : ''}
              </Text>
              <Text style={styles.titulo}>Condomínios</Text>
            </LinearGradient>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {dados.length} {dados.length === 1 ? 'cadastrado' : 'cadastrados'}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <CondominioCard
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
              <ActivityIndicator color={colors.accentBlue} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="business-outline"
              title="Nenhum condomínio"
              subtitle="Toque no + para criar seu primeiro condomínio."
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Pressable
        onPress={() => navigation.navigate('NovoCondominio')}
        style={styles.fabWrap}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

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

function CondominioCard({
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

  const legenda = temOffline
    ? `${item.offline} câmera${item.offline > 1 ? 's' : ''} offline`
    : item.total_cameras === 0
    ? 'Sem câmeras cadastradas'
    : 'Todas online';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      <View style={[styles.cardAccent, { backgroundColor: cor }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={styles.cardNome} numberOfLines={1}>{item.nome}</Text>
            {item.endereco ? (
              <Text style={styles.cardEndereco} numberOfLines={1}>{item.endereco}</Text>
            ) : null}
          </View>
          <View style={styles.cardCount}>
            <Text style={[styles.countNum, { color: cor }]}>{item.online}</Text>
            <Text style={styles.countTotal}>/{item.total_cameras}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={[styles.legendaPill, { backgroundColor: cor + '18' }]}>
            <View style={[styles.legendaDot, { backgroundColor: cor }]} />
            <Text style={[styles.legendaTxt, { color: cor }]}>{legenda}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textSubtle} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  marca: { fontSize: 12, fontWeight: '700', color: colors.accentBlue, letterSpacing: 4 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26,86,219,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(96,165,250,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 14, fontWeight: '700', color: colors.accentBlue },
  saudacao: { ...typography.small, color: colors.textMuted, marginBottom: 6 },
  titulo: { fontSize: 34, fontWeight: '800', color: colors.text, letterSpacing: -1 },

  sectionHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  card: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  cardContent: {
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg,
    paddingLeft: spacing.lg + 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardNome: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardEndereco: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  cardCount: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  countNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  countTotal: { fontSize: 14, color: colors.textSubtle, fontWeight: '400', paddingBottom: 2 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  legendaDot: { width: 5, height: 5, borderRadius: 3 },
  legendaTxt: { fontSize: 11, fontWeight: '500' },

  fabWrap: {
    position: 'absolute',
    bottom: 32,
    right: spacing.xl,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.blue,
  },

  loadingWrap: { paddingTop: 80, alignItems: 'center' },
});
