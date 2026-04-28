// Registro do dispositivo para push FCM via Expo Notifications.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { registrarDispositivo } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registrarParaNotificacoes(_jwt: string) {
  if (!Device.isDevice) {
    console.warn('Push notifications só funcionam em dispositivo físico');
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('Permissão de notificação negada');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Alertas de câmeras',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#FF231F7C',
    });
  }

  // Usa token nativo (FCM no Android / APNs no iOS)
  const tokenDevice = await Notifications.getDevicePushTokenAsync();
  await registrarDispositivo(tokenDevice.data);
}
