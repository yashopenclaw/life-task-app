import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavShell } from './src/core/nav';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [loaded, error] = useFonts({
    'ClashDisplay-Medium': require('./assets/fonts/ClashDisplay-Medium.ttf'),
    'ClashDisplay-Semibold': require('./assets/fonts/ClashDisplay-Semibold.ttf'),
    'SpaceGrotesk-Regular': require('./assets/fonts/SpaceGrotesk-400.ttf'),
    'SpaceGrotesk-Medium': require('./assets/fonts/SpaceGrotesk-500.ttf'),
    'SpaceGrotesk-Semibold': require('./assets/fonts/SpaceGrotesk-600.ttf'),
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;
  return <><StatusBar style="light" /><NavShell /></>;
}
