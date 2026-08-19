import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { ErrorBoundary } from "./src/ErrorBoundary";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <ErrorBoundary>
      <NavigationContainer>
        <SafeAreaView style={styles.safe}>
          <StatusBar style="light" />
          <AppNavigator />
        </SafeAreaView>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#090a0c",
  },
});
