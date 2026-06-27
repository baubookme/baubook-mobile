import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from './src/root/AppErrorBoundary';
import { BauBookApp } from './src/root/BauBookApp';
import { installGlobalErrorHandler } from './src/root/installGlobalErrorHandler';

installGlobalErrorHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <BauBookApp />
        <StatusBar barStyle="dark-content" backgroundColor="#FFF8ED" />
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
