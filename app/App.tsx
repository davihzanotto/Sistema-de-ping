import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { registrarParaNotificacoes } from '@/services/notifications';
import { AuthStack } from '@/navigation/AuthStack';
import { AppTabs } from '@/navigation/AppTabs';
import { ToastProvider } from '@/components/Toast';
import { ConfirmDialogProvider } from '@/components/ConfirmDialog';
import { colors } from '@/theme/theme';

const NavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
    primary: colors.primary,
    notification: colors.danger,
  },
};

function Rotas() {
  const { token, carregando } = useAuth();

  useEffect(() => {
    if (token) {
      registrarParaNotificacoes(token).catch(console.warn);
    }
  }, [token]);

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  return token ? <AppTabs /> : <AuthStack />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmDialogProvider>
              <NavigationContainer theme={NavTheme}>
                <StatusBar style="light" backgroundColor={colors.background} />
                <Rotas />
              </NavigationContainer>
            </ConfirmDialogProvider>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
