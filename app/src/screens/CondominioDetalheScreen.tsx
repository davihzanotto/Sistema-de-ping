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
import { LinearGradient } from 'expo-linear-gradient';
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
import { ScanRedeModal } from '@/components/ScanRedeModal';
import { Segmented } from '@/components/Segmented';
import { EmptyState } from '@/components/EmptyState';
import { colors, gradients, radius, shadows, spacing, typography } from '@/theme/theme';

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
  const [scanAberto, setScanAberto] = useState(false);
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
    const fl = filtro === 'todos' ? cameras : cameras.filter((c) => c.status === filtro);
    return { online: on, offline: off, filtradas: fl };
  }, [cameras, filtro]);

  async function excluirCondo() {
    const ok = await confirmar({
      title: `Excluir ${nome}?`,
      message: 'Excluir vai remover todas as câmeras e o histórico deste condomínio. Esta ação não pode ser desfeita.',
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
      message: 'A câmera será removida e não aparecerá mais no monitoramento. Esta ação não pode ser desfeita.',
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
    { key: 'scan', label: 'Escanear rede', icon: 'wifi', onPress: () => setScanAberto(true) },
    { key: 'token', label: 'Ver token do agente', icon: 'key-outline', onPress: () => setTokenAberto(true) },
    { key: 'editar', label: 'Editar condomínio', icon: 'create-outline', onPress: () => navigation.navigate('EditarCondominio', { id }) },
    { key: 'excluir', label: 'Excluir condomínio', icon: 'trash-outline', destructive: true, onPress: excluirCondo },
  ];

  const acoesCamera: ActionItem[] = cameraAlvo
    ? [
        { key: 'editar', label: 'Editar câmera', icon: 'create-outline', onPress: () => navigation.navigate('EditarCamera', { id: cameraAlvo.id, nome: cameraAlvo.nome, ip: cameraAlvo.ip }) },
        { key: 'excluir', label: 'Excluir câmera', icon: 'trash-outline', destructive: true, onPress: () => excluirCam(cameraAlvo) },
      ]
    : [];

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0d1b4b', '#000000']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setScanAberto(true)}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Ionicons name="wifi" size={16} color={colors.accentBlue} />
              <Text style={styles.headerBtnTxt}>Escanear</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('NovaCamera', { condominio_id: id, nome })}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <Ionicons name="add" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => setMenuCondoAberto(true)} hitSlop={10} style={styles.headerIconBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.titulo} numberOfLines={1}>{nome}</Text>
        <Text style={styles.atualizado}>
          {atualizadoEm ? `Atualizado ${formatarHora(atualizadoEm)}` : 'Carregando...'}
        </Text>

        {/* Resumo cards */}
        <View style={styles.resumoRow}>
          <ResumoCard label="Total" valor={cameras.length} cor={colors.accentBlue} />
          <ResumoCard label="Online" valor={online} cor={colors.success} />
          <ResumoCard label="Offline" valor={offline} cor={colors.danger} />
        </View>
      </LinearGradient>

      {/* Filtros */}
      <View style={styles.filtrosWrap}>
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
          <RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={colors.accentBlue} />
        }
        renderItem={({ item }) => (
          <CameraCard
            camera={item}
            onLongPress={() => setCameraAlvo(item)}
            onExcluir={() => excluirCam(item)}
          />
        )}
        ListEmptyComponent={
          primeiraCarga ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentBlue} size="large" />
            </View>
          ) : cameras.length === 0 ? (
            <EmptyState icon="videocam-outline" title="Nenhuma câmera" subtitle="Adicione câmeras pelo botão acima." />
          ) : (
            <EmptyState icon="filter-outline" title="Nenhum resultado neste filtro" />
          )
        }
        contentContainerStyle={{ paddingBottom: 60, paddingTop: spacing.md }}
      />

      <ActionSheet visible={menuCondoAberto} title={nome} items={acoesCondo} onClose={() => setMenuCondoAberto(false)} />
      <ActionSheet visible={!!cameraAlvo} title={cameraAlvo?.nome} subtitle={cameraAlvo?.ip} items={acoesCamera} onClose={() => setCameraAlvo(null)} />
      <TokenModal visible={tokenAberto} condominioId={id} onClose={() => setTokenAberto(false)} />
      <ScanRedeModal
        visible={scanAberto}
        condominioId={id}
        onClose={() => setScanAberto(false)}
        onIniciado={() => {
          setScanAberto(false);
          navigation.navigate('ScanResultados', { condominio_id: id, condominio_nome: nome });
        }}
      />
    </SafeAreaView>
  );
}

