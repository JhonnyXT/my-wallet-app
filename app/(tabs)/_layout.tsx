import { Tabs } from "expo-router";
import { View } from "react-native";
import {
  Home,
  BarChart3,
  Wallet,
  Settings,
} from "lucide-react-native";
import { COLORS } from "@/src/constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.silver,
        tabBarStyle: {
          position: "absolute",
          bottom: 24,
          left: 24,
          right: 24,
          height: 60,
          borderRadius: 30,
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 8,
          paddingBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center pt-1">
              <Home
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center pt-1">
              <BarChart3
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center pt-1">
              <Wallet
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center pt-1">
              <Settings
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
