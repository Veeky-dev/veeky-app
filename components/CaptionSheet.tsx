/**
 * ./components/CaptionSheet.tsx
 *
 * Small bottom-sheet that shows a video's full caption.
 * Opened from the truncated caption ("עוד") in VideoItem.tsx.
 * Styled like CommentsModal: dark sheet, rounded top edges, tap backdrop to close.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  title: string;
  caption: string;
  onClose: () => void;
};

export default function CaptionSheet({ visible, title, caption, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Tapping the backdrop closes the sheet */}
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            <TouchableOpacity onPress={onClose} accessibilityLabel="סגירה">
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.caption}>{caption}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    maxHeight: '50%',
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
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    padding: 16,
    paddingBottom: 32,
  },
  caption: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
});
