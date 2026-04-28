import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardScreen } from '@/screens/DashboardScreen';
import { CondominioDetalheScreen } from '@/screens/CondominioDetalheScreen';
import { HistoricoScreen } from '@/screens/HistoricoScreen';
import { NovoCondominioScreen } from '@/screens/NovoCondominioScreen';
import { NovaCameraScreen } from '@/screens/NovaCameraScreen';
import { EditarCondominioScreen } from '@/screens/EditarCondominioScreen';
import { EditarCameraScreen } from '@/screens/EditarCameraScreen';
import { ConfigScreen } from '@/screens/ConfigScreen';
import { colors, spacing } from '@/theme/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
  animation: 'slide_from_right' as const,
};

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="CondominioDetalhe" component={CondominioDetalheScreen} />
      <Stack.Screen
        name="NovoCondominio"
        component={NovoCondominioScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="NovaCamera"
        component={NovaCameraScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="EditarCondominio"
        component={EditarCondominioScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="EditarCamera"
        component={EditarCameraScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
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

const iconMap: Record<string, { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap; label: string }> = {
  Inicio: { active: 'grid', idle: 'grid-outline', label: 'Dashboard' },
  Historico: { active: 'pulse', idle: 'pulse-outline', label: 'Alertas' },
  Cadastros: { active: 'person', idle: 'person-outline', label: 'Conta' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.divider} />
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

          const color = isFocused ? colors.text : colors.textSubtle;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              hitSlop={4}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name={isFocused ? cfg.active : cfg.idle}
                  size={18}
                  color={color}
                />
                <Text style={[styles.label, { color }]}>{cfg.label}</Text>
              </View>
              {isFocused && <View style={styles.indicator} />}
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
    backgroundColor: colors.background,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  tabContent: { alignItems: 'center', gap: 3 },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  indicator: {
    position: 'absolute',
    top: -spacing.sm,
    width: 20,
    height: 1.5,
    backgroundColor: colors.text,
  },
});
