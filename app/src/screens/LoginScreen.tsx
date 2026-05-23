import { useEffect, useRef, useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/hooks/useAuth';
import { mensagemErro } from '@/services/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { colors, spacing, typography } from '@/theme/theme';

export function LoginScreen({ navigation }: any) {
  const { entrar } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [emailErro, setEmailErro] = useState<string | undefined>();
  const [senhaErro, setSenhaErro] = useState<string | undefined>();
  const [carregando, setCarregando] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function validar() {
    let ok = true;
    setEmailErro(undefined);
    setSenhaErro(undefined);
    if (!email.trim()) {
      setEmailErro('Informe seu e-mail');
      ok = false;
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailErro('E-mail inválido');
      ok = false;
    }
    if (!senha) {
      setSenhaErro('Informe sua senha');
      ok = false;
    }
    return ok;
  }

  async function onEntrar() {
    if (!validar()) return;
    try {
      setCarregando(true);
      await entrar(email.trim(), senha);
    } catch (e) {
      toast.error(mensagemErro(e, 'Falha ao entrar'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Glow radial no topo */}
      <LinearGradient
        colors={['rgba(26,86,219,0.22)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGlow}
      />
      <View style={styles.orb} />

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
            <Text style={styles.titulo}>{'Bem-vindo\nde volta.'}</Text>
            <Text style={styles.subtitulo}>Acesse o painel de monitoramento</Text>

            <View style={styles.form}>
              <Input
                label="E-mail"
                placeholder="voce@empresa.com"
                icon="mail-outline"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => { setEmail(t); if (emailErro) setEmailErro(undefined); }}
                errorText={emailErro}
              />
              <Input
                label="Senha"
                placeholder="••••••••"
                icon="lock-closed-outline"
                value={senha}
                password
                onChangeText={(t) => { setSenha(t); if (senhaErro) setSenhaErro(undefined); }}
                errorText={senhaErro}
              />
              <Button full loading={carregando} onPress={onEntrar} style={{ marginTop: spacing.md }}>
                Entrar
              </Button>

              <View style={styles.linhaInferior}>
                <Text style={styles.linhaTxt}>Não tem conta?</Text>
                <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8}>
                  <Text style={styles.link}>Criar conta</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Text style={styles.rodape}>Sistema de monitoramento de câmeras IP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  orb: {
    position: 'absolute',
    top: -190,
    alignSelf: 'center',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: '#1a56db',
    opacity: 0.1,
  },

  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, paddingTop: 80 },

  marca: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentBlue,
    letterSpacing: 4,
    marginBottom: spacing.xl,
  },
  titulo: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1.5,
    lineHeight: 46,
    marginBottom: spacing.md,
  },
  subtitulo: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xxxl,
  },

  form: { width: '100%' },

  linhaInferior: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  linhaTxt: { ...typography.small, color: colors.textMuted },
  link: { ...typography.smallMedium, color: colors.accentBlue, fontWeight: '600' },

  rodape: {
    ...typography.small,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
});
