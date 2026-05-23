import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardScreen } from '@/screens/DashboardScreen';
import { CondominioDetalheScreen } from '@/screens/CondominioDetalheScreen';
import { HistoricoScreen } from '@/screens/HistoricoScreen';
import { NovoCondominioScreen } from '@/screens/NovoCondominioScreen';
import { NovaCameraScreen } from '@/screens/NovaCameraScreen';
import { EditarCondominioScreen } from '@/screens/EditarCondominioScreen';
import { EditarCameraScreen } from '@/screens/EditarCameraScreen';
import { ScanResultadosScreen } from '@/screens/ScanResultadosScreen';
import { ConfigScreen } from '@/screens/ConfigScreen';
import { colors, gradients, radius, spacing } from '@/theme/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#000000' },
  animation: 'slide_from_right' as const,
};

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="CondominioDetalhe" component={CondominioDetalheScreen} />
      <Stack.Screen name="NovoCondominio" component={NovoCondominioScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="NovaCamera" component={NovaCameraScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="EditarCondominio" component={EditarCondominioScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="EditarCamera" component={EditarCameraScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ScanResultados" component={ScanResultadosScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

function CadastrosStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Config" component={ConfigScreen} />
    </Stack.Navigator>
  );
}

const iconMap: Record<string, {
  active: keyof typeof Ionicons.glyphMap;
  idle: keyof typeof Ionicons.glyphMap;
  label: string;
}> = {
  Inicio: { active: 'grid', idle: 'grid-outline', label: 'Dashboard' },
  Historico: { active: 'pulse', idle: 'pulse-outline', label: 'Alertas' },
  Cadastros: { active: 'person', idle: 'person-outline', label: 'Conta' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = iconMap[route.name];
          if (!cfg) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              hitSlop={4}
            >
              {isFocused ? (
                <LinearGradient
                  colors={['rgba(26,86,219,0.3)', 'rgba(30,64,175,0.2)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activePill}
                >
                  <Ionicons name={cfg.active} size={19} color={colors.accentBlue} />
                  <Text style={styles.labelActive}>{cfg.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.idlePill}>
                  <Ionicons name={cfg.idle} size={19} color={colors.textSubtle} />
                  <Text style={styles.label}>{cfg.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Inicio" component={DashboardStack} />
      <Tab.Screen name="Historico" component={HistoricoScreen} />
      <Tab.Screen name="Cadastros" component={CadastrosStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(30,41,59,0.6)',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  activePill: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.xl,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.2)',
  },
  idlePill: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.xl,
    gap: 3,
  },
  label: { fontSize: 10, fontWeight: '500', color: colors.textSubtle },
  labelActive: { fontSize: 10, fontWeight: '600', color: colors.accentBlue },
});
