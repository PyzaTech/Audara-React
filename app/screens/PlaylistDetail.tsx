import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlaylistService, type Playlist, type PlaylistSong } from '../services/playlistService';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import QueueBar from '../components/QueueBar';
import BottomNavBar from '../components/navbar';
import { useAdmin } from '../context/AdminContext';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';

export default function PlaylistDetailScreen() {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { playlistId } = useLocalSearchParams<{ playlistId: string }>();
  const playlistService = usePlaylistService();
  const { streamSong } = useAudioPlayer();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentTab, setCurrentTab] = useState<'Home' | 'Search' | 'Library' | 'Admin'>('Library');

  const handleTabChange = (tab: 'Home' | 'Search' | 'Library' | 'Admin') => {
    setCurrentTab(tab);
  };

  useEffect(() => {
    if (playlistId) {
      fetchPlaylistSongs();
    }
  }, [playlistId]);

  const fetchPlaylistSongs = async () => {
    if (!playlistId) return;
    
    setLoading(true);
    try {
      await playlistService.getPlaylistSongs(playlistId);
    } catch (error) {
      if (DEBUG_MODE) logger.error('Error fetching playlist songs:', error);
      Alert.alert('Error', 'Failed to load playlist songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handlePlaylistSongsResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Playlist songs received:', data);
      if (data.playlist) {
        setPlaylist(data.playlist);
      }
    };

    const handlePlayPlaylistResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Play playlist response received:', data);
      // Handle the response from playing a playlist
      if (data.success && data.songs && Array.isArray(data.songs)) {
        // Queue all songs from the playlist
        data.songs.forEach((song: any) => {
          streamSong({
            title: song.title,
            artist: song.artist,
            image: song.image,
            url: song.url || '',
            duration: song.duration,
          });
        });
      }
    };

    playlistService.addMessageListener('get_playlist_songs', handlePlaylistSongsResponse);
    playlistService.addMessageListener('play_playlist', handlePlayPlaylistResponse);

    return () => {
      playlistService.removeMessageListener('get_playlist_songs', handlePlaylistSongsResponse);
      playlistService.removeMessageListener('play_playlist', handlePlayPlaylistResponse);
    };
  }, []);

  const handlePlaySong = async (song: PlaylistSong) => {
    try {
      await streamSong({
        title: song.title,
        artist: song.artist,
        image: song.image,
        url: '',
        duration: song.duration,
      });
    } catch (error) {
      if (DEBUG_MODE) logger.error('Error playing song:', error);
      Alert.alert('Error', 'Failed to play song');
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!playlistId) return;

    Alert.alert(
      'Remove Song',
      'Are you sure you want to remove this song from the playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await playlistService.removeSongFromPlaylist(playlistId, songId);
              await fetchPlaylistSongs();
            } catch (error) {
              if (DEBUG_MODE) logger.error('Error removing song:', error);
              Alert.alert('Error', 'Failed to remove song from playlist');
            }
          },
        },
      ]
    );
  };

  const handlePlayPlaylist = async () => {
    if (!playlistId) return;

    try {
      await playlistService.playPlaylist(playlistId);
    } catch (error) {
      if (DEBUG_MODE) logger.error('Error playing playlist:', error);
      Alert.alert('Error', 'Failed to play playlist');
    }
  };

  const renderSong = ({ item }: { item: PlaylistSong }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => handlePlaySong(item)}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.songImage} />
      ) : (
        <Ionicons name="musical-notes" size={50} color="white" style={styles.songImage} />
      )}
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{item.title}</Text>
        <Text style={styles.songArtist}>{item.artist}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveSong(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#ff4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{playlist?.name || 'Playlist'}</Text>
        <TouchableOpacity onPress={handlePlayPlaylist} style={styles.playButton}>
          <Ionicons name="play" size={24} color="#1DB954" />
        </TouchableOpacity>
      </View>

      {playlist && (
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistDescription}>
            {playlist.description || 'No description'}
          </Text>
          <Text style={styles.songCount}>
            {playlist.songCount} song{playlist.songCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={playlist?.songs || []}
        renderItem={renderSong}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.songList}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await fetchPlaylistSongs();
          setRefreshing(false);
        }}
      />

      {playlist?.songs.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes" size={48} color="#666" />
          <Text style={styles.emptyText}>No songs in this playlist</Text>
          <Text style={styles.emptySubtext}>Add songs from search to get started</Text>
        </View>
      )}

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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  playButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  playlistDescription: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 8,
  },
  songCount: {
    color: '#666',
    fontSize: 12,
  },
  songList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  songArtist: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#b3b3b3',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
}); 