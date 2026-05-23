import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import {
  iniciarScan,
  mensagemErro,
  obterRedeAgente,
  RedeInfo,
} from '@/services/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { colors, gradients, radius, shadows, spacing, typography } from '@/theme/theme';

type Props = {
  visible: boolean;
  condominioId: number;
  onClose: () => void;
  onIniciado: (scanId: number) => void;
};

export function ScanRedeModal({ visible, condominioId, onClose, onIniciado }: Props) {
  const toast = useToast();
  const [carregando, setCarregando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [rede, setRede] = useState<RedeInfo | null>(null);
  const [editar, setEditar] = useState(false);
  const [ipInicio, setIpInicio] = useState('');
  const [ipFim, setIpFim] = useState('');

  useEffect(() => {
    if (!visible) return;
    setEditar(false);
    setIpInicio('');
    setIpFim('');
    carregarRede();
  }, [visible, condominioId]);

  async function carregarRede() {
    try {
      setCarregando(true);
      const r = await obterRedeAgente(condominioId);
      setRede(r);
      if (r.faixa_inicio) setIpInicio(r.faixa_inicio);
      if (r.faixa_fim) setIpFim(r.faixa_fim);
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao detectar rede'));
    } finally {
      setCarregando(false);
    }
  }

  async function iniciar(usarSugerido: boolean) {
    let inicio = ipInicio.trim();
    let fim = ipFim.trim();
    if (usarSugerido && rede?.faixa_inicio && rede?.faixa_fim) {
      inicio = rede.faixa_inicio;
      fim = rede.faixa_fim;
    }
    if (!inicio || !fim) {
      toast.error('Informe IP de início e fim');
      return;
    }
    try {
      setIniciando(true);
      const scan = await iniciarScan(condominioId, inicio, fim);
      onIniciado(scan.id);
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao iniciar scan'));
    } finally {
      setIniciando(false);
    }
  }

  const temSugestao = !!(rede?.faixa_inicio && rede?.faixa_fim);
  const subrede = rede?.ip_agente
    ? rede.ip_agente.split('.').slice(0, 3).join('.') + '.x'
    : null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <LinearGradient
            colors={gradients.primaryDiag}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerIcon}>
              <Ionicons name="wifi" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>Escanear rede</Text>
              <Text style={styles.subtitulo}>
                Descobre câmeras automaticamente na rede do condomínio
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.fechar}>
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </LinearGradient>

          {/* Body */}
          <View style={styles.body}>
            {carregando ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.accentBlue} />
                <Text style={styles.loadingTxt}>Detectando rede do agente...</Text>
              </View>
            ) : !temSugestao ? (
              <View style={styles.aviso}>
                <Ionicons name="alert-circle" size={18} color={colors.warning} />
                <Text style={styles.avisoTxt}>
                  Não foi possível detectar a rede automaticamente. O agente está
                  online? Informe a faixa manualmente.
                </Text>
              </View>
            ) : !editar ? (
              <View style={styles.detectadaCard}>
                <Text style={styles.label}>REDE DETECTADA</Text>
                <Text style={styles.subrede}>{subrede}</Text>
                <View style={styles.faixaRow}>
                  <View style={styles.faixaItem}>
                    <Text style={styles.faixaLabel}>De</Text>
                    <Text style={styles.faixaValor}>{rede?.faixa_inicio}</Text>
                  </View>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={colors.textSubtle}
                    style={{ marginTop: 14 }}
                  />
                  <View style={styles.faixaItem}>
                    <Text style={styles.faixaLabel}>Até</Text>
                    <Text style={styles.faixaValor}>{rede?.faixa_fim}</Text>
                  </View>
                </View>
                <Text style={styles.totalIps}>
                  {totalIps(rede?.faixa_inicio, rede?.faixa_fim)} endereços para verificar
                </Text>
              </View>
            ) : null}

            {(editar || !temSugestao) && !carregando ? (
              <View style={{ marginTop: spacing.md }}>
                <Input
                  label="IP de início"
                  icon="enter-outline"
                  placeholder="192.168.1.1"
                  value={ipInicio}
                  onChangeText={setIpInicio}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
                <Input
                  label="IP final"
                  icon="exit-outline"
                  placeholder="192.168.1.254"
                  value={ipFim}
                  onChangeText={setIpFim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            ) : null}

            {/* Ações */}
            <View style={styles.acoes}>
              {temSugestao && !editar ? (
                <>
                  <Button
                    variant="primary"
                    full
                    icon="search"
                    loading={iniciando}
                    onPress={() => iniciar(true)}
                  >
                    Usar essa faixa
                  </Button>
                  <Pressable
                    onPress={() => setEditar(true)}
                    style={styles.linkBtn}
                    hitSlop={6}
                  >
                    <Ionicons name="create-outline" size={14} color={colors.accentBlue} />
                    <Text style={styles.linkTxt}>Personalizar faixa</Text>
                  </Pressable>
                </>
              ) : (
                <Button
                  variant="primary"
                  full
                  icon="search"
                  loading={iniciando}
                  disabled={!ipInicio || !ipFim}
                  onPress={() => iniciar(false)}
                >
                  Iniciar scan
                </Button>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function totalIps(inicio?: string | null, fim?: string | null): number {
  if (!inicio || !fim) return 0;
  const n = (s: string) =>
    s.split('.').reduce((acc, oct) => acc * 256 + Number(oct || 0), 0);
  try {
    return Math.max(0, n(fim) - n(inicio) + 1);
  } catch {
    return 0;
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.blue,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { ...typography.h2, color: '#fff' },
  subtitulo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    lineHeight: 16,
  },
  fechar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  body: { padding: spacing.lg },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  loadingTxt: { fontSize: 13, color: colors.textMuted },

  aviso: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  avisoTxt: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  detectadaCard: {
    backgroundColor: 'rgba(96,165,250,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.18)',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.accentBlue,
    marginBottom: 6,
  },
  subrede: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'monospace',
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  faixaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  faixaItem: { flex: 1 },
  faixaLabel: { fontSize: 10, color: colors.textSubtle, fontWeight: '600' },
  faixaValor: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  totalIps: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: spacing.md,
  },

  acoes: { marginTop: spacing.lg, gap: spacing.md, alignItems: 'center' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  linkTxt: { fontSize: 12, color: colors.accentBlue, fontWeight: '600' },
});
