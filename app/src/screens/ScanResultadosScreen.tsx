import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import {
  cadastrarCamerasEmMassa,
  cancelarScan,
  ConfiancaScan,
  mensagemErro,
  obterScanAtual,
  Scan,
  ScanResultado,
} from '@/services/api';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { colors, gradients, radius, shadows, spacing, typography } from '@/theme/theme';

type Selecao = Record<number, { selecionado: boolean; nome: string }>;

const POLL_MS = 1500;

export function ScanResultadosScreen({ route, navigation }: any) {
  const { condominio_id, condominio_nome } = route.params as {
    condominio_id: number;
    condominio_nome: string;
  };

  const toast = useToast();
  const confirmar = useConfirm();
  const [scan, setScan] = useState<Scan | null>(null);
  const [selecao, setSelecao] = useState<Selecao>({});
  const [mostrarOutros, setMostrarOutros] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregar = useCallback(async () => {
    try {
      const s = await obterScanAtual(condominio_id);
      if (!s) return;
      setScan(s);
      // Pré-preenche seleção/nomes com base nos novos resultados
      setSelecao((sel) => {
        const next = { ...sel };
        let cameraIdx = countCamerasJaNomeadas(next);
        for (const r of s.resultados) {
          if (next[r.id]) continue;
          const ehCamera = r.confianca === 'camera';
          if (ehCamera) cameraIdx++;
          next[r.id] = {
            selecionado: ehCamera,
            nome: ehCamera ? `Câmera ${String(cameraIdx).padStart(2, '0')}` : '',
          };
        }
        return next;
      });
    } catch (e) {
      // 404 = sem scan ainda; segue tentando
      const status = (e as any)?.response?.status;
      if (status && status !== 404) {
        toast.error(mensagemErro(e, 'Falha ao carregar scan'));
      }
    }
  }, [condominio_id, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Poll enquanto scan está ativo
  useEffect(() => {
    if (!scan) return;
    if (scan.status !== 'pendente' && scan.status !== 'executando') return;
    pollRef.current = setTimeout(carregar, POLL_MS);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [scan, carregar]);

  const ativo = scan?.status === 'pendente' || scan?.status === 'executando';
  const concluido = scan?.status === 'concluido';

  const { cameras, provaveis, outros } = useMemo(() => {
    const r = scan?.resultados ?? [];
    return {
      cameras: r.filter((x) => x.confianca === 'camera'),
      provaveis: r.filter((x) => x.confianca === 'provavel'),
      outros: r.filter((x) => x.confianca === 'outro' && x.online),
    };
  }, [scan]);

  function alternar(id: number) {
    setSelecao((s) => ({
      ...s,
      [id]: { ...(s[id] ?? { nome: '' }), selecionado: !s[id]?.selecionado },
    }));
  }

  function setNome(id: number, nome: string) {
    setSelecao((s) => ({
      ...s,
      [id]: { ...(s[id] ?? { selecionado: true, nome: '' }), nome },
    }));
  }

  function selecionarCameras() {
    setSelecao((s) => {
      const next = { ...s };
      cameras.forEach((c) => {
        next[c.id] = { ...(next[c.id] ?? { nome: '' }), selecionado: true };
      });
      return next;
    });
  }

  async function cadastrar() {
    const itens = Object.entries(selecao)
      .filter(([_, v]) => v.selecionado)
      .map(([idStr, v]) => {
        const id = Number(idStr);
        const r = scan?.resultados.find((x) => x.id === id);
        return r ? { ip: r.ip, nome: v.nome.trim() } : null;
      })
      .filter((x): x is { ip: string; nome: string } => !!x);

    if (itens.length === 0) {
      toast.error('Selecione pelo menos uma câmera');
      return;
    }
    const semNome = itens.find((x) => !x.nome);
    if (semNome) {
      toast.error('Todas as câmeras selecionadas precisam de um nome');
      return;
    }

    try {
      setCadastrando(true);
      const r = await cadastrarCamerasEmMassa(condominio_id, itens);
      toast.success(
        `${r.total_importadas} câmera(s) cadastradas`,
        r.total_ignoradas > 0 ? `${r.total_ignoradas} ignoradas (IP duplicado)` : undefined,
      );
      navigation.goBack();
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao cadastrar câmeras'));
    } finally {
      setCadastrando(false);
    }
  }

  async function onCancelar() {
    const ok = await confirmar({
      title: 'Cancelar scan?',
      message: 'O agente vai parar de procurar câmeras. Você pode iniciar outro scan a qualquer momento.',
      confirmText: 'Cancelar scan',
      cancelText: 'Continuar',
      destructive: true,
    });
    if (!ok) return;
    try {
      const s = await cancelarScan(condominio_id);
      setScan(s);
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao cancelar'));
    }
  }

  const totalSel = Object.values(selecao).filter((v) => v.selecionado).length;
  const pct = scan?.total_ips ? Math.min(100, (scan.progresso / scan.total_ips) * 100) : 0;

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
          <Text style={styles.condoNome} numberOfLines={1}>{condominio_nome}</Text>
          <View style={{ width: 34 }} />
        </View>

        <Text style={styles.titulo}>Scan de rede</Text>

        {/* Progresso ou status */}
        {!scan ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accentBlue} />
            <Text style={styles.loadingTxt}>Aguardando agente iniciar...</Text>
          </View>
        ) : ativo ? (
          <View style={styles.progressoCard}>
            <View style={styles.progressoTop}>
              <ActivityIndicator color={colors.accentBlue} size="small" />
              <Text style={styles.progressoLabel}>
                {scan.status === 'pendente' ? 'Aguardando agente...' : 'Escaneando...'}
              </Text>
              <Text style={styles.progressoNum}>
                {scan.progresso}/{scan.total_ips}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
            <View style={styles.statsRow}>
              <Stat valor={cameras.length} label="Câmeras" cor={colors.success} />
              <Stat valor={provaveis.length} label="Possíveis" cor={colors.warning} />
              <Stat valor={outros.length} label="Outros" cor={colors.textSubtle} />
            </View>
          </View>
        ) : concluido ? (
          <Text style={styles.concluido}>
            Scan concluído · {cameras.length + provaveis.length} dispositivo(s) com porta
            de câmera
          </Text>
        ) : (
          <Text style={styles.concluido}>
            {scan.status === 'cancelado' ? 'Scan cancelado' : 'Scan com erro'}
          </Text>
        )}
      </LinearGradient>

      {/* Lista */}
      <FlatList
        data={[]}
        keyExtractor={(_, i) => String(i)}
        renderItem={null as any}
        ListHeaderComponent={
          <View>
            {cameras.length > 0 && (
              <Secao
                titulo="Câmeras identificadas"
                subtitulo="Porta RTSP (554) aberta"
                cor={colors.success}
                icone="videocam"
                qtde={cameras.length}
              >
                {cameras.map((r) => (
                  <ResultadoCard
                    key={r.id}
                    resultado={r}
                    sel={selecao[r.id]}
                    onToggle={() => alternar(r.id)}
                    onNome={(n) => setNome(r.id, n)}
                  />
                ))}
              </Secao>
            )}

            {provaveis.length > 0 && (
              <Secao
                titulo="Possíveis câmeras"
                subtitulo="Porta HTTP aberta — verificar manualmente"
                cor={colors.warning}
                icone="help-circle"
                qtde={provaveis.length}
              >
                {provaveis.map((r) => (
                  <ResultadoCard
                    key={r.id}
                    resultado={r}
                    sel={selecao[r.id]}
                    onToggle={() => alternar(r.id)}
                    onNome={(n) => setNome(r.id, n)}
                  />
                ))}
              </Secao>
            )}

            {outros.length > 0 && (
              <View>
                <Pressable
                  style={styles.outrosToggle}
                  onPress={() => setMostrarOutros((v) => !v)}
                >
                  <Ionicons
                    name={mostrarOutros ? 'chevron-down' : 'chevron-forward'}
                    size={14}
                    color={colors.textSubtle}
                  />
                  <Text style={styles.outrosTxt}>
                    Outros dispositivos ({outros.length})
                  </Text>
                </Pressable>
                {mostrarOutros && (
                  <View>
                    {outros.map((r) => (
                      <ResultadoCard
                        key={r.id}
                        resultado={r}
                        sel={selecao[r.id]}
                        onToggle={() => alternar(r.id)}
                        onNome={(n) => setNome(r.id, n)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {scan && !ativo && cameras.length + provaveis.length + outros.length === 0 && (
              <View style={styles.vazio}>
                <Ionicons name="search" size={28} color={colors.textSubtle} />
                <Text style={styles.vazioTit}>Nenhum dispositivo encontrado</Text>
                <Text style={styles.vazioSub}>
                  Verifique se o agente está rodando na rede do condomínio.
                </Text>
              </View>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 140 }}
      />

      {/* Footer fixo */}
      <View style={styles.footer}>
        {ativo ? (
          <Button variant="danger" full icon="stop-circle-outline" onPress={onCancelar}>
            Cancelar scan
          </Button>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {cameras.length > 0 && (
              <Pressable onPress={selecionarCameras} style={styles.linkBtn} hitSlop={6}>
                <Ionicons name="checkmark-done" size={14} color={colors.accentBlue} />
                <Text style={styles.linkTxt}>
                  Selecionar só as câmeras ({cameras.length})
                </Text>
              </Pressable>
            )}
            <Button
              variant="primary"
              full
              icon="add-circle-outline"
              loading={cadastrando}
              disabled={totalSel === 0}
              onPress={cadastrar}
            >
              {totalSel > 0
                ? `Cadastrar ${totalSel} selecionada(s)`
                : 'Selecione câmeras para cadastrar'}
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ valor, label, cor }: { valor: number; label: string; cor: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValor, { color: cor }]}>{valor}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Secao({
  titulo,
  subtitulo,
  cor,
  icone,
  qtde,
  children,
}: {
  titulo: string;
  subtitulo: string;
  cor: string;
  icone: keyof typeof Ionicons.glyphMap;
  qtde: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.secao}>
      <View style={styles.secaoHeader}>
        <View style={[styles.secaoIcone, { backgroundColor: cor + '22' }]}>
          <Ionicons name={icone} size={14} color={cor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.secaoTit}>
            {titulo} <Text style={[styles.secaoQtde, { color: cor }]}>· {qtde}</Text>
          </Text>
          <Text style={styles.secaoSub}>{subtitulo}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function ResultadoCard({
  resultado,
  sel,
  onToggle,
  onNome,
}: {
  resultado: ScanResultado;
  sel?: { selecionado: boolean; nome: string };
  onToggle: () => void;
  onNome: (n: string) => void;
}) {
  const selecionado = sel?.selecionado ?? false;
  const cor = corPorConfianca(resultado.confianca);
  const chipLabel = labelPorConfianca(resultado.confianca);

  return (
    <Pressable
      style={[styles.itemCard, selecionado && styles.itemCardSel]}
      onPress={onToggle}
    >
      {/* Checkbox */}
      <View style={[styles.checkbox, selecionado && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        {selecionado && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>

      {/* Preview / placeholder */}
      <View style={styles.previewWrap}>
        {resultado.frame_base64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${resultado.frame_base64}` }}
            style={styles.preview}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.previewPlaceholder, { borderColor: cor + '40' }]}>
            <Ionicons
              name={resultado.confianca === 'outro' ? 'hardware-chip' : 'videocam'}
              size={18}
              color={cor}
            />
          </View>
        )}
      </View>

      {/* Texto e input */}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemIp}>{resultado.ip}</Text>
          <View style={[styles.chip, { backgroundColor: cor + '22' }]}>
            <View style={[styles.chipDot, { backgroundColor: cor }]} />
            <Text style={[styles.chipTxt, { color: cor }]}>{chipLabel}</Text>
          </View>
        </View>
        <View style={styles.portasRow}>
          {resultado.porta_554 && <PortaBadge label="RTSP" />}
          {resultado.porta_80 && <PortaBadge label="HTTP" />}
          {resultado.porta_8080 && <PortaBadge label="8080" />}
        </View>
        {selecionado && (
          <TextInput
            value={sel?.nome ?? ''}
            onChangeText={onNome}
            placeholder="Nome da câmera"
            placeholderTextColor={colors.textSubtle}
            style={styles.nomeInput}
          />
        )}
      </View>
    </Pressable>
  );
}

function PortaBadge({ label }: { label: string }) {
  return (
    <View style={styles.portaBadge}>
      <Text style={styles.portaTxt}>{label}</Text>
    </View>
  );
}

function corPorConfianca(c: ConfiancaScan): string {
  if (c === 'camera') return colors.success;
  if (c === 'provavel') return colors.warning;
  return colors.textSubtle;
}

function labelPorConfianca(c: ConfiancaScan): string {
  if (c === 'camera') return 'Câmera';
  if (c === 'provavel') return 'Verificar';
  return 'Outro';
}

function countCamerasJaNomeadas(sel: Selecao): number {
  return Object.values(sel).filter((v) =>
    v.nome.toLowerCase().startsWith('câmera') || v.nome.toLowerCase().startsWith('camera'),
  ).length;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerGradient: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
  condoNome: { ...typography.smallMedium, color: colors.textMuted, flex: 1, textAlign: 'center' },
  titulo: { ...typography.display, color: colors.text, marginBottom: spacing.lg },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingTxt: { fontSize: 13, color: colors.textMuted },

  progressoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  progressoTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressoLabel: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  progressoNum: { fontSize: 13, color: colors.accentBlue, fontWeight: '700', fontFamily: 'monospace' },
  barTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: 5, backgroundColor: colors.accentBlue, borderRadius: 3 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  stat: { flex: 1, alignItems: 'center' },
  statValor: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, color: colors.textSubtle, fontWeight: '600', letterSpacing: 0.5 },

  concluido: { ...typography.smallMedium, color: colors.textMuted },

  secao: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  secaoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  secaoIcone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secaoTit: { fontSize: 13, color: colors.text, fontWeight: '700' },
  secaoQtde: { fontWeight: '700' },
  secaoSub: { fontSize: 11, color: colors.textSubtle, marginTop: 1 },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  itemCardSel: {
    borderColor: 'rgba(96,165,250,0.5)',
    backgroundColor: 'rgba(96,165,250,0.06)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  previewWrap: { width: 56, height: 42, borderRadius: 8, overflow: 'hidden' },
  preview: { width: 56, height: 42, backgroundColor: '#000' },
  previewPlaceholder: {
    width: 56,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemIp: { fontSize: 13, color: colors.text, fontWeight: '700', fontFamily: 'monospace' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipTxt: { fontSize: 10, fontWeight: '700' },
  portasRow: { flexDirection: 'row', gap: 4 },
  portaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(96,165,250,0.12)',
  },
  portaTxt: {
    fontSize: 9,
    color: colors.accentBlue,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  nomeInput: {
    marginTop: 8,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    color: colors.text,
    fontSize: 13,
    backgroundColor: '#0d1117',
  },

  outrosToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  outrosTxt: { fontSize: 12, color: colors.textSubtle, fontWeight: '600' },

  vazio: { alignItems: 'center', padding: spacing.xxxl, gap: spacing.sm },
  vazioTit: { fontSize: 14, color: colors.text, fontWeight: '600', marginTop: spacing.sm },
  vazioSub: { fontSize: 12, color: colors.textSubtle, textAlign: 'center', maxWidth: 260 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#0A0A0A',
  },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  linkTxt: { fontSize: 12, color: colors.accentBlue, fontWeight: '600' },
});
