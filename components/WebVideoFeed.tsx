/**
 * ./components/WebVideoFeed.tsx
 *
 * This is the web-optimized version of the Veeky video feed.
 * Because Expo Native video (expo-video) doesn't run inside web browsers,
 * we build a **100% HTML <video> implementation** here.
 *
 * -------------------------------------------------------------------------
 * What this feed does:
 * -------------------------------------------------------------------------
 * ✔ Renders a vertical full-page scrolling video feed (TikTok-style)
 * ✔ Uses <ScrollView> with snapToInterval = screen height (one video per page)
 * ✔ Autoplays the video currently in view
 * ✔ Pauses all other videos when the user swipes away
 * ✔ Detects “scroll end” using a timeout approach (because web has no
 *   reliable onMomentumScrollEnd event)
 * ✔ Supports category filtering
 * ✔ Supports full interactions:
 *      - Like / Save / Comment / Share
 *      - Tap to play/pause
 *      - Comments modal
 *      - Itinerary modal
 * ✔ Reuses logic from VideoItem but adapted for Web
 *
 * Why this file exists:
 * -------------------------------------------------------------------------
 * On mobile/native we use <VideoView> from expo-video.
 * On web this doesn't exist, so we must manage:
 *    - Raw <video> HTML tags
 *    - Manual play() / pause()
 *    - Manual scroll detection
 *
 * This file ensures Veeky works perfectly on browsers.
 */

import React, {
  useMemo,
  useRef,
  useState,
  useEffect
} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
  Animated,
  Text,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { VideoData } from './VideoFeed';
import { videoService } from '../services/videoService';
import { storage } from '../utils/storage';
import CommentsModal from './CommentsModal';
import ItineraryModal from './ItineraryModal';
import CaptionSheet from './CaptionSheet';
import FeedStatus from './FeedStatus';
import { RootStackParamList } from '../navigation/RootNavigator';

const { width } = Dimensions.get('window');

type FilterType = 'All' | 'Trips' | 'Lodging' | 'Entertainment';

type WebVideoFeedProps = {
  filter?: FilterType;
  initialVideoId?: string;
  feedActive?: boolean; // NEW
};

