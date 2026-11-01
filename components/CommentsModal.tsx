/**
 * ./components/CommentsModal.tsx
 *  
 * This component shows a full comment system inside a modal.
 * It is used in the Veeky video feed to let users read and add comments
 * without leaving the current video screen.
 *
 * Core responsibilities:
 *  ------------------------------------------------------------
 *  • Display a modal that slides from the bottom (70% of screen height)
 *  • Show all comments for a specific video (loaded from local storage)
 *  • Display an "empty state" when there are no comments
 *  • Allow users to add new comments (saved immediately in storage)
 *  • Provide an input bar with keyboard-safe layout (KeyboardAvoidingView)
 *  • Show comments in a scrollable FlatList
 *  ------------------------------------------------------------
 *
 * Architecture notes:
 *  - Comments are stored locally using the custom "storage" helper
 *    (likely AsyncStorage wrapped in a utility).
 *  - Comments are NOT synced with backend yet (MVP local system).
 *  - Works in both iOS and Android, with correct keyboard handling.
 *
 * Style:
 *  - Dark modal to match Veeky's black theme
 *  - Rounded top edges to resemble modern action sheets
 *  - Hebrew text support: RTL, strings in Hebrew
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { elevation } from '../theme/elevation';
import { storage } from '../utils/storage';

type Props = {
  visible: boolean;      // Whether the modal is shown
  videoId: string;       // Each video has its own comments
  onClose: () => void;   // Called when user closes the modal
};

export default function CommentsModal({ visible, videoId, onClose }: Props) {
  // Load comments when component mounts
  const [comments, setComments] = useState(storage.getComments(videoId));

  // Controlled input text
  const [text, setText] = useState('');

  /**
   * Add a new comment:
   * - Validate text
   * - Save using storage helper
   * - Update local state
   */
  const handleAddComment = () => {
    if (text.trim()) {
      const newComment = storage.addComment(videoId, text.trim());
      setComments([...comments, newComment]);
      setText(''); // Clear text box
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      {/* KeyboardAvoidingView ensures input stays above the keyboard */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Tapping the backdrop closes the modal */}
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        {/* Main modal content */}
        <View style={styles.content}>
          {/* Header bar */}
          <View style={styles.header}>
            <Text style={styles.title}>{comments.length} תגובות</Text>

            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* If no comments → show empty state */}
          {comments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>אין תגובות עדיין</Text>
              <Text style={styles.emptySubtext}>היה הראשון להגיב!</Text>
            </View>
          ) : (
            // Scrollable list of comments
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.comment}>
                  {/* Simple avatar placeholder */}
                  <Text style={styles.commentAvatar}>👤</Text>

                  <View style={styles.commentContent}>
                    <Text style={styles.commentText}>{item.text}</Text>
                    <Text style={styles.commentTime}>
                      {formatTime(item.timestamp)}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}

          {/* Input bar at bottom */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="הוסף תגובה..."
              placeholderTextColor="#666"
              value={text}
              onChangeText={setText}
              multiline
            />

            {/* Send button only active when text exists */}
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              onPress={handleAddComment}
              disabled={!text.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={text.trim() ? '#00D5FF' : '#666'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Convert timestamps into human-readable "time ago" Hebrew text.
 * Example:
 *  - עכשיו
 *  - לפני 3 דקות
 *  - לפני שעה
 *  - לפני 2 ימים
 */
function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דקות`;
  if (hours < 24) return `לפני ${hours} שעות`;
  return `לפני ${days} ימים`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Dark transparent background behind modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Modal body
  content: {
    ...elevation.sheet,
    height: '70%',
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#222',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },

  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  /** EMPTY STATE **/
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },

  emptySubtext: {
    color: '#888',
    fontSize: 14,
  },

  /** COMMENT ITEM **/
  comment: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },

  commentAvatar: {
    fontSize: 32,
  },

  commentContent: {
    flex: 1,
  },

  commentText: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 4,
  },

  commentTime: {
    color: '#666',
    fontSize: 12,
  },

  /** INPUT BAR **/
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 8,
  },

  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    maxHeight: 100,
  },

  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sendBtnDisabled: {
    opacity: 0.5,
  },
});
