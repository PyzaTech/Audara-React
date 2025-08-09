import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlaylistService } from '../services/playlistService';
import BottomNavBar from '../components/navbar';
import { useAdmin } from '../context/AdminContext';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';

export default function CreatePlaylistScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const playlistService = usePlaylistService();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentTab, setCurrentTab] = useState<'Home' | 'Search' | 'Library' | 'Admin'>('Library');

  const handleTabChange = (tab: 'Home' | 'Search' | 'Library' | 'Admin') => {
    setCurrentTab(tab);
  };

  const handleCreatePlaylist = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    setLoading(true);
    try {
      await playlistService.createPlaylist(name.trim(), description.trim());
      Alert.alert(
        'Success',
        'Playlist created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      if (DEBUG_MODE) logger.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Playlist</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Playlist Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter playlist name"
            placeholderTextColor="#666"
            maxLength={50}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter playlist description"
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            maxLength={200}
          />
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreatePlaylist}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Playlist</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <BottomNavBar currentTab={currentTab} onTabChange={handleTabChange} isAdmin={isAdmin || false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 16,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#1DB954',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#666',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 