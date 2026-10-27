/**
 * ./components/VideoItem.tsx
 * 
 * This component is the heart of the Veeky video experience.
 * It represents ONE video card in the vertical video feed (VideoFeed.tsx).
 *
 * Responsibilities:
 * --------------------------------------------------------------------------
 * ✔ Plays / pauses video automatically based on whether it's the active card
 * ✔ Allows user tap-to-play / tap-to-pause anywhere on the screen
 * ✔ Supports both Expo Native (expo-video player) and Web (HTML <video>)
 * ✔ Displays all interactive video actions:
 *      - Like (heart)
 *      - Save (bookmark)
 *      - Comment sheet
 *      - Share
 * ✔ Displays travel details overlay: influencer, title, location, days, etc.
 * ✔ Opens modals:
 *      - CommentsModal
 *      - ItineraryModal (trip details)
 *      - CaptionSheet (full caption, from the truncated caption's "עוד")
 * ✔ Uses local storage helpers to persist:
 *      - Likes
 *      - Saves
 *      - Comments count
 *
 * Architecture Notes:
 * --------------------------------------------------------------------------
 * • This file *must stay performant* — it renders once per video on screen.
 * • isActive is passed from VideoFeed.tsx and controls autoplay logic.
 * • Native and Web video players behave differently:
 *      - Native uses expo-video “VideoView” + useVideoPlayer
 *      - Web uses <video> element with manual play() / pause()
 * • tapIcon + animation gives immediate play/pause feedback.
 *
 * This is one of the most important UI components in Veeky.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  ScrollView,
  AppState,
} from 'react-native';

import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/RootNavigator';
import { VideoData } from './VideoFeed';
import { storage } from '../utils/storage';
import CommentsModal from './CommentsModal';
import ItineraryModal from './ItineraryModal';
import CaptionSheet from './CaptionSheet';

// Full-screen height/width
const { height, width } = Dimensions.get('window');

type Props = {
  video: VideoData;
  isActive: boolean; // Determines whether to auto-play this video
};

const VideoItem = React.memo(
  ({ video, isActive }: Props) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { uri, likes } = video;

  /* --------------------------------------------------------------------- *
   *                VIDEO PLAYER SETUP (NATIVE vs. WEB)
   * --------------------------------------------------------------------- */

  // Native video player (Expo)
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true; // All videos loop on native
  });

  // Web video <video> element ref
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Tracks whether the video is currently playing
  const [isPlaying, setIsPlaying] = useState(false);

  /* --------------------------------------------------------------------- *
   *                TAP FEEDBACK ICON (play/pause)
   * --------------------------------------------------------------------- */

  const [tapIcon, setTapIcon] = useState<'play' | 'pause' | null>(null);
  const tapIconAnim = useRef(new Animated.Value(0)).current;
  
  const [likeIcon, setLikeIcon] = useState(false);
  const likeIconAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number>(0);
  
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const showTapIcon = React.useCallback((type: 'play' | 'pause') => {
    setTapIcon(type);
    tapIconAnim.setValue(1);

    // Fade-out animation
    Animated.timing(tapIconAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => setTapIcon(null));
  }, [tapIconAnim]);

  const showLikeAnimation = useCallback(() => {
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
  }, [likeIconAnim]);

  /* --------------------------------------------------------------------- *
   *                UI STATE (like, save, comments, itinerary)
   * --------------------------------------------------------------------- */

  const [isLiked, setIsLiked] = useState(storage.isLiked(video.id));
  const [isSaved, setIsSaved] = useState(storage.isSaved(video.id));
  const [likesCount, setLikesCount] = useState(likes);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [commentsCount, setCommentsCount] = useState(
    storage.getComments(video.id).length
  );
  const [itineraryVisible, setItineraryVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /* --------------------------------------------------------------------- *
   *                AUTO PLAY / PAUSE WHEN ACTIVE CHANGES
   * --------------------------------------------------------------------- */

  useEffect(() => {
    if (Platform.OS === 'web') {
      const el = videoRef.current;
      if (!el) return;

      const handleLoadStart = () => setLoading(true);
      const handleCanPlay = () => {
        setLoading(false);
        setError(false);
      };
      const handleError = () => {
        setLoading(false);
        setError(true);
      };
      const handleTimeUpdate = () => {
        setProgress(el.currentTime);
        setDuration(el.duration || 0);
      };

      el.addEventListener('loadstart', handleLoadStart);
      el.addEventListener('canplay', handleCanPlay);
      el.addEventListener('error', handleError);
      el.addEventListener('timeupdate', handleTimeUpdate);

      if (isActive) {
        el.play().then(() => setIsPlaying(true)).catch(() => setError(true));
      } else {
        el.pause();
        setIsPlaying(false);
      }

      return () => {
        el.removeEventListener('loadstart', handleLoadStart);
        el.removeEventListener('canplay', handleCanPlay);
        el.removeEventListener('error', handleError);
        el.removeEventListener('timeupdate', handleTimeUpdate);
      };
    } else {
      if (isActive) {
        setLoading(false);
        player.play();
        setIsPlaying(true);
      } else {
        player.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, player]);

  /* --------------------------------------------------------------------- *
   *                CLEANUP: stop video on component unmount
   * --------------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (Platform.OS === 'web') {
        videoRef.current?.pause();
      } else {
        try {
          player.pause();
        } catch {}
      }
    };
  }, [player]);


  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        try { player.pause(); } catch {}
        setIsPlaying(false);
      }
    });

    return () => sub.remove();
  }, [player]);

  /* --------------------------------------------------------------------- *
   *                BUTTON HANDLERS (like, save, comments)
   * --------------------------------------------------------------------- */

  const handleLike = React.useCallback(async () => {
    const liked = storage.toggleLike(video.id);
    setIsLiked(liked);
    setLikesCount((prev) => (liked ? prev + 1 : prev - 1));
    
    const { haptics } = await import('../utils/haptics');
    if (liked) {
      haptics.success();
    } else {
      haptics.light();
    }
  }, [video.id]);

  const handleSave = React.useCallback(async () => {
    const saved = storage.toggleSave(video.id);
    setIsSaved(saved);
    
    const { haptics } = await import('../utils/haptics');
    haptics.light();
  }, [video.id]);

  const handleComments = React.useCallback(() => setCommentsVisible(true), []);

  const handleCloseComments = React.useCallback(() => {
    setCommentsVisible(false);
    setCommentsCount(storage.getComments(video.id).length);
  }, [video.id]);

  /* --------------------------------------------------------------------- *
   *                TAP-TO-PLAY / TAP-TO-PAUSE BEHAVIOR
   * --------------------------------------------------------------------- */

  const handleDoubleTap = useCallback(async () => {
    if (!isLiked) {
      const liked = storage.toggleLike(video.id);
      setIsLiked(liked);
      setLikesCount((prev) => prev + 1);
      showLikeAnimation();
      
      const { haptics } = await import('../utils/haptics');
      haptics.success();
    }
  }, [isLiked, video.id, showLikeAnimation]);

  const handleTogglePlay = React.useCallback(() => {
    if (!isActive) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - like
      lastTap.current = 0;
      handleDoubleTap();
      return;
    }

    lastTap.current = now;

    // Single tap - toggle play/pause
    if (Platform.OS === 'web') {
      const el = videoRef.current;
      if (!el) return;

      if (isPlaying) {
        el.pause();
        setIsPlaying(false);
        showTapIcon('pause');
      } else {
        el.play().then(() => {
          setIsPlaying(true);
          showTapIcon('play');
        }).catch(() => {});
      }
    } else {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
        showTapIcon('pause');
      } else {
        player.play();
        setIsPlaying(true);
        showTapIcon('play');
      }
    }
  }, [isActive, isPlaying, player, showTapIcon, handleDoubleTap]);

  /* --------------------------------------------------------------------- *
   *                TAG PRESS (opens Search screen)
   * --------------------------------------------------------------------- */

  const handleTagPress = React.useCallback((tag: string) => {
    // Navigate to Search with a pre-filled query and "tags" mode
    navigation.navigate('Search', { query: tag, mode: 'tags' });
  }, [navigation]);

  const handleShare = React.useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: video.title,
            text: `${video.title} - ${video.location}`,
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          alert('הקישור הועתק ללוח!');
        }
      } else {
        const { Share } = await import('react-native');
        await Share.share({
          message: `${video.title} - ${video.location}`,
          title: video.title,
        });
      }
    } catch (err) {
      console.log('Share error:', err);
    }
  }, [video.title, video.location]);
  const handleBook = React.useCallback(() => {}, []);
  const handleDetails = React.useCallback(() => {
    setItineraryVisible(true);
    // Pause video when opening details
    if (Platform.OS === 'web') {
      videoRef.current?.pause();
    } else {
      player.pause();
    }
    setIsPlaying(false);
  }, [player]);
  const handleInfluencer = React.useCallback(() => {
    navigation.navigate('Influencer', { influencerId: video.influencer.id });
  }, [navigation, video.influencer.id]);

  /* --------------------------------------------------------------------- *
   *                               RENDER
   * --------------------------------------------------------------------- */

  return (
    <View style={styles.container}>
      {/* VIDEO LAYER: Web vs Native */}
      {Platform.OS === 'web' ? (
        <>
          <View style={styles.video}>
            <video
              ref={videoRef}
              src={uri}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              playsInline
            />
          </View>

          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleTogglePlay}
          />
        </>
      ) : (
        <>
          <VideoView
            style={styles.video}
            player={player}
            contentFit="cover"
            allowsPictureInPicture={false}
            fullscreenOptions={{ enable: false }}
            nativeControls={false}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleTogglePlay}
          />
        </>
      )}

      {/* TAP FEEDBACK ICON */}
      {tapIcon && (
        <Animated.View
          pointerEvents="none"
          style={[overlayStyles.centerIconContainer, { opacity: tapIconAnim }]}
        >
          <Ionicons
            name={tapIcon === 'play' ? 'play-circle' : 'pause-circle'}
            size={72}
            color="#fff"
          />
        </Animated.View>
      )}

      {/* DOUBLE TAP LIKE ANIMATION */}
      {likeIcon && (
        <Animated.View
          pointerEvents="none"
          style={[
            overlayStyles.centerIconContainer,
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

      {/* VIDEO PROGRESS BAR */}
      {isActive && !loading && !error && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' },
              ]}
            />
          </View>
        </View>
      )}

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingContainer}>
          <View style={styles.spinner}>
            <Ionicons name="hourglass-outline" size={48} color="#fff" />
          </View>
          <Text style={styles.loadingText}>טוען וידאו...</Text>
        </View>
      )}
      
      {/* Error state with retry */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B5C" />
          <Text style={styles.errorText}>שגיאה בטעינת הסרטון</Text>
          <TouchableOpacity 
            style={styles.retryBtn}
            onPress={() => {
              setError(false);
              setLoading(true);
              if (Platform.OS === 'web' && videoRef.current) {
                videoRef.current.load();
              }
            }}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.retryText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OVERLAY */}
      <VideoOverlay
        video={video}
        isLiked={isLiked}
        isSaved={isSaved}
        likesCount={likesCount}
        commentsCount={commentsCount}
        onLike={handleLike}
        onSave={handleSave}
        onComment={handleComments}
        onShare={handleShare}
        onBook={handleBook}
        onDetails={handleDetails}
        onInfluencer={handleInfluencer}
        onTagPress={handleTagPress}
      />

      {/* Comments popup */}
      <CommentsModal
        visible={commentsVisible}
        videoId={video.id}
        onClose={handleCloseComments}
      />

      {/* Trip details modal */}
      <ItineraryModal
        visible={itineraryVisible}
        video={video}
        onClose={() => {
          setItineraryVisible(false);
          // Resume video when closing details if active
          if (isActive) {
            if (Platform.OS === 'web') {
              videoRef.current?.play();
            } else {
              player.play();
            }
            setIsPlaying(true);
          }
        }}
      />
    </View>
  );
  },
  (prevProps, nextProps) =>
    prevProps.video === nextProps.video &&
    prevProps.isActive === nextProps.isActive
);

