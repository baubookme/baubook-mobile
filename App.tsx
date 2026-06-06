import { StatusBar } from 'react-native';

import { AppErrorBoundary } from './src/root/AppErrorBoundary';
import { BauBookApp } from './src/root/BauBookApp';
import { installGlobalErrorHandler } from './src/root/installGlobalErrorHandler';

installGlobalErrorHandler();

export default function App() {
  return (
    <AppErrorBoundary>
      <BauBookApp />
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8ED" />
    </AppErrorBoundary>
  );
}
