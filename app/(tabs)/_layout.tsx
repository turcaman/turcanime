import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <ErrorBoundary>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Buscar",
            tabBarIcon: ({ color }) => <Feather name="search" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Ajustes",
            tabBarIcon: ({ color }) => <Feather name="settings" size={24} color={color} />,
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}
