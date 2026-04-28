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
import { colors, spacing, typography } from '@/theme/theme';

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
        listarHistorico({
          limite: 300,
          condominio_id: condominioId ?? undefined,
          data_inicio: inicio,
        }),
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

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [periodo, condominioId]),
  );

  const alertasHoje = useMemo(() => {
    const hoje = new Date();
    return itens.filter((i) => {
      const d = new Date(i.timestamp);
      return (
        d.getFullYear() === hoje.getFullYear() &&
        d.getMonth() === hoje.getMonth() &&
        d.getDate() === hoje.getDate()
      );
    }).length;
  }, [itens]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.marca}>ALERTAS</Text>
        <Text style={styles.contadorHoje}>
          {alertasHoje}
          <Text style={styles.contadorLabel}> hoje</Text>
        </Text>
      </View>

      <Text style={styles.titulo}>Histórico</Text>

      <View style={styles.segmentedWrap}>
        <Segmented
          value={periodo}
          onChange={(v) => setPeriodo(v as Periodo)}
          options={[
            { value: 'hoje', label: 'Hoje' },
            { value: '7d', label: '7d' },
            { value: '30d', label: '30d' },
            { value: 'todos', label: 'Todos' },
          ]}
        />
      </View>

      {condominios.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtroCondo}
        >
          <FiltroPill
            ativo={condominioId === null}
            label="Todos"
            onPress={() => setCondominioId(null)}
          />
          {condominios.map((c) => (
            <FiltroPill
              key={c.id}
              ativo={condominioId === c.id}
              label={c.nome}
              onPress={() => setCondominioId(c.id)}
            />
          ))}
        </ScrollView>
      )}

      <FlatList
        data={itens}
        keyExtractor={(i) => String(i.id)}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={carregar}
            tintColor={colors.textMuted}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item, index }) => (
          <EventoRow evento={item} ultimo={index === itens.length - 1} />
        )}
        ListEmptyComponent={
          primeiraCarga ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.textMuted} />
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

function FiltroPill({
  ativo,
  label,
  onPress,
}: {
  ativo: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.pill}>
      <Text style={[styles.pillTxt, ativo && styles.pillTxtActive]} numberOfLines={1}>
        {label}
      </Text>
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
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, { backgroundColor: cor }]} />
        {!ultimo && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.eventoContent}>
        <View style={styles.eventoHead}>
          <View style={styles.eventoLabelRow}>
            <Ionicons
              name={offline ? 'arrow-down' : 'arrow-up'}
              size={11}
              color={cor}
            />
            <Text style={[styles.eventoLabel, { color: cor }]}>
              {offline ? 'Caiu' : 'Voltou'}
            </Text>
          </View>
          <Text style={styles.eventoHora}>
            {hora} · {data}
          </Text>
        </View>
        <Text style={styles.eventoNome} numberOfLines={1}>
          {evento.camera_nome}
        </Text>
        <View style={styles.eventoMeta}>
          <Text style={styles.eventoCondo} numberOfLines={1}>
            {evento.condominio_nome}
          </Text>
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
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  marca: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 1.5,
  },
  contadorHoje: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  contadorLabel: { fontWeight: '400', color: colors.textSubtle },

  titulo: {
    ...typography.display,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },

  segmentedWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },

  filtroCondo: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.xl,
  },
  pill: { paddingVertical: 4, maxWidth: 180 },
  pillTxt: { fontSize: 12, fontWeight: '400', color: colors.textSubtle },
  pillTxtActive: { color: colors.text, fontWeight: '500' },

  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.xl + 24,
    marginRight: spacing.xl,
  },

  eventoRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  timelineCol: { alignItems: 'center', width: 12, paddingTop: 6 },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 6,
    marginBottom: -spacing.md,
  },
  eventoContent: { flex: 1 },
  eventoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventoLabel: { fontSize: 11, fontWeight: '500' },
  eventoHora: { fontSize: 11, color: colors.textSubtle },
  eventoNome: { fontSize: 14, fontWeight: '500', color: colors.text },
  eventoMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  eventoCondo: { fontSize: 12, color: colors.textMuted },
  eventoSep: { fontSize: 11, color: colors.textDisabled },
  eventoIp: { fontSize: 12, color: colors.textSubtle, fontFamily: 'monospace' },

  loadingWrap: { paddingTop: 80, alignItems: 'center' },
});
