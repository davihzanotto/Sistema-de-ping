import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/hooks/useAuth';
import { mensagemErro } from '@/services/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { colors, spacing, typography } from '@/theme/theme';

export function RegisterScreen({ navigation }: any) {
  const { cadastrar } = useAuth();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [tocados, setTocados] = useState({ nome: false, email: false, senha: false, confirmar: false });
  const [carregando, setCarregando] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const validacao = useMemo(() => {
    const nomeOk = nome.trim().length >= 2;
    const emailOk = /\S+@\S+\.\S+/.test(email.trim());
    const senhaOk = senha.length >= 6;
    const confirmarOk = confirmar.length >= 6 && confirmar === senha;
    return {
      nome: { ok: nomeOk, erro: !nomeOk ? 'Mínimo 2 caracteres' : undefined },
      email: { ok: emailOk, erro: !emailOk ? 'E-mail inválido' : undefined },
      senha: { ok: senhaOk, erro: !senhaOk ? 'Mínimo 6 caracteres' : undefined },
      confirmar: {
        ok: confirmarOk,
        erro: confirmar.length === 0
          ? 'Confirme sua senha'
          : confirmar !== senha
          ? 'As senhas não coincidem'
          : !confirmarOk
          ? 'Mínimo 6 caracteres'
          : undefined,
      },
    };
  }, [nome, email, senha, confirmar]);

  const tudoOk = validacao.nome.ok && validacao.email.ok && validacao.senha.ok && validacao.confirmar.ok;

  async function onCadastrar() {
    setTocados({ nome: true, email: true, senha: true, confirmar: true });
    if (!tudoOk) return;
    try {
      setCarregando(true);
      await cadastrar(nome.trim(), email.trim(), senha);
    } catch (e) {
      toast.error(mensagemErro(e, 'Não foi possível criar a conta'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(26,86,219,0.18)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGlow}
      />
      <View style={styles.orb} />

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
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
          <Animated.View
            style={{
              opacity: fade,
              transform: [{ translateY: slide }],
              width: '100%',
              maxWidth: 380,
              alignSelf: 'center',
            }}
          >
            <Text style={styles.marca}>TRIETEL</Text>
            <Text style={styles.titulo}>{'Criar\nconta.'}</Text>
            <Text style={styles.subtitulo}>Comece a monitorar suas câmeras agora.</Text>

            <View style={{ marginTop: spacing.xxl }}>
              <Input
                label="Nome"
                placeholder="Seu nome completo"
                icon="person-outline"
                autoCapitalize="words"
                autoComplete="name"
                value={nome}
                onChangeText={setNome}
                onBlur={() => setTocados((t) => ({ ...t, nome: true }))}
                errorText={tocados.nome ? validacao.nome.erro : undefined}
                success={validacao.nome.ok && nome.length > 0}
              />
              <Input
                label="E-mail"
                placeholder="voce@empresa.com"
                icon="mail-outline"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onBlur={() => setTocados((t) => ({ ...t, email: true }))}
                errorText={tocados.email ? validacao.email.erro : undefined}
                success={validacao.email.ok}
              />
              <Input
                label="Senha"
                placeholder="Mínimo 6 caracteres"
                icon="lock-closed-outline"
                value={senha}
                password
                onChangeText={setSenha}
                onBlur={() => setTocados((t) => ({ ...t, senha: true }))}
                errorText={tocados.senha ? validacao.senha.erro : undefined}
                success={validacao.senha.ok}
              />
              <Input
                label="Confirmar senha"
                placeholder="Repita a senha"
                icon="lock-closed-outline"
                value={confirmar}
                password
                onChangeText={setConfirmar}
                onBlur={() => setTocados((t) => ({ ...t, confirmar: true }))}
                errorText={tocados.confirmar ? validacao.confirmar.erro : undefined}
                success={validacao.confirmar.ok}
              />

              <Button full loading={carregando} disabled={!tudoOk} onPress={onCadastrar} style={{ marginTop: spacing.md }}>
                Criar conta
              </Button>

              <View style={styles.linhaInferior}>
                <Text style={styles.linhaTxt}>Já tem uma conta?</Text>
                <Pressable onPress={() => navigation.goBack()} hitSlop={6}>
                  <Text style={styles.link}>Entrar</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 350 },
  orb: { position: 'absolute', top: -180, alignSelf: 'center', width: 500, height: 500, borderRadius: 250, backgroundColor: '#1a56db', opacity: 0.08 },
  topBar: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.sm },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  marca: { fontSize: 12, fontWeight: '600', color: colors.accentBlue, letterSpacing: 4, marginBottom: spacing.xl },
  titulo: { fontSize: 40, fontWeight: '800', color: colors.text, letterSpacing: -1.5, lineHeight: 46, marginBottom: spacing.md },
  subtitulo: { ...typography.body, color: colors.textMuted },
  linhaInferior: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.xl },
  linhaTxt: { ...typography.small, color: colors.textMuted },
  link: { ...typography.smallMedium, color: colors.accentBlue, fontWeight: '600' },
});
