import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWebSocket } from '../context/WebSocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QueueBar from '../components/QueueBar';
import BottomNavBar from '../components/navbar';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';
import { useAdmin } from '../context/AdminContext';
import { usePlaylistService, type Playlist } from '../services/playlistService';

export default function LibraryScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const { isConnected } = useWebSocket();
  const { isAdmin } = useAdmin();
  const playlistService = usePlaylistService();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isConnected) {
      router.push('/screens/LoadingScreen');
      return;
    }
    
    fetchPlaylists();
  }, [isConnected]);

  useEffect(() => {
    const handlePlaylistsResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Playlists received:', data);
      if (data.playlists) {
        setPlaylists(data.playlists);
      }
      setLoading(false);
    };

    const handleCreatePlaylistResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Create playlist response:', data);
      if (data.success) {
        fetchPlaylists();
      }
    };

    playlistService.addMessageListener('get_playlists', handlePlaylistsResponse);
    playlistService.addMessageListener('create_playlist', handleCreatePlaylistResponse);

    return () => {
      playlistService.removeMessageListener('get_playlists', handlePlaylistsResponse);
      playlistService.removeMessageListener('create_playlist', handleCreatePlaylistResponse);
    };
  }, []);

  const fetchPlaylists = async () => {
    try {
      await playlistService.getPlaylists();
    } catch (error) {
      if (DEBUG_MODE) logger.error('Error fetching playlists:', error);
      setLoading(false);
    }
  };

  const [currentTab, setCurrentTab] = useState<'Home' | 'Search' | 'Library' | 'Admin'>('Library');

  const handleTabChange = (tab: 'Home' | 'Search' | 'Library' | 'Admin') => {
    setCurrentTab(tab);
  };

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <TouchableOpacity 
      style={styles.playlistItem}
      onPress={() => router.push(`/screens/PlaylistDetail?playlistId=${item.id}`)}
    >
      <View style={styles.playlistIcon}>
        <Ionicons name="list" size={24} color="#1DB954" />
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.playlistCount}>{item.songCount} songs</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/screens/CreatePlaylist')}
        >
          <Ionicons name="add" size={24} color="#1DB954" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playlists</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading playlists...</Text>
            </View>
          ) : playlists.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="list" size={48} color="#666" />
              <Text style={styles.emptyText}>No playlists yet</Text>
              <TouchableOpacity 
                style={styles.createPlaylistButton}
                onPress={() => router.push('/screens/CreatePlaylist')}
              >
                <Text style={styles.createPlaylistButtonText}>Create Your First Playlist</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={playlists}
              renderItem={renderPlaylist}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes" size={48} color="#666" />
            <Text style={styles.emptyText}>No recently played songs</Text>
          </View>
        </View>
      </ScrollView>

      <QueueBar />
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
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  playlistIcon: {
    marginRight: 16,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  playlistCount: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#b3b3b3',
    fontSize: 16,
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#b3b3b3',
    fontSize: 16,
  },
  createPlaylistButton: {
    backgroundColor: '#1DB954',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  createPlaylistButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 