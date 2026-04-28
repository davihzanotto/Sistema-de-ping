import { useCallback, useMemo, useRef, useState } from 'react';
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
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  Camera,
  excluirCamera,
  excluirCondominio,
  listarCameras,
  mensagemErro,
} from '@/services/api';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { ActionSheet, ActionItem } from '@/components/ActionSheet';
import { TokenModal } from '@/components/TokenModal';
import { Segmented } from '@/components/Segmented';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing, typography } from '@/theme/theme';

type Filtro = 'todos' | 'online' | 'offline';

export function CondominioDetalheScreen({ route, navigation }: any) {
  const { id, nome } = route.params;
  const toast = useToast();
  const confirmar = useConfirm();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [primeiraCarga, setPrimeiraCarga] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [menuCondoAberto, setMenuCondoAberto] = useState(false);
  const [tokenAberto, setTokenAberto] = useState(false);
  const [cameraAlvo, setCameraAlvo] = useState<Camera | null>(null);

  async function carregar() {
    try {
      setCarregando(true);
      const d = await listarCameras(id);
      setCameras(d);
      setAtualizadoEm(new Date());
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao carregar câmeras'));
    } finally {
      setCarregando(false);
      setPrimeiraCarga(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: nome });
      carregar();
    }, [id]),
  );

  const { online, offline, filtradas } = useMemo(() => {
    const on = cameras.filter((c) => c.status === 'online').length;
    const off = cameras.filter((c) => c.status === 'offline').length;
    const fl =
      filtro === 'todos' ? cameras : cameras.filter((c) => c.status === filtro);
    return { online: on, offline: off, filtradas: fl };
  }, [cameras, filtro]);

  async function excluirCondo() {
    const ok = await confirmar({
      title: `Excluir ${nome}?`,
      message:
        'Excluir vai remover todas as câmeras e o histórico deste condomínio. Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await excluirCondominio(id);
      toast.success('Condomínio excluído');
      navigation.goBack();
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao excluir condomínio'));
    }
  }

  async function excluirCam(camera: Camera) {
    const ok = await confirmar({
      title: `Excluir ${camera.nome}?`,
      message:
        'A câmera será removida e não aparecerá mais no monitoramento. Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await excluirCamera(camera.id);
      toast.success('Câmera excluída');
      setCameras((c) => c.filter((x) => x.id !== camera.id));
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao excluir câmera'));
    }
  }

  const acoesCondo: ActionItem[] = [
    {
      key: 'token',
      label: 'Ver token do agente',
      icon: 'key-outline',
      onPress: () => setTokenAberto(true),
    },
    {
      key: 'editar',
      label: 'Editar condomínio',
      icon: 'create-outline',
      onPress: () => navigation.navigate('EditarCondominio', { id }),
    },
    {
      key: 'excluir',
      label: 'Excluir condomínio',
      icon: 'trash-outline',
      destructive: true,
      onPress: excluirCondo,
    },
  ];

  const acoesCamera: ActionItem[] = cameraAlvo
    ? [
        {
          key: 'editar',
          label: 'Editar câmera',
          icon: 'create-outline',
          onPress: () =>
            navigation.navigate('EditarCamera', {
              id: cameraAlvo.id,
              nome: cameraAlvo.nome,
              ip: cameraAlvo.ip,
            }),
        },
        {
          key: 'excluir',
          label: 'Excluir câmera',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => excluirCam(cameraAlvo),
        },
      ]
    : [];

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <Pressable
            onPress={() => navigation.navigate('NovaCamera', { condominio_id: id, nome })}
            hitSlop={10}
            style={styles.novoBtn}
          >
            <Ionicons name="add" size={14} color={colors.textMuted} />
            <Text style={styles.novoTxt}>Câmera</Text>
          </Pressable>
          <Pressable onPress={() => setMenuCondoAberto(true)} hitSlop={10}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.titulo} numberOfLines={1}>
          {nome}
        </Text>
        <View style={styles.subRow}>
          <Text style={styles.atualizado}>
            {atualizadoEm ? `Atualizado ${formatarHora(atualizadoEm)}` : 'Carregando...'}
          </Text>
          <Pressable onPress={() => setTokenAberto(true)} hitSlop={6} style={styles.tokenLink}>
            <Ionicons name="key-outline" size={11} color={colors.textSubtle} />
            <Text style={styles.tokenLinkTxt}>Ver token do agente</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.resumoRow}>
        <ResumoCard label="Total" valor={cameras.length} accent={colors.textSubtle} />
        <ResumoCard label="Online" valor={online} accent={colors.success} />
        <ResumoCard label="Offline" valor={offline} accent={colors.danger} />
      </View>

      <View style={styles.segmentedWrap}>
        <Segmented
          value={filtro}
          onChange={(v) => setFiltro(v as Filtro)}
          options={[
            { value: 'todos', label: `Todas · ${cameras.length}` },
            { value: 'online', label: `Online · ${online}` },
            { value: 'offline', label: `Offline · ${offline}` },
          ]}
        />
      </View>

      <FlatList
        data={filtradas}
        keyExtractor={(i) => String(i.id)}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={carregar}
            tintColor={colors.textMuted}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <CameraRow
            camera={item}
            onLongPress={() => setCameraAlvo(item)}
            onExcluir={() => excluirCam(item)}
          />
        )}
        ListEmptyComponent={
          primeiraCarga ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : cameras.length === 0 ? (
            <EmptyState
              icon="videocam-outline"
              title="Nenhuma câmera"
              subtitle="Adicione câmeras pelo botão acima."
            />
          ) : (
            <EmptyState icon="filter-outline" title="Nenhum resultado neste filtro" />
          )
        }
        contentContainerStyle={{ paddingBottom: 60 }}
      />

      <ActionSheet
        visible={menuCondoAberto}
        title={nome}
        items={acoesCondo}
        onClose={() => setMenuCondoAberto(false)}
      />
      <ActionSheet
        visible={!!cameraAlvo}
        title={cameraAlvo?.nome}
        subtitle={cameraAlvo?.ip}
        items={acoesCamera}
        onClose={() => setCameraAlvo(null)}
      />
      <TokenModal
        visible={tokenAberto}
        condominioId={id}
        onClose={() => setTokenAberto(false)}
      />
    </SafeAreaView>
  );
}