export default function WebVideoFeed({ filter = 'All', initialVideoId, feedActive = true }: WebVideoFeedProps) {
  const { height } = useWindowDimensions();

  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    loadVideos();
  }, [filter]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const data = await videoService.getVideos(0, 20, filter === 'All' ? undefined : filter);
      console.log('📹 [WEB] Loaded from DB:', data.length, 'videos');
      
      setVideos(data);
    } catch (err) {
      console.error('❌ [WEB] Error loading videos:', err);
      setLoadFailed(true);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => videos, [videos]);

  /**
   * Index of the video that is currently visible / playing
   */
  const [activeIndex, setActiveIndex] = useState(0);

  // Keep current index as a ref so wheel/touch handlers never use stale state
  const activeIndexRef = useRef(0);

  /**
   * Hold refs to all <video> HTML elements
   * (One ref per video item)
   */
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  // Gesture control (Shorts-like: one gesture = one step)
  const touchStartYRef = useRef<number | null>(null);
  const wheelLockRef = useRef(false);

  const clampIndex = (idx: number, max: number) => Math.max(0, Math.min(max, idx));

  /**
   * Play only the video at index, pause all others
   */
  const playIndex = (index: number) => {
    videoRefs.current.forEach((videoEl: HTMLVideoElement | null, idx: number) => {
      if (!videoEl) return;

      if (idx === index) {
        // Play from current position (don't restart)
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    });

    setActiveIndex(index);
    activeIndexRef.current = index;
  };

  const goToIndex = (index: number, animated = true) => {
    const maxIndex = filteredData.length - 1;
    const next = clampIndex(index, maxIndex);

    scrollViewRef.current?.scrollTo({ y: height * next, animated });
    playIndex(next);
  };

  useEffect(() => {
    if (!feedActive) {
      // Pause everything when user leaves Home tab
      videoRefs.current.forEach((v: HTMLVideoElement | null) => v?.pause());
      return;
    }

    // When coming back, resume the current activeIndex
    if (filteredData.length > 0) {
      playIndex(activeIndex);
    }
  }, [feedActive, activeIndex, filteredData.length]);

  useEffect(() => {
    if (!initialVideoId) return;

    const index = filteredData.findIndex((v: VideoData) => v.id === initialVideoId);
    if (index === -1) return;

    setTimeout(() => {
      goToIndex(index, false);
    }, 50);
  }, [initialVideoId, filteredData, height]);

  /**
   * On mount:
   *   - Try to autoplay first video
   * On unmount:
   *   - Clear timeout
   *   - Pause all videos
   */
  useEffect(() => {
    if (!feedActive) return;

    if (filteredData.length > 0) {
      // ✅ If we already scrolled to another video, resume that one (not the first)
      playIndex(Math.min(activeIndex, filteredData.length - 1));
    }

    return () => {
      videoRefs.current.forEach((v: HTMLVideoElement | null) => v?.pause());
    };
  }, [filteredData.length, feedActive, activeIndex]);

  /**
   * Called when user taps on the video → toggles play/pause
   * Also returns action so UI can show icon (play/pause)
   */
  const handleToggleFromItem = (index: number): 'play' | 'pause' => {
    const el = videoRefs.current[index];
    if (!el) return 'pause';

    if (el.paused) {
      playIndex(index); // Also pauses all others
      return 'play';
    } else {
      el.pause();
      return 'pause';
    }
  };

  // Track if any modal is open
  const [anyModalOpen, setAnyModalOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Shorts-like web paging: one wheel/touch gesture = one step
  // ---------------------------------------------------------------------------
  const handleWheel = (e: any) => {
    if (anyModalOpen) return; // Block scrolling when modal is open
    if (!feedActive) return;
    if (wheelLockRef.current) return;

    wheelLockRef.current = true;

    const deltaY = e?.nativeEvent?.deltaY ?? e?.deltaY ?? 0;
    const dir = deltaY > 0 ? 1 : -1;

    goToIndex(activeIndexRef.current + dir, true);

    // Lock long enough to avoid multiple steps from one wheel fling
    setTimeout(() => {
      wheelLockRef.current = false;
    }, 320);
  };

  const handleTouchStart = (e: any) => {
    if (anyModalOpen) return; // Block touch when modal is open
    if (!feedActive) return;
    const y = e?.nativeEvent?.pageY ?? e?.touches?.[0]?.pageY ?? null;
    touchStartYRef.current = typeof y === 'number' ? y : null;
  };

  const handleTouchEnd = (e: any) => {
    if (anyModalOpen) return; // Block touch when modal is open
    if (!feedActive) return;

    const startY = touchStartYRef.current;
    touchStartYRef.current = null;
    if (typeof startY !== 'number') return;

    const endY = e?.nativeEvent?.pageY ?? e?.changedTouches?.[0]?.pageY ?? null;
    if (typeof endY !== 'number') return;

    const delta = endY - startY;
    const threshold = 40;

    if (delta <= -threshold) goToIndex(activeIndexRef.current + 1, true); // swipe up => next
    else if (delta >= threshold) goToIndex(activeIndexRef.current - 1, true); // swipe down => prev
    else goToIndex(activeIndexRef.current, true); // snap back
  };

  /**
   * Main render: Each child is a <WebVideoItem/> component
   */
  const WheelView: any = View;

  if (loading) return <FeedStatus status="loading" />;
  if (loadFailed) return <FeedStatus status="error" onRetry={loadVideos} />;
  if (filteredData.length === 0) return <FeedStatus status="empty" onRetry={loadVideos} />;

  return (
    <WheelView
      style={{ flex: 1 }}
      {...(Platform.OS === 'web' ? { onWheel: handleWheel } : {})}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <ScrollView
        ref={scrollViewRef}
        scrollEnabled={false} // ✅ critical: disable native momentum scrolling
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ height: height * filteredData.length }}
      >
        {filteredData.map((video: VideoData, index: number) => (
          <WebVideoItem
            key={video.id}
            video={video}
            index={index}
            height={height}
            provideRef={(el) => (videoRefs.current[index] = el)}
            onToggle={handleToggleFromItem}
            onModalChange={setAnyModalOpen}
          />
        ))}
      </ScrollView>
    </WheelView>
  );
}

/* ============================================================================
 *                            WebVideoItem (ONE ITEM)
 * ============================================================================
 */

type WebVideoItemProps = {
  video: VideoData;
  index: number;
  height: number;
  provideRef: (el: HTMLVideoElement | null) => void;
  onToggle: (index: number) => 'play' | 'pause';
  onModalChange: (open: boolean) => void;
};

