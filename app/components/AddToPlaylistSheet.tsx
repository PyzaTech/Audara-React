import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlaylistService, type Playlist, type PlaylistSong } from '../services/playlistService';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';

const { height: screenHeight } = Dimensions.get('window');

type AddToPlaylistSheetProps = {
  visible: boolean;
  onClose: () => void;
  song: PlaylistSong | null;
};

export default function AddToPlaylistSheet({ visible, onClose, song }: AddToPlaylistSheetProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const playlistService = usePlaylistService();

  useEffect(() => {
    if (visible) {
      // Slide up animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      fetchPlaylists();
    } else {
      // Slide down animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    const handlePlaylistsResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Playlists received for sheet:', data);
      if (data.playlists) {
        setPlaylists(data.playlists);
      }
      setLoading(false);
    };

    const handleAddSongResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Add song to playlist response:', data);
      setAddingToPlaylist(null);
      if (data.success) {
        if (DEBUG_MODE) logger.log('Successfully added song to playlist');
        onClose();
      } else {
        if (DEBUG_MODE) logger.error('Failed to add song to playlist:', data.error);
      }
    };

    playlistService.addMessageListener('get_playlists', handlePlaylistsResponse);
    playlistService.addMessageListener('add_song_to_playlist', handleAddSongResponse);

    return () => {
      playlistService.removeMessageListener('get_playlists', handlePlaylistsResponse);
      playlistService.removeMessageListener('add_song_to_playlist', handleAddSongResponse);
    };
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      await playlistService.getPlaylists();
    } catch (error) {
      if (DEBUG_MODE) logger.error('Error fetching playlists for sheet:', error);
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!song) {
      if (DEBUG_MODE) logger.error('No song provided to AddToPlaylistSheet');
      return;
    }

    if (DEBUG_MODE) logger.log('Adding song to playlist:', { playlistId, song });
    setAddingToPlaylist(playlistId);
    try {
      await playlistService.addSongToPlaylist(playlistId, song);
    } catch (error) {
      if (DEBUG_MODE) logger.error('Error adding song to playlist:', error);
      setAddingToPlaylist(null);
    }
  };

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handleAddToPlaylist(item.id)}
      disabled={addingToPlaylist === item.id}
    >
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.playlistCount}>{item.songCount} songs</Text>
      </View>
      {addingToPlaylist === item.id ? (
        <ActivityIndicator size="small" color="#1DB954" />
      ) : (
        <Ionicons name="add" size={24} color="#1DB954" />
      )}
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Overlay */}
      <Animated.View 
        style={[
          styles.overlay, 
          { opacity: overlayOpacity }
        ]} 
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View 
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle}>
          <View style={styles.handleBar} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add to Playlist</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Song Info */}
        {song && (
          <View style={styles.songInfo}>
            <Text style={styles.songTitle}>{song.title}</Text>
            <Text style={styles.songArtist}>{song.artist}</Text>
          </View>
        )}

        {/* Playlists List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text style={styles.loadingText}>Loading playlists...</Text>
          </View>
        ) : playlists.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list" size={48} color="#666" />
            <Text style={styles.emptyText}>No playlists available</Text>
            <Text style={styles.emptySubtext}>Create a playlist first</Text>
          </View>
        ) : (
          <FlatList
            data={playlists}
            renderItem={renderPlaylist}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.playlistList}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#282828',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  handle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 36,
    height: 3,
    backgroundColor: '#666',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  songInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  songTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  songArtist: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 4,
  },
  playlistList: {
    maxHeight: 400,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#b3b3b3',
    fontSize: 16,
    marginTop: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#b3b3b3',
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
});