function ResumoCard({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <View style={[styles.resumoCard, { borderColor: cor + '30' }]}>
      <Text style={[styles.resumoValor, { color: cor }]}>{valor}</Text>
      <Text style={styles.resumoLabel}>{label}</Text>
    </View>
  );
}

function CameraCard({
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

  const statusTxt =
    camera.status === 'online' ? 'Online' : camera.status === 'offline' ? 'Offline' : '—';

  const metaTexto = (() => {
    if (camera.status === 'offline' && camera.ultimo_ping) {
      return `Offline há ${formatarDuracao(new Date(camera.ultimo_ping))}`;
    }
    if (!camera.ultimo_ping) return 'Aguardando primeiro ping';
    return `Visto ${formatarHora(new Date(camera.ultimo_ping))}`;
  })();

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <Pressable
          style={styles.swipeAction}
          onPress={() => { swipeRef.current?.close(); onExcluir(); }}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.swipeActionTxt}>Excluir</Text>
        </Pressable>
      )}
      rightThreshold={48}
      friction={2}
      overshootRight={false}
    >
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={({ pressed }) => [styles.camCard, pressed && { opacity: 0.75 }]}
      >
        <View style={[styles.camAccent, { backgroundColor: cor }]} />
        <View style={styles.camBody}>
          <View style={styles.camHeader}>
            <Ionicons name="videocam" size={13} color={colors.textSubtle} style={{ marginRight: 6 }} />
            <Text style={styles.camNome} numberOfLines={1}>{camera.nome}</Text>
            <View style={[styles.camStatusPill, { backgroundColor: cor + '20' }]}>
              <View style={[styles.camDot, { backgroundColor: cor }]} />
              <Text style={[styles.camStatusTxt, { color: cor }]}>{statusTxt}</Text>
            </View>
          </View>
          <Text style={styles.camIp}>{camera.ip}</Text>
          <Text style={[styles.camMeta, camera.status === 'offline' && { color: colors.danger }]}>
            {metaTexto}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function formatarHora(d: Date) {
  const diff = Date.now() - d.getTime();
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
  container: { flex: 1, backgroundColor: '#000000' },

  headerGradient: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.25)',
  },
  headerBtnTxt: { fontSize: 12, fontWeight: '600', color: colors.accentBlue },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titulo: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.8, marginBottom: 4 },
  atualizado: { ...typography.small, color: colors.textSubtle, marginBottom: spacing.xl },

  resumoRow: { flexDirection: 'row', gap: spacing.md },
  resumoCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  resumoValor: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  resumoLabel: { fontSize: 11, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },

  filtrosWrap: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },

  camCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  camAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  camBody: { paddingVertical: spacing.md, paddingRight: spacing.lg, paddingLeft: spacing.lg + 3 },
  camHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  camNome: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  camStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  camDot: { width: 5, height: 5, borderRadius: 3 },
  camStatusTxt: { fontSize: 11, fontWeight: '600' },
  camIp: { fontSize: 12, color: colors.textSubtle, fontFamily: 'monospace', marginBottom: 3 },
  camMeta: { fontSize: 12, color: colors.textMuted },

  swipeAction: {
    backgroundColor: colors.danger,
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: spacing.sm,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  swipeActionTxt: { color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },

  loadingWrap: { paddingTop: 80, alignItems: 'center' },
});
