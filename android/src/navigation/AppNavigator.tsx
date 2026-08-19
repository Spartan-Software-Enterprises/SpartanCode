import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { colors, sharedStyles } from "../screens/styles";
import ChatScreen from "../screens/ChatScreen";
import MissionsScreen from "../screens/MissionsScreen";
import ModelsScreen from "../screens/ModelsScreen";
import SettingsScreen from "../screens/SettingsScreen";

type RootTabParamList = {
  Chat: undefined;
  Missions: undefined;
  Models: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: sharedStyles.tabBar,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            Chat: "💬",
            Missions: "📋",
            Models: "🧠",
            Settings: "⚙️",
          };
          return (
            <View style={sharedStyles.tabItem}>
              <Text style={{ fontSize: 22 }}>{icons[route.name]}</Text>
              <Text
                style={[
                  sharedStyles.tabLabel,
                  focused
                    ? sharedStyles.tabLabelActive
                    : sharedStyles.tabLabelInactive,
                ]}
              >
                {route.name}
              </Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Missions" component={MissionsScreen} />
      <Tab.Screen name="Models" component={ModelsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
