import { useState } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { criarCondominio, mensagemErro } from '@/services/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { colors, radius, spacing, typography } from '@/theme/theme';

export function NovoCondominioScreen({ navigation }: any) {
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroNome, setErroNome] = useState<string | undefined>();

  const nomeOk = nome.trim().length >= 3;

  async function salvar() {
    if (!nomeOk) {
      setErroNome('Mínimo 3 caracteres');
      return;
    }
    try {
      setCarregando(true);
      const c = await criarCondominio(nome.trim(), endereco.trim() || undefined);
      setToken(c.token_unico);
      toast.success('Condomínio criado');
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao salvar'));
    } finally {
      setCarregando(false);
    }
  }

  async function copiarToken() {
    if (!token) return;
    await Clipboard.setStringAsync(token);
    toast.success('Token copiado');
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
        </Pressable>
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
          {!token ? (
            <>
              <Text style={styles.label}>NOVO CONDOMÍNIO</Text>
              <Text style={styles.titulo}>Informações básicas</Text>
              <Text style={styles.desc}>
                Preencha para gerar o token do agente local.
              </Text>

              <View style={styles.form}>
                <Input
                  label="Nome"
                  placeholder="Residencial Jardim das Flores"
                  value={nome}
                  onChangeText={(t) => {
                    setNome(t);
                    if (erroNome) setErroNome(undefined);
                  }}
                  errorText={erroNome}
                  success={nomeOk}
                />
                <Input
                  label="Endereço (opcional)"
                  placeholder="Rua, número, bairro"
                  value={endereco}
                  onChangeText={setEndereco}
                />

                <Button
                  full
                  loading={carregando}
                  disabled={!nomeOk}
                  onPress={salvar}
                  style={{ marginTop: spacing.sm }}
                >
                  Criar condomínio
                </Button>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.labelSuccess}>CONDOMÍNIO CRIADO</Text>
              <Text style={styles.titulo}>Token do agente</Text>
              <Text style={styles.desc}>
                Cole este token no arquivo <Text style={styles.mono}>.env</Text> do agente
                instalado no servidor do condomínio.
              </Text>

              <View style={styles.tokenBox}>
                <Text style={styles.tokenLabel}>TOKEN ÚNICO</Text>
                <Text selectable style={styles.tokenValor}>
                  {token}
                </Text>
                <View style={styles.tokenDivider} />
                <Pressable style={styles.copiarBtn} onPress={copiarToken}>
                  <Ionicons name="copy-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.copiarTxt}>Copiar token</Text>
                </Pressable>
              </View>

              <Button
                full
                onPress={() => navigation.goBack()}
                style={{ marginTop: spacing.xl }}
              >
                Concluir
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  scroll: { padding: spacing.xl, paddingTop: spacing.lg },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  labelSuccess: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.success,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  titulo: { ...typography.display, color: colors.text },
  desc: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  mono: { fontFamily: 'monospace', color: colors.text },

  form: { marginTop: spacing.xxl },

  tokenBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
  tokenLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  tokenValor: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  tokenDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  copiarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  copiarTxt: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
});
