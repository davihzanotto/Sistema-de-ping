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
import { Ionicons } from '@expo/vector-icons';

import { atualizarCamera, mensagemErro } from '@/services/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { colors, spacing, typography } from '@/theme/theme';

const IP_REGEX = /^((25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[01]?\d?\d)$/;

export function EditarCameraScreen({ route, navigation }: any) {
  const { id, nome: nomeInicial, ip: ipInicial } = route.params;
  const toast = useToast();

  const [nome, setNome] = useState<string>(nomeInicial ?? '');
  const [ip, setIp] = useState<string>(ipInicial ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erroNome, setErroNome] = useState<string | undefined>();
  const [erroIp, setErroIp] = useState<string | undefined>();

  const nomeOk = nome.trim().length >= 2;
  const ipOk = IP_REGEX.test(ip.trim());

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
      setSalvando(true);
      await atualizarCamera(id, { nome: nome.trim(), ip: ip.trim() });
      toast.success('Câmera atualizada');
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
          <Text style={styles.label}>EDITAR CÂMERA</Text>
          <Text style={styles.titulo}>Atualizar câmera</Text>

          <View style={styles.form}>
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
              loading={salvando}
              disabled={!nomeOk || !ipOk}
              onPress={salvar}
              style={{ marginTop: spacing.sm }}
            >
              Salvar alterações
            </Button>
          </View>
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
});
