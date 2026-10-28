/**
 * ./App.tsx
 *
 * Root entry point of the Veeky application.
 *
 * Purpose:
 * --------------------------------------------------------------------
 * This file composes the top-level providers and navigation container.
 * It is the very first React component rendered by Expo.
 *
 * Responsibilities:
 * --------------------------------------------------------------------
 * ✔ Provide global theme state (ThemeProvider)
 * ✔ Initialize React Navigation (NavigationContainer)
 * ✔ Mount the RootNavigator (entire app flow)
 *
 * Important architectural rules:
 * --------------------------------------------------------------------
 * • NO UI logic should live here
 * • NO screen-specific logic should live here
 * • Only global providers and app-wide wrappers belong here
 *
 * Any feature that needs global access (theme, auth, localization,
 * analytics, etc.) should be added as a provider at this level.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const linking = {
    prefixes: ['https://veeky-app.vercel.app', 'http://localhost:8081'],
    config: {
      screens: {
        Login: 'login',
        Signup: 'signup',
        MainTabs: {
          path: 'main',
          screens: {
            Home: 'home',
            AddVideo: 'add',
            Profile: 'profile',
          },
        },
        Search: 'search',
        Influencer: 'influencer/:influencerId',
      },
    },
  };

  return (
    /**
     * ThemeProvider:
     * ----------------------------------------------------------------
     * Provides global light/dark theme state to the entire app.
     * All screens and components can access it via useTheme().
     */
    <SafeAreaProvider>
      <ThemeProvider>
        {/**
         * NavigationContainer:
         * --------------------------------------------------------------
         * Required by React Navigation.
         * Manages navigation state, deep linking, and screen transitions.
         */}
        <NavigationContainer linking={linking}>
          {/**
           * RootNavigator:
           * --------------------------------------------------------------
           * Defines the complete navigation structure of the app:
           * stacks, tabs, and screen hierarchy.
           */}
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