export default VideoItem;

/* =============================================================================
 *                           VIDEO OVERLAY (RIGHT + BOTTOM UI)
 * =============================================================================
 */

type OverlayProps = {
  video: VideoData;
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  commentsCount: number;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onShare: () => void;
  onBook: () => void;
  onDetails: () => void;
  onInfluencer: () => void;

  // ✅ NEW: tag click handler
  onTagPress: (tag: string) => void;
};

const VideoOverlay = React.memo(function VideoOverlay({
  video,
  isLiked,
  isSaved,
  likesCount,
  commentsCount,
  onLike,
  onSave,
  onComment,
  onShare,
  onBook,
  onDetails,
  onInfluencer,
  onTagPress,
}: OverlayProps) {
  // Caption is shown in 2 lines; "עוד" opens the full text in CaptionSheet
  const caption = video.description?.trim() ?? '';
  const [captionVisible, setCaptionVisible] = useState(false);

  return (
    <View style={overlayStyles.container} pointerEvents="box-none">
      {/* RIGHT-SIDE ACTION BUTTONS */}
      <View style={overlayStyles.rightActions}>
        <TouchableOpacity 
          style={overlayStyles.actionBtn} 
          onPress={onLike}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={32}
            color={isLiked ? '#FF3B5C' : '#fff'}
          />
          <Text style={overlayStyles.actionText}>{formatCount(likesCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={overlayStyles.actionBtn} 
          onPress={onComment}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={30} color="#fff" />
          <Text style={overlayStyles.actionText}>
            {formatCount(commentsCount)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={overlayStyles.actionBtn} 
          onPress={onSave}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={30}
            color={isSaved ? '#FFD700' : '#fff'}
          />
          <Text style={overlayStyles.actionText}>שמור</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={overlayStyles.actionBtn} 
          onPress={onShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={30} color="#fff" />
          <Text style={overlayStyles.actionText}>
            {formatCount(video.shares)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM INFORMATION AREA */}
      <View style={overlayStyles.bottomInfo}>
        <TouchableOpacity
          style={overlayStyles.influencerRow}
          onPress={onInfluencer}
        >
          <Text style={overlayStyles.avatar}>{video.influencer.avatar}</Text>
          <Text style={overlayStyles.influencerName}>
            {video.influencer.name}
            {video.influencer.verified && ' ✓'}
          </Text>
        </TouchableOpacity>

        <Text style={overlayStyles.title}>{video.title}</Text>

        {caption.length > 0 && (
          <TouchableOpacity
            onPress={() => setCaptionVisible(true)}
            activeOpacity={0.8}
            style={overlayStyles.captionBox}
          >
            <Text style={overlayStyles.caption} numberOfLines={2}>
              {caption}
            </Text>
            <Text style={overlayStyles.captionMore}>עוד</Text>
          </TouchableOpacity>
        )}

        <Text style={overlayStyles.days}>🗓️ {video.days} ימים</Text>
        <Text style={overlayStyles.location}>📍 {video.location}</Text>

        {video.tags && video.tags.length > 0 && (
          <ScrollView
            style={overlayStyles.tagsScroll}
            contentContainerStyle={overlayStyles.tagsContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {video.tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={overlayStyles.tagPill}
                onPress={() => onTagPress(tag)}
                activeOpacity={0.8}
              >
                <Text style={overlayStyles.tagText}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={overlayStyles.buttons}>
          <TouchableOpacity style={overlayStyles.detailsBtn} onPress={onDetails}>
            <Text style={overlayStyles.detailsBtnText}>פרטים</Text>
          </TouchableOpacity>

          <TouchableOpacity style={overlayStyles.bookBtn} onPress={onBook}>
            <Text style={overlayStyles.bookBtnText}>הזמנה מהירה</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CaptionSheet
        visible={captionVisible}
        title={video.title}
        caption={caption}
        onClose={() => setCaptionVisible(false)}
      />
    </View>
  );
});

/* =============================================================================
 *                           HELPERS + STYLES
 * =============================================================================
 */

function formatCount(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

const styles = StyleSheet.create({
  container: {
    height,
    width,
    backgroundColor: '#000',
  },
  video: {
    height: '100%',
    width: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 1,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 12,
  },
  spinner: {
    marginBottom: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00D5FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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

const overlayStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
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
  centerIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
