import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  atualizarCondominio,
  mensagemErro,
  obterCondominio,
} from '@/services/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { colors, spacing, typography } from '@/theme/theme';

export function EditarCondominioScreen({ route, navigation }: any) {
  const { id } = route.params;
  const toast = useToast();

  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroNome, setErroNome] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const c = await obterCondominio(id);
        setNome(c.nome);
        setEndereco(c.endereco ?? '');
      } catch (e) {
        toast.error(mensagemErro(e, 'Falha ao carregar condomínio'));
      } finally {
        setCarregandoInicial(false);
      }
    })();
  }, [id]);

  const nomeOk = nome.trim().length >= 3;

  async function salvar() {
    if (!nomeOk) {
      setErroNome('Mínimo 3 caracteres');
      return;
    }
    try {
      setSalvando(true);
      await atualizarCondominio(id, {
        nome: nome.trim(),
        endereco: endereco.trim() || null,
      });
      toast.success('Condomínio atualizado');
      navigation.goBack();
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao salvar alterações'));
    } finally {
      setSalvando(false);
    }
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
          <Text style={styles.label}>EDITAR CONDOMÍNIO</Text>
          <Text style={styles.titulo}>Atualizar dados</Text>

          {carregandoInicial ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : (
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
                loading={salvando}
                disabled={!nomeOk}
                onPress={salvar}
                style={{ marginTop: spacing.sm }}
              >
                Salvar alterações
              </Button>
            </View>
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
  titulo: { ...typography.display, color: colors.text },
  form: { marginTop: spacing.xxl },
  loadingWrap: { paddingTop: 80, alignItems: 'center' },
});
