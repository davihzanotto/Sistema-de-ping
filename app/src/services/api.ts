// Cliente HTTP — isolado da UI para facilitar porte para React Web
import axios, { AxiosError, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/**
 * URL base resolvida em runtime:
 *   • Emulador Android  → http://10.0.2.2:8000   (alias do host pelo AVD)
 *   • Dispositivo físico → http://192.168.100.67:8000  (IP do PC na LAN)
 *
 * O usuário pode sobrescrever via `expo.extra.apiBaseUrl` no app.json para
 * apontar para um servidor de produção sem precisar mexer neste arquivo.
 */
const URL_EMULADOR = 'http://10.0.2.2:8000';
const URL_DISPOSITIVO_FISICO = 'http://192.168.100.67:8000';

function resolverBaseUrl(): string {
  const override = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (override) return override;
  // Device.isDevice = true em hardware real, false em emulador/simulador.
  return Device.isDevice ? URL_DISPOSITIVO_FISICO : URL_EMULADOR;
}

const BASE_URL = resolverBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('jwt');
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** Extrai mensagem amigável em português de qualquer erro. */
export function mensagemErro(e: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  const err = e as AxiosError<{ detail?: string | { msg?: string }[] }>;
  const data = err?.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) {
    const first = data!.detail[0] as any;
    if (first?.msg) return first.msg;
  }
  if (err?.code === 'ECONNABORTED') return 'Tempo esgotado. Verifique sua conexão.';
  if (err?.message === 'Network Error') return 'Sem conexão com o servidor.';
  if (err?.response?.status === 401) return 'Sessão expirada. Faça login novamente.';
  if (err?.response?.status === 403) return 'Você não tem permissão para isso.';
  if (err?.response?.status === 404) return 'Recurso não encontrado.';
  if (err?.response?.status && err.response.status >= 500)
    return 'Erro no servidor. Tente novamente em instantes.';
  return fallback;
}

// -------------------- Tipos --------------------
export type Condominio = {
  id: number;
  nome: string;
  endereco?: string | null;
  token_unico: string;
  criado_em: string;
};

export type CondominioStatus = {
  id: number;
  nome: string;
  endereco?: string | null;
  total_cameras: number;
  online: number;
  offline: number;
  desconhecido: number;
};

export type Camera = {
  id: number;
  nome: string;
  ip: string;
  condominio_id: number;
  status: 'online' | 'offline' | 'desconhecido';
  ultimo_ping?: string | null;
  criado_em: string;
};

export type EventoHistorico = {
  id: number;
  camera_id: number;
  camera_nome: string;
  camera_ip: string;
  condominio_id: number;
  condominio_nome: string;
  evento: 'online' | 'offline';
  timestamp: string;
};

export type UsuarioInfo = {
  nome?: string;
  email?: string;
};

// -------------------- Auth --------------------
export async function login(email: string, senha: string) {
  const { data } = await api.post<{ access_token: string }>('/api/auth/login', {
    email,
    senha,
  });
  return data.access_token;
}

export async function registrar(nome: string, email: string, senha: string) {
  await api.post('/api/auth/registrar', { nome, email, senha });
  // Faz login imediatamente para devolver um JWT pronto.
  return login(email, senha);
}

/** Decodifica payload do JWT (sem verificar assinatura) — usado apenas para UI. */
export function decodificarJWT(token: string | null): UsuarioInfo | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === 'function'
        ? decodeURIComponent(
            atob(pad)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join(''),
          )
        : '';
    const obj = JSON.parse(json);
    return { nome: obj?.nome ?? obj?.name, email: obj?.email ?? obj?.sub };
  } catch {
    return null;
  }
}

// -------------------- Condomínios --------------------
export async function listarCondominios() {
  const { data } = await api.get<Condominio[]>('/api/condominios/');
  return data;
}

export async function dashboard() {
  const { data } = await api.get<CondominioStatus[]>('/api/condominios/status');
  return data;
}

export async function criarCondominio(nome: string, endereco?: string) {
  const { data } = await api.post<Condominio>('/api/condominios/', { nome, endereco });
  return data;
}

export async function obterCondominio(id: number) {
  const { data } = await api.get<Condominio>(`/api/condominios/${id}`);
  return data;
}

export async function atualizarCondominio(
  id: number,
  dados: { nome?: string; endereco?: string | null },
) {
  const { data } = await api.put<Condominio>(`/api/condominios/${id}`, dados);
  return data;
}

export async function excluirCondominio(id: number) {
  await api.delete(`/api/condominios/${id}`);
}

export async function rotacionarToken(id: number) {
  const { data } = await api.post<Condominio>(`/api/condominios/${id}/rotacionar-token`);
  return data;
}

// -------------------- Câmeras --------------------
export async function listarCameras(condominio_id?: number) {
  const { data } = await api.get<Camera[]>('/api/cameras/', {
    params: condominio_id ? { condominio_id } : undefined,
  });
  return data;
}

export async function criarCamera(nome: string, ip: string, condominio_id: number) {
  const { data } = await api.post<Camera>('/api/cameras/', {
    nome,
    ip,
    condominio_id,
  });
  return data;
}

export async function atualizarCamera(
  id: number,
  dados: { nome?: string; ip?: string },
) {
  const { data } = await api.put<Camera>(`/api/cameras/${id}`, dados);
  return data;
}

export async function excluirCamera(id: number) {
  await api.delete(`/api/cameras/${id}`);
}

export async function importarFaixa(
  condominio_id: number,
  ip_inicio: string,
  ip_fim: string,
  prefixo_nome: string,
) {
  const { data } = await api.post('/api/cameras/importar-faixa', {
    condominio_id,
    ip_inicio,
    ip_fim,
    prefixo_nome,
  });
  return data;
}

export async function importarPlanilha(condominio_id: number, arquivo: FormData) {
  const { data } = await api.post(
    `/api/cameras/importar-planilha?condominio_id=${condominio_id}`,
    arquivo,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

// -------------------- Histórico --------------------
export async function listarHistorico(filtros: {
  condominio_id?: number;
  data_inicio?: string;
  data_fim?: string;
  limite?: number;
} = {}) {
  const { data } = await api.get<EventoHistorico[]>('/api/historico/', {
    params: filtros,
  });
  return data;
}

// -------------------- Dispositivos (FCM) --------------------
export async function registrarDispositivo(token_fcm: string) {
  return api.post('/api/dispositivos/', { token_fcm });
}