function ResumoCard({
  label,
  valor,
  accent,
}: {
  label: string;
  valor: number;
  accent: string;
}) {
  return (
    <View style={styles.resumoCard}>
      <View style={[styles.resumoAccent, { backgroundColor: accent }]} />
      <Text style={styles.resumoLabel}>{label}</Text>
      <Text style={styles.resumoValor}>{valor}</Text>
    </View>
  );
}

function CameraRow({
  camera,
  onLongPress,
  onExcluir,
}: {
  camera: Camera;
  onLongPress: () => void;
  onExcluir: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const cor =
    camera.status === 'online'
      ? colors.success
      : camera.status === 'offline'
      ? colors.danger
      : colors.textSubtle;

  const metaTexto = (() => {
    if (camera.status === 'offline' && camera.ultimo_ping) {
      const delta = formatarDuracao(new Date(camera.ultimo_ping));
      return `Offline há ${delta}`;
    }
    if (!camera.ultimo_ping) return 'Aguardando primeiro ping';
    return `Visto ${formatarHora(new Date(camera.ultimo_ping))}`;
  })();

  function renderRightActions() {
    return (
      <Pressable
        style={styles.swipeAction}
        onPress={() => {
          swipeRef.current?.close();
          onExcluir();
        }}
      >
        <Ionicons name="trash-outline" size={18} color="#fff" />
        <Text style={styles.swipeActionTxt}>Excluir</Text>
      </Pressable>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={48}
      friction={2}
      overshootRight={false}
    >
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={({ pressed }) => [
          styles.camRow,
          pressed && { backgroundColor: colors.surface },
        ]}
      >
        <View style={[styles.camDot, { backgroundColor: cor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.camNome} numberOfLines={1}>
            {camera.nome}
          </Text>
          <View style={styles.camMetaRow}>
            <Text style={styles.camIp}>{camera.ip}</Text>
            <Text style={styles.camSep}>·</Text>
            <Text
              style={[
                styles.camMeta,
                camera.status === 'offline' && { color: colors.danger },
              ]}
            >
              {metaTexto}
            </Text>
          </View>
        </View>
        <Text style={[styles.camStatus, { color: cor }]}>
          {camera.status === 'online'
            ? 'online'
            : camera.status === 'offline'
            ? 'offline'
            : '—'}
        </Text>
      </Pressable>
    </Swipeable>
  );
}

function formatarHora(d: Date) {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'agora';
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatarDuracao(desde: Date) {
  const diff = Math.max(0, Date.now() - desde.getTime());
  if (diff < 60_000) return 'menos de 1 min';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) {
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  const dias = Math.floor(diff / 86_400_000);
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  novoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  novoTxt: { fontSize: 12, fontWeight: '500', color: colors.textMuted },

  titleBlock: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  titulo: { ...typography.display, color: colors.text },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  atualizado: { ...typography.small, color: colors.textSubtle },
  tokenLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tokenLinkTxt: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },

  resumoRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  resumoCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.md + 3,
    position: 'relative',
    overflow: 'hidden',
  },
  resumoAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
  },
  resumoLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSubtle,
    marginBottom: 6,
  },
  resumoValor: {
    ...typography.numberLarge,
    color: colors.text,
  },

  segmentedWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.sm },

  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },

  camRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  camDot: { width: 6, height: 6, borderRadius: 3 },
  camNome: { fontSize: 14, fontWeight: '500', color: colors.text },
  camMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  camIp: { fontSize: 12, color: colors.textSubtle, fontFamily: 'monospace' },
  camSep: { color: colors.textDisabled, fontSize: 11 },
  camMeta: { fontSize: 12, color: colors.textSubtle },
  camStatus: { fontSize: 11, fontWeight: '500' },

  swipeAction: {
    backgroundColor: colors.danger,
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeActionTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  loadingWrap: { paddingTop: 80, alignItems: 'center' },
});
