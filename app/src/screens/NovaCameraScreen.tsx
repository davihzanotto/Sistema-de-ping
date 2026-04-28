import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

import {
  criarCamera,
  importarFaixa,
  importarPlanilha,
  mensagemErro,
} from '@/services/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Segmented } from '@/components/Segmented';
import { useToast } from '@/components/Toast';
import { colors, radius, spacing, typography } from '@/theme/theme';

type Modo = 'manual' | 'faixa' | 'planilha';

const IP_REGEX = /^((25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[01]?\d?\d)$/;

export function NovaCameraScreen({ route, navigation }: any) {
  const { condominio_id, nome: nomeCondominio } = route.params;
  const toast = useToast();
  const [modo, setModo] = useState<Modo>('manual');
  const [carregando, setCarregando] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.label}>NOVA CÂMERA</Text>
        <Text style={styles.titulo}>Cadastrar câmeras</Text>
        {nomeCondominio && (
          <Text style={styles.subtitulo} numberOfLines={1}>
            {nomeCondominio}
          </Text>
        )}
      </View>

      <View style={styles.segmentedWrap}>
        <Segmented
          value={modo}
          onChange={(v) => setModo(v as Modo)}
          options={[
            { value: 'manual', label: 'Manual' },
            { value: 'faixa', label: 'Faixa IP' },
            { value: 'planilha', label: 'CSV' },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {modo === 'manual' && (
            <AbaManual
              condominio_id={condominio_id}
              carregando={carregando}
              setCarregando={setCarregando}
              onSucesso={(msg) => {
                toast.success(msg);
                navigation.goBack();
              }}
              onErro={(m) => toast.error(m)}
            />
          )}
          {modo === 'faixa' && (
            <AbaFaixa
              condominio_id={condominio_id}
              carregando={carregando}
              setCarregando={setCarregando}
              onSucesso={(msg) => {
                toast.success(msg);
                navigation.goBack();
              }}
              onErro={(m) => toast.error(m)}
            />
          )}
          {modo === 'planilha' && (
            <AbaPlanilha
              condominio_id={condominio_id}
              carregando={carregando}
              setCarregando={setCarregando}
              onSucesso={(msg) => {
                toast.success(msg);
                navigation.goBack();
              }}
              onErro={(m) => toast.error(m)}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AbaManual({
  condominio_id,
  carregando,
  setCarregando,
  onSucesso,
  onErro,
}: {
  condominio_id: number;
  carregando: boolean;
  setCarregando: (v: boolean) => void;
  onSucesso: (m: string) => void;
  onErro: (m: string) => void;
}) {
  const [nome, setNome] = useState('');
  const [ip, setIp] = useState('');
  const [erroNome, setErroNome] = useState<string | undefined>();
  const [erroIp, setErroIp] = useState<string | undefined>();

  const ipOk = IP_REGEX.test(ip);
  const nomeOk = nome.trim().length >= 2;

  async function salvar() {
    let ok = true;
    if (!nomeOk) {
      setErroNome('Mínimo 2 caracteres');
      ok = false;
    }
    if (!ipOk) {
      setErroIp('IP inválido (ex.: 192.168.0.100)');
      ok = false;
    }
    if (!ok) return;

    try {
      setCarregando(true);
      await criarCamera(nome.trim(), ip.trim(), condominio_id);
      onSucesso('Câmera cadastrada');
    } catch (e) {
      onErro(mensagemErro(e, 'Falha ao cadastrar'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View>
      <Input
        label="Nome"
        placeholder="Portaria"
        value={nome}
        onChangeText={(t) => {
          setNome(t);
          if (erroNome) setErroNome(undefined);
        }}
        errorText={erroNome}
        success={nomeOk}
      />
      <Input
        label="Endereço IP"
        placeholder="192.168.0.100"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        value={ip}
        onChangeText={(t) => {
          setIp(t);
          if (erroIp) setErroIp(undefined);
        }}
        errorText={erroIp}
        success={ipOk}
      />

      <Button
        full
        loading={carregando}
        disabled={!nomeOk || !ipOk}
        onPress={salvar}
        style={{ marginTop: spacing.sm }}
      >
        Cadastrar
      </Button>
    </View>
  );
}

function AbaFaixa({
  condominio_id,
  carregando,
  setCarregando,
  onSucesso,
  onErro,
}: {
  condominio_id: number;
  carregando: boolean;
  setCarregando: (v: boolean) => void;
  onSucesso: (m: string) => void;
  onErro: (m: string) => void;
}) {
  const [prefixo, setPrefixo] = useState('Câmera');
  const [ipInicio, setIpInicio] = useState('');
  const [ipFim, setIpFim] = useState('');

  const inicioOk = IP_REGEX.test(ipInicio);
  const fimOk = IP_REGEX.test(ipFim);
  const prefixoOk = prefixo.trim().length >= 1;

  const previa = useMemo(() => calcularPrevia(ipInicio, ipFim), [ipInicio, ipFim]);

  async function salvar() {
    if (!inicioOk || !fimOk || !prefixoOk) return;
    if (previa.erro) {
      onErro(previa.erro);
      return;
    }
    try {
      setCarregando(true);
      const r = await importarFaixa(
        condominio_id,
        ipInicio.trim(),
        ipFim.trim(),
        prefixo.trim(),
      );
      onSucesso(`${r.total_importadas ?? previa.total} câmeras importadas`);
    } catch (e) {
      onErro(mensagemErro(e, 'Falha ao importar'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View>
      <Input
        label="Prefixo"
        placeholder="Câmera"
        value={prefixo}
        onChangeText={setPrefixo}
        helperText="Gera Câmera 1, Câmera 2…"
      />
      <Input
        label="IP inicial"
        placeholder="192.168.0.10"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        value={ipInicio}
        onChangeText={setIpInicio}
        success={inicioOk}
        errorText={ipInicio && !inicioOk ? 'IP inválido' : undefined}
      />
      <Input
        label="IP final"
        placeholder="192.168.0.30"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        value={ipFim}
        onChangeText={setIpFim}
        success={fimOk}
        errorText={ipFim && !fimOk ? 'IP inválido' : undefined}
      />

      <View style={styles.previa}>
        <Text style={styles.previaLabel}>PRÉVIA</Text>
        {previa.erro ? (
          <Text style={[styles.previaValor, { color: colors.danger }]}>{previa.erro}</Text>
        ) : previa.total > 0 ? (
          <>
            <Text style={styles.previaValor}>
              {previa.total} câmera{previa.total > 1 ? 's' : ''}
            </Text>
            <Text style={styles.previaMeta}>
              {ipInicio} → {ipFim}
            </Text>
          </>
        ) : (
          <Text style={styles.previaMeta}>Preencha os IPs</Text>
        )}
      </View>

      <Button
        full
        loading={carregando}
        disabled={!inicioOk || !fimOk || !prefixoOk || !!previa.erro || previa.total === 0}
        onPress={salvar}
        style={{ marginTop: spacing.xl }}
      >
        Importar {previa.total > 0 ? `${previa.total} câmera${previa.total > 1 ? 's' : ''}` : ''}
      </Button>
    </View>
  );
}

function AbaPlanilha({
  condominio_id,
  carregando,
  setCarregando,
  onSucesso,
  onErro,
}: {
  condominio_id: number;
  carregando: boolean;
  setCarregando: (v: boolean) => void;
  onSucesso: (m: string) => void;
  onErro: (m: string) => void;
}) {
  const [arquivo, setArquivo] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [previa, setPrevia] = useState<string[][] | null>(null);

  async function selecionar() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setArquivo(asset);
      setPrevia(null);

      if (asset.name.toLowerCase().endsWith('.csv') && asset.uri) {
        try {
          const resp = await fetch(asset.uri);
          const txt = await resp.text();
          const linhas = txt
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 5)
            .map((l) => l.split(/[,;\t]/).map((c) => c.trim()));
          setPrevia(linhas);
        } catch {
          setPrevia(null);
        }
      }
    } catch {
      onErro('Falha ao selecionar arquivo');
    }
  }

  async function enviar() {
    if (!arquivo) return;
    try {
      setCarregando(true);
      const form = new FormData();
      form.append('arquivo', {
        uri: arquivo.uri,
        name: arquivo.name ?? 'planilha.csv',
        type: arquivo.mimeType ?? 'application/octet-stream',
      } as any);
      const r = await importarPlanilha(condominio_id, form);
      onSucesso(`${r.total_importadas ?? '?'} câmeras importadas`);
    } catch (e) {
      onErro(mensagemErro(e, 'Falha ao importar'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View>
      <Text style={styles.desc}>
        Envie um CSV ou XLSX com colunas <Text style={styles.mono}>nome</Text> e{' '}
        <Text style={styles.mono}>ip</Text>.
      </Text>

      <Pressable style={styles.dropzone} onPress={selecionar}>
        <Ionicons
          name={arquivo ? 'document-text-outline' : 'cloud-upload-outline'}
          size={22}
          color={arquivo ? colors.text : colors.textMuted}
        />
        <Text style={[styles.dropzoneTxt, arquivo && { color: colors.text }]}>
          {arquivo ? arquivo.name : 'Escolher arquivo'}
        </Text>
        <Text style={styles.dropzoneHint}>CSV · XLSX · XLS</Text>
      </Pressable>

      {previa && previa.length > 0 && (
        <View style={styles.tabela}>
          <Text style={styles.tabelaTitulo}>PRÉVIA</Text>
          {previa.map((linha, i) => (
            <View
              key={i}
              style={[
                styles.tabelaLinha,
                i < previa.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              {linha.slice(0, 3).map((celula, j) => (
                <Text
                  key={j}
                  style={[styles.tabelaCelula, i === 0 && styles.tabelaCelulaHead]}
                  numberOfLines={1}
                >
                  {celula}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}

      <Button
        full
        loading={carregando}
        disabled={!arquivo}
        onPress={enviar}
        style={{ marginTop: spacing.xl }}
      >
        Importar
      </Button>
    </View>
  );
}

function ipParaNumero(ip: string) {
  const p = ip.split('.').map(Number);
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

function calcularPrevia(inicio: string, fim: string): { total: number; erro?: string } {
  if (!IP_REGEX.test(inicio) || !IP_REGEX.test(fim)) return { total: 0 };
  const a = ipParaNumero(inicio);
  const b = ipParaNumero(fim);
  if (b < a) return { total: 0, erro: 'IP final menor que o inicial' };
  const total = b - a + 1;
  if (total > 254) return { total, erro: 'Máx. 254 câmeras por faixa' };
  return { total };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  titleBlock: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  titulo: { ...typography.display, color: colors.text },
  subtitulo: { ...typography.small, color: colors.textMuted, marginTop: 4 },
  desc: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  mono: { fontFamily: 'monospace', color: colors.text },

  segmentedWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.xxl },
  scroll: { padding: spacing.xl, paddingTop: 0 },

  previa: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  previaLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  previaValor: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: -0.4,
  },
  previaMeta: { fontSize: 12, color: colors.textSubtle, marginTop: 4, fontFamily: 'monospace' },

  dropzone: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  dropzoneTxt: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  dropzoneHint: {
    fontSize: 11,
    color: colors.textSubtle,
    letterSpacing: 0.6,
  },

  tabela: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tabelaTitulo: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 0.8,
    padding: spacing.md,
    paddingBottom: 6,
  },
  tabelaLinha: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  tabelaCelula: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
    fontFamily: 'monospace',
  },
  tabelaCelulaHead: { color: colors.text, fontFamily: undefined, fontWeight: '500' },
});
