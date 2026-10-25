/**
 * ./components/FeedStatus.tsx
 *
 * Full-screen status card for the video feed (native and web).
 * Shown instead of the feed while videos load, when loading fails,
 * or when there are no videos to show.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type FeedStatusProps = {
  status: 'loading' | 'error' | 'empty';
  onRetry?: () => void;
};

export default function FeedStatus({ status, onRetry }: FeedStatusProps) {
  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00D5FF" />
        <Text style={styles.loadingText}>טוען סרטונים...</Text>
      </View>
    );
  }

  const isError = status === 'error';

  return (
    <View style={styles.container}>
      <Ionicons
        name={isError ? 'cloud-offline-outline' : 'videocam-outline'}
        size={64}
        color={isError ? '#FF3B5C' : '#00D5FF'}
      />
      <Text style={styles.title}>
        {isError ? 'לא הצלחנו לטעון את הסרטונים' : 'עוד אין כאן סרטונים'}
      </Text>
      <Text style={styles.subtitle}>
        {isError ? 'כדאי לבדוק את החיבור לאינטרנט ולנסות שוב' : 'טיולים חדשים בדרך, שווה לבדוק שוב בקרוב'}
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>{isError ? 'נסה שוב' : 'רענון'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#00D5FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
