import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  decodificarJWT,
  login as apiLogin,
  registrar as apiRegistrar,
  setUnauthorizedHandler,
  UsuarioInfo,
} from '@/services/api';

type AuthCtx = {
  token: string | null;
  usuario: UsuarioInfo | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('jwt').then((t) => {
      setToken(t);
      setCarregando(false);
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setToken(null));
  }, []);

  const usuario = useMemo(() => decodificarJWT(token), [token]);

  async function entrar(email: string, senha: string) {
    const t = await apiLogin(email, senha);
    await AsyncStorage.setItem('jwt', t);
    setToken(t);
  }

  async function cadastrar(nome: string, email: string, senha: string) {
    const t = await apiRegistrar(nome, email, senha);
    await AsyncStorage.setItem('jwt', t);
    setToken(t);
  }

  async function sair() {
    await AsyncStorage.removeItem('jwt');
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, usuario, carregando, entrar, cadastrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