function WebVideoItem({
  video,
  index,
  height,
  provideRef,
  onToggle,
  onModalChange,
}: WebVideoItemProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Center tap feedback (UI only)
  const [tapIcon, setTapIcon] = useState<'play' | 'pause' | null>(null);
  const tapIconAnim = useRef(new Animated.Value(0)).current;
  
  // Double tap to like
  const [likeIcon, setLikeIcon] = useState(false);
  const likeIconAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number>(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingBeforeHold = useRef(false);
  
  // Progress bar
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Like / save / comments UI state
  const [isLiked, setIsLiked] = useState(storage.isLiked(video.id));
  const [isSaved, setIsSaved] = useState(storage.isSaved(video.id));
  const [likesCount, setLikesCount] = useState(video.likes_count || 0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [commentsCount, setCommentsCount] = useState(
    storage.getComments(video.id).length
  );
  const [itineraryVisible, setItineraryVisible] = useState(false);

  /**
   * Animate tap icon
   */
  const showTapIcon = (type: 'play' | 'pause') => {
    setTapIcon(type);
    tapIconAnim.setValue(1);

    Animated.timing(tapIconAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => setTapIcon(null));
  };

  const showLikeAnimation = () => {
    setLikeIcon(true);
    likeIconAnim.setValue(0);

    Animated.sequence([
      Animated.spring(likeIconAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(likeIconAnim, {
        toValue: 0,
        duration: 300,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setLikeIcon(false));
  };

  /**
   * TikTok-style tap behavior:
   * - Single tap: toggle play/pause
   * - Double tap: like
   * - Long press (hold): pause while holding, resume on release
   */
  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap - like
      lastTap.current = 0;
      if (!isLiked) {
        const liked = storage.toggleLike(video.id);
        setIsLiked(liked);
        setLikesCount((prev: number) => prev + 1);
        showLikeAnimation();
      }
      return;
    }

    lastTap.current = now;
    const action = onToggle(index);
    showTapIcon(action);
  };

  const handlePressIn = () => {
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        wasPlayingBeforeHold.current = true;
        videoRef.current.pause();
      } else {
        wasPlayingBeforeHold.current = false;
      }
    }, 200); // 200ms to detect long press
  };

  const handlePressOut = () => {
    // Clear timer if released before long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Resume if was playing before hold
    if (wasPlayingBeforeHold.current && videoRef.current) {
      videoRef.current.play();
      wasPlayingBeforeHold.current = false;
    }
  };

  /**
   * Likes / saves
   */
  const handleLike = () => {
    const liked = storage.toggleLike(video.id);
    setIsLiked(liked);
    setLikesCount((prev: number) => (liked ? prev + 1 : prev - 1));
  };

  const handleSave = () => {
    const saved = storage.toggleSave(video.id);
    setIsSaved(saved);
  };

  const handleComments = () => setCommentsVisible(true);

  const handleCloseComments = () => {
    setCommentsVisible(false);
    setCommentsCount(storage.getComments(video.id).length);
  };

  const handleInfluencer = () => {
    const influencerId = video.profile?.id || video.user_id;
    if (influencerId) {
      navigation.navigate('Influencer', { influencerId });
    }
  };

  const handleTagPress = (tag: string) => {
    navigation.navigate('Search', { query: tag, mode: 'tags' });
  };

  const handleDetails = () => {
    setItineraryVisible(true);
    onModalChange(true);
  };

  const handleCloseItinerary = () => {
    setItineraryVisible(false);
    onModalChange(false);
  };

  // Caption is shown in 2 lines; "עוד" opens the full text in CaptionSheet
  const caption = video.description?.trim() ?? '';
  const [captionVisible, setCaptionVisible] = useState(false);

  const handleCaption = () => {
    setCaptionVisible(true);
    onModalChange(true);
  };

  const handleCloseCaption = () => {
    setCaptionVisible(false);
    onModalChange(false);
  };

  // Pause video when modal opens
  useEffect(() => {
    if (itineraryVisible && videoRef.current) {
      videoRef.current.pause();
    } else if (!itineraryVisible && videoRef.current && !videoRef.current.paused) {
      // Don't auto-resume - let user control
    }
  }, [itineraryVisible]);

  // Track progress
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      setProgress(el.currentTime);
      setDuration(el.duration || 0);
    };

    el.addEventListener('timeupdate', handleTimeUpdate);
    return () => el.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  return (
    <View style={[styles.itemContainer, { height }]}>
      <View style={styles.videoWrapper}>
        {/* RAW HTML5 VIDEO ELEMENT */}
        <video
          ref={(el: HTMLVideoElement | null) => {
            provideRef(el);
            videoRef.current = el;
          }}
          src={video.video_url}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          playsInline
          muted={false}
          loop
          autoPlay
        />

        {/* Tap layer for toggle play/pause */}
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />

        {/* Center feedback icon */}
        {tapIcon && (
          <Animated.View
            pointerEvents="none"
            style={[styles.centerIconContainer, { opacity: tapIconAnim }]}
          >
            <Ionicons
              name={tapIcon === 'play' ? 'play-circle' : 'pause-circle'}
              size={72}
              color="#fff"
            />
          </Animated.View>
        )}

        {/* Double tap like animation */}
        {likeIcon && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.centerIconContainer,
              {
                opacity: likeIconAnim,
                transform: [
                  {
                    scale: likeIconAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1.2],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="heart" size={120} color="#FF3B5C" />
          </Animated.View>
        )}

        {/* Progress bar */}
        {duration > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(progress / duration) * 100}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* RIGHT ACTION BUTTONS */}
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={32}
              color={isLiked ? '#FF3B5C' : '#fff'}
            />
            <Text style={styles.actionText}>{formatCount(likesCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleComments}>
            <Ionicons name="chatbubble-outline" size={30} color="#fff" />
            <Text style={styles.actionText}>{formatCount(commentsCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={30}
              color={isSaved ? '#FFD700' : '#fff'}
            />
            <Text style={styles.actionText}>שמור</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <Ionicons name="share-outline" size={30} color="#fff" />
            <Text style={styles.actionText}>
              {formatCount(video.shares_count || 0)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM INFO PANEL */}
        <View style={styles.bottomInfo}>
          <TouchableOpacity
            style={styles.influencerRow}
            onPress={handleInfluencer}
          >
            <Text style={styles.avatar}>{video.profile?.avatar_url || '👤'}</Text>
            <Text style={styles.influencerName}>
              {video.profile?.full_name || 'Unknown'}
              {video.profile?.verified && ' ✓'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>{video.title}</Text>

          {caption.length > 0 && (
            <TouchableOpacity
              onPress={handleCaption}
              activeOpacity={0.8}
              style={styles.captionBox}
            >
              <Text style={styles.caption} numberOfLines={2}>
                {caption}
              </Text>
              <Text style={styles.captionMore}>עוד</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.days}>🗓️ {video.days} ימים</Text>
          <Text style={styles.location}>📍 {video.location}</Text>

          {video.tags && Array.isArray(video.tags) && video.tags.length > 0 && (
            <ScrollView
              style={styles.tagsScroll}
              contentContainerStyle={styles.tagsContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {video.tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagPill}
                  onPress={() => handleTagPress(tag)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tagText}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={handleDetails}
            >
              <Text style={styles.detailsBtnText}>פרטים</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bookBtn} onPress={() => {}}>
              <Text style={styles.bookBtnText}>הזמנה מהירה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* COMMENTS MODAL */}
      <CommentsModal
        visible={commentsVisible}
        videoId={video.id}
        onClose={handleCloseComments}
      />

      {/* ITINERARY MODAL */}
      <ItineraryModal
        visible={itineraryVisible}
        video={video}
        onClose={handleCloseItinerary}
      />

      {/* CAPTION SHEET */}
      <CaptionSheet
        visible={captionVisible}
        title={video.title}
        caption={caption}
        onClose={handleCloseCaption}
      />
    </View>
  );
}

/* ============================================================================
 *                              HELPERS + STYLES
 * ============================================================================
 */

function formatCount(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

const styles = StyleSheet.create({
  itemContainer: {
    width,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerIconContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    gap: 20,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 140,
    left: 12,
    right: 80,
  },
  influencerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    fontSize: 32,
  },
  influencerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captionBox: {
    marginBottom: 6,
  },
  caption: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captionMore: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  days: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  location: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagsScroll: {
    maxHeight: 34,
    marginBottom: 8,
  },
  tagsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  tagPill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 4,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fff',
    flex: 1,
    alignItems: 'center',
  },
  detailsBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  bookBtn: {
    backgroundColor: '#00D5FF',
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressBar: {
    flex: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D5FF',
  },
});
