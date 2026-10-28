/**
 * ./screens/HomeFeedScreen.tsx
 *
 * This is the main screen of Veeky — the TikTok-style home feed.
 * It decides what the user sees when they open the app.
 *
 * Responsibilities:
 * --------------------------------------------------------------------
 * ✔ Shows the top filter bar (All / Trips / Lodging / Entertainment)
 * ✔ Switches between **native feed** (VideoFeed) and **web feed**
 *   (WebVideoFeed) depending on the platform
 * ✔ Forwards "initialVideoId" so navigation can open the feed at a
 *   specific video (e.g., from influencer page)
 * ✔ Maintains filter selection UI state
 * ✔ Has a minimal, black design (Veeky’s style)
 *
 * Architecture Notes:
 * --------------------------------------------------------------------
 * • WebVideoFeed is lazily loaded ONLY on web (dynamic require),
 *   because the native mobile version uses expo-video.
 * • VideoFeed auto-plays videos only when visible.
 * • Filters include icons for search & location, and text items for
 *   actual categories.
 * • This screen is simple but VERY important in the navigation stack.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  RefreshControl,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoFeed from '../components/VideoFeed';

import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type FilterType = 'All' | 'Trips' | 'Lodging' | 'Entertainment';

/**
 * On web, we load WebVideoFeed dynamically so native builds do not bundle it.
 * This avoids errors since WebVideoFeed uses HTML <video>.
 */
let WebVideoFeed: React.ComponentType<{
  filter?: FilterType;
  initialVideoId?: string;
  feedActive?: boolean;
}> | null = null;

if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebVideoFeed = require('../components/WebVideoFeed').default;
}

type FilterItem = {
  key: string;
  label: string;
  icon?: string;
};

export default function HomeFeedScreen({ route }: any) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isFocused = useIsFocused();
  const feedActive = isFocused;

  // Selected category filter
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh - in real app, fetch new data from API
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // In case navigation sends us a specific video to jump to
  const videoId = route?.params?.videoId;

  /**
   * List of filter items displayed in the top bar.
   * Some have icons, some are text-only categories.
   */
  const filters: FilterItem[] = [
    { key: 'search', icon: 'search-outline', label: '' },
    { key: 'All', label: 'All' },
    { key: 'Trips', label: 'Trips' },
    { key: 'Lodging', label: 'Lodging' },
    { key: 'Entertainment', label: 'Entertainment' },
    { key: 'location', icon: 'location-outline', label: '' },
  ];

  const isWeb = Platform.OS === 'web';

  // Keep the filter bar below the notch / status bar
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* -----------------------------------------------------------
           FILTER BAR (top navigation chips)
         ----------------------------------------------------------- */}
      <View style={[styles.filterBar, { paddingTop: insets.top + 8 }]}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterItem,
              selectedFilter === f.key && styles.filterItemActive,
            ]}
            onPress={() => {
              if (f.key === 'search') {
                navigation.navigate('Search');
                return;
              }

              // Update filter only if it's one of the categories
              if (
                f.key === 'All' ||
                f.key === 'Trips' ||
                f.key === 'Lodging' ||
                f.key === 'Entertainment'
              ) {
                setSelectedFilter(f.key);
              }
            }}
          >
            {/* Icon filters (search / location) */}
            {f.icon ? (
              <Ionicons name={f.icon as any} size={22} color="#fff" />
            ) : (
              // Text filters (categories)
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === f.key && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* -----------------------------------------------------------
           MAIN VIDEO FEED
           - Web uses WebVideoFeed (HTML <video>)
           - Native uses VideoFeed (expo-video)
         ----------------------------------------------------------- */}
      <View style={{ flex: 1 }}>
        {isWeb && WebVideoFeed ? (
          <WebVideoFeed filter={selectedFilter} initialVideoId={videoId} feedActive={feedActive} />
        ) : (
          <VideoFeed 
            filter={selectedFilter} 
            initialVideoId={videoId} 
            feedActive={feedActive}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}
      </View>
    </View>
  );
}

/* --------------------------------------------------------------------
   STYLES
-------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Pure black Veeky theme
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#000',
  },
  filterItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  filterItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  filterText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
});
