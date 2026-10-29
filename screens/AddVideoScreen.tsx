/**
 * ./screens/AddVideoScreen.tsx
 *
 * "Add Video" screen for Veeky.
 *
 * Purpose:
 * --------------------------------------------------------------------
 * This screen is the creator/upload entry point in the app.
 * It collects all metadata needed to publish a travel video:
 *  - category (Trips / Lodging / Entertainment)
 *  - title
 *  - location
 *  - price
 *  - trip duration (days)
 *  - tags
 *  - (in the future) the actual video asset
 *
 * Current MVP state:
 * --------------------------------------------------------------------
 * ✔ UI form is implemented
 * ✔ Category selector is implemented
 * ✔ Basic required-field validation is implemented
 * ✔ Upload is simulated via setTimeout (no backend yet)
 * ✔ Haptics are triggered for better UX
 * ✔ Video file is picked from the device's file explorer (expo-document-picker)
 *
 * Future upgrades (planned):
 * --------------------------------------------------------------------
 * • Upload to backend (multipart upload / presigned URLs / CDN)
 * • Validate formats (numeric values, currency formatting, tags parsing)
 * • Preview the selected video
 * • Add creator/influencer association + location auto-complete
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { haptics } from '../utils/haptics';

/**
 * Categories supported in the app.
 * These align with your HomeFeed filter chips and video data model.
 */
type Category = 'Trips' | 'Lodging' | 'Entertainment';

export default function AddVideoScreen() {
  /**
   * Form state (controlled inputs).
   * - videoUri / videoName come from the file picker (local file, not uploaded yet).
   */
  const [videoUri, setVideoUri] = useState('');
  const [videoName, setVideoName] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [category, setCategory] = useState<Category>('Trips');
  const [tags, setTags] = useState('');

  /**
   * UI state for simulated upload.
   * Used to disable the upload button and show "uploading..." feedback.
   */
  const [uploading, setUploading] = useState(false);

  /**
   * pickVideo()
   *
   * Opens the device's file explorer (Files on iOS, file manager on
   * Android, file dialog on web), limited to video files, and stores
   * the picked file's local URI and name.
   */
  const pickVideo = async () => {
    haptics.light();

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setVideoUri(file.uri);
      setVideoName(file.name);
      haptics.success();
    } catch {
      alert('לא הצלחנו לפתוח את הקבצים, נסה שוב');
    }
  };

  /**
   * handleUpload()
   *
   * Performs minimal required-field validation and simulates
   * a successful upload via setTimeout.
   *
   * In production:
   * - Validate inputs (numbers, currency, tag parsing)
   * - Upload video to storage/CDN
   * - Send metadata to backend
   */
  const handleUpload = async () => {
    if (!videoUri) {
      alert('צריך לבחור וידאו קודם');
      return;
    }

    if (!title || !location || !price || !days) {
      alert('נא למלא את כל השדות');
      return;
    }

    setUploading(true);
    haptics.success();

    // TODO: Upload to backend
    setTimeout(() => {
      setUploading(false);
      alert('הוידאו הועלה בהצלחה! 🎉');

      // Reset form after successful upload
      setTitle('');
      setLocation('');
      setPrice('');
      setDays('');
      setTags('');
      setVideoUri('');
      setVideoName('');
    }, 2000);
  };

  return (
    <ScrollView style={styles.container}>
      {/* ------------------------------------------------------------
          HEADER: Title + subtitle
         ------------------------------------------------------------ */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>העלאת וידאו חדש</Text>
        <Text style={styles.headerSubtitle}>שתף את חוויית הטיול שלך</Text>
      </View>

      {/* ------------------------------------------------------------
          VIDEO PICKER AREA (placeholder)
         ------------------------------------------------------------ */}
      <TouchableOpacity style={styles.videoPicker} onPress={pickVideo}>
        {videoUri ? (
          // A video was picked: show its name, tap again to replace it
          <View style={styles.videoPreview}>
            <Ionicons name="videocam" size={48} color="#00D5FF" />
            <Text style={styles.videoText}>וידאו נבחר</Text>
            <Text style={styles.videoName} numberOfLines={1}>
              {videoName}
            </Text>
            <Text style={styles.videoHint}>לחץ להחלפה</Text>
          </View>
        ) : (
          // Default empty state (no video selected yet)
          <View style={styles.videoPlaceholder}>
            <Ionicons name="cloud-upload-outline" size={64} color="#666" />
            <Text style={styles.placeholderText}>לחץ לבחירת וידאו</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ------------------------------------------------------------
          CATEGORY SELECTION (Trips/Lodging/Entertainment)
         ------------------------------------------------------------ */}
      <View style={styles.section}>
        <Text style={styles.label}>קטגוריה</Text>
        <View style={styles.categoryRow}>
          {(['Trips', 'Lodging', 'Entertainment'] as Category[]).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryBtn,
                category === cat && styles.categoryBtnActive,
              ]}
              onPress={() => {
                setCategory(cat);
                haptics.light();
              }}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === cat && styles.categoryTextActive,
                ]}
              >
                {cat === 'Trips'
                  ? 'טיולים'
                  : cat === 'Lodging'
                  ? 'לינה'
                  : 'בילויים'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ------------------------------------------------------------
          TITLE FIELD
         ------------------------------------------------------------ */}
      <View style={styles.section}>
        <Text style={styles.label}>כותרת</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: חופשה מדהימה ביוון"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {/* ------------------------------------------------------------
          LOCATION FIELD
         ------------------------------------------------------------ */}
      <View style={styles.section}>
        <Text style={styles.label}>מיקום</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: Santorini, Greece"
          placeholderTextColor="#666"
          value={location}
          onChangeText={setLocation}
        />
      </View>

      {/* ------------------------------------------------------------
          PRICE + DAYS (side by side)
         ------------------------------------------------------------ */}
      <View style={styles.row}>
        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>מחיר</Text>
          <TextInput
            style={styles.input}
            placeholder="₪3,500"
            placeholderTextColor="#666"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>ימים</Text>
          <TextInput
            style={styles.input}
            placeholder="7"
            placeholderTextColor="#666"
            value={days}
            onChangeText={setDays}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* ------------------------------------------------------------
          TAGS FIELD
         ------------------------------------------------------------ */}
      <View style={styles.section}>
        <Text style={styles.label}>תגיות (מופרדות בפסיק)</Text>
        <TextInput
          style={styles.input}
          placeholder="יוון, זוגות, חופשת קיץ, ים"
          placeholderTextColor="#666"
          value={tags}
          onChangeText={setTags}
          multiline
        />
      </View>

      {/* ------------------------------------------------------------
          UPLOAD BUTTON
         ------------------------------------------------------------ */}
      <TouchableOpacity
        style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
        onPress={handleUpload}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Ionicons name="hourglass-outline" size={24} color="#000" />
            <Text style={styles.uploadBtnText}>מעלה...</Text>
          </>
        ) : (
          <>
            <Ionicons name="cloud-upload" size={24} color="#000" />
            <Text style={styles.uploadBtnText}>העלה וידאו</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Spacer so content doesn't feel cramped at bottom */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* --------------------------------------------------------------------
   STYLES
-------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  videoPicker: {
    margin: 16,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  videoPreview: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  videoText: {
    color: '#00D5FF',
    fontSize: 16,
    marginTop: 12,
  },
  videoName: {
    color: '#fff',
    fontSize: 14,
    marginTop: 6,
    paddingHorizontal: 24,
  },
  videoHint: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  categoryBtnActive: {
    backgroundColor: '#00D5FF',
    borderColor: '#00D5FF',
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#00D5FF',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});
