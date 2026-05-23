import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import {
  Condominio,
  EventoHistorico,
  listarCondominios,
  listarHistorico,
  mensagemErro,
} from '@/services/api';
import { useToast } from '@/components/Toast';
import { Segmented } from '@/components/Segmented';
import { EmptyState } from '@/components/EmptyState';
import { colors, gradients, radius, spacing, typography } from '@/theme/theme';

type Periodo = 'hoje' | '7d' | '30d' | 'todos';

export function HistoricoScreen() {
  const toast = useToast();
  const [itens, setItens] = useState<EventoHistorico[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [primeiraCarga, setPrimeiraCarga] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const [condominioId, setCondominioId] = useState<number | null>(null);

  async function carregar() {
    try {
      setCarregando(true);
      const inicio = calcularDataInicio(periodo);
      const [h, c] = await Promise.all([
        listarHistorico({ limite: 300, condominio_id: condominioId ?? undefined, data_inicio: inicio }),
        condominios.length === 0 ? listarCondominios() : Promise.resolve(condominios),
      ]);
      setItens(h);
      setCondominios(c);
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao carregar histórico'));
    } finally {
      setCarregando(false);
      setPrimeiraCarga(false);
    }
  }

  useFocusEffect(useCallback(() => { carregar(); }, [periodo, condominioId]));

  const alertasHoje = useMemo(() => {
    const hoje = new Date();
    return itens.filter((i) => {
      const d = new Date(i.timestamp);
      return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate();
    }).length;
  }, [itens]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0d1b4b', '#000000']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.marca}>ALERTAS</Text>
        <View style={styles.headerRow}>
          <Text style={styles.titulo}>Histórico</Text>
          <View style={styles.contadorWrap}>
            <Text style={styles.contadorNum}>{alertasHoje}</Text>
            <Text style={styles.contadorLabel}>hoje</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filtros de período */}
      <View style={styles.segmentedWrap}>
        <Segmented
          value={periodo}
          onChange={(v) => setPeriodo(v as Periodo)}
          options={[
            { value: 'hoje', label: 'Hoje' },
            { value: '7d', label: '7 dias' },
            { value: '30d', label: '30 dias' },
            { value: 'todos', label: 'Todos' },
          ]}
        />
      </View>

      {/* Filtro por condomínio */}
      {condominios.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtroCondo}
        >
          <FiltroPill ativo={condominioId === null} label="Todos" onPress={() => setCondominioId(null)} />
          {condominios.map((c) => (
            <FiltroPill key={c.id} ativo={condominioId === c.id} label={c.nome} onPress={() => setCondominioId(c.id)} />
          ))}
        </ScrollView>
      )}

      <FlatList
        data={itens}
        keyExtractor={(i) => String(i.id)}
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={colors.accentBlue} />
        }
        renderItem={({ item, index }) => (
          <EventoRow evento={item} ultimo={index === itens.length - 1} />
        )}
        ListEmptyComponent={
          primeiraCarga ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentBlue} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="time-outline"
              title="Sem eventos"
              subtitle="Eventos de câmeras aparecem aqui quando algo muda."
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 60 }}
      />
    </SafeAreaView>
  );
}

function FiltroPill({ ativo, label, onPress }: { ativo: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {ativo ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pillActive}
        >
          <Text style={styles.pillTxtActive} numberOfLines={1}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.pillIdle}>
          <Text style={styles.pillTxt} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function EventoRow({ evento, ultimo }: { evento: EventoHistorico; ultimo: boolean }) {
  const offline = evento.evento === 'offline';
  const cor = offline ? colors.danger : colors.success;
  const d = new Date(evento.timestamp);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <View style={styles.eventoRow}>
      {/* Timeline */}
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDotRing, { borderColor: cor + '40' }]}>
          <View style={[styles.timelineDot, { backgroundColor: cor }]} />
        </View>
        {!ultimo && <View style={styles.timelineLine} />}
      </View>

      {/* Card */}
      <View style={[styles.eventoCard, { borderLeftColor: cor + '50' }]}>
        <View style={styles.eventoHead}>
          <View style={styles.eventoLabelRow}>
            <View style={[styles.eventoIconCircle, { backgroundColor: cor + '20' }]}>
              <Ionicons
                name={offline ? 'arrow-down' : 'arrow-up'}
                size={10}
                color={cor}
              />
            </View>
            <Text style={[styles.eventoLabel, { color: cor }]}>
              {offline ? 'Câmera caiu' : 'Câmera voltou'}
            </Text>
          </View>
          <Text style={styles.eventoHora}>{hora} · {data}</Text>
        </View>
        <Text style={styles.eventoNome} numberOfLines={1}>{evento.camera_nome}</Text>
        <View style={styles.eventoMeta}>
          <Text style={styles.eventoCondo} numberOfLines={1}>{evento.condominio_nome}</Text>
          <Text style={styles.eventoSep}>·</Text>
          <Text style={styles.eventoIp}>{evento.camera_ip}</Text>
        </View>
      </View>
    </View>
  );
}

function calcularDataInicio(p: Periodo): string | undefined {
  const agora = new Date();
  if (p === 'todos') return undefined;
  const d = new Date(agora);
  if (p === 'hoje') d.setHours(0, 0, 0, 0);
  else if (p === '7d') d.setDate(agora.getDate() - 7);
  else if (p === '30d') d.setDate(agora.getDate() - 30);
  return d.toISOString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  marca: { fontSize: 11, fontWeight: '600', color: colors.accentBlue, letterSpacing: 3, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  titulo: { fontSize: 34, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  contadorWrap: { alignItems: 'flex-end', paddingBottom: 4 },
  contadorNum: { fontSize: 32, fontWeight: '800', color: colors.accentBlue, letterSpacing: -1, lineHeight: 34 },
  contadorLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  segmentedWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },

  filtroCondo: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.sm },
  pillActive: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
  pillIdle: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  pillTxt: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  pillTxtActive: { fontSize: 12, fontWeight: '600', color: '#fff' },

  eventoRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  timelineCol: { alignItems: 'center', width: 20, paddingTop: 4 },
  timelineDotRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: { width: 7, height: 7, borderRadius: 4 },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: 'rgba(96,165,250,0.2)',
    marginTop: 4,
    marginBottom: -spacing.md,
  },

  eventoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  eventoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventoIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventoLabel: { fontSize: 11, fontWeight: '600' },
  eventoHora: { fontSize: 11, color: colors.textSubtle },
  eventoNome: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  eventoMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventoCondo: { fontSize: 12, color: colors.textMuted },
  eventoSep: { fontSize: 11, color: colors.textDisabled },
  eventoIp: { fontSize: 12, color: colors.textSubtle, fontFamily: 'monospace' },

  loadingWrap: { paddingTop: 80, alignItems: 'center' },
});
