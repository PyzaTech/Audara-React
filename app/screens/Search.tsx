import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useWebSocket } from '../context/WebSocketContext';
import QueueBar from '../components/QueueBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavBar from '../components/navbar';
import { useAdmin } from '../context/AdminContext';
import SongOptionsSheet from '../components/SongOptionsSheet';
import AddToPlaylistSheet from '../components/AddToPlaylistSheet';
import { type PlaylistSong } from '../services/playlistService';

type Song = {
  title: string;
  artist: string;
  image: string;
  duration: number; // Add duration field
  url?: string; // Optional since we get the actual URL from WebSocket server
};

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSongOptions, setShowSongOptions] = useState(false);
  const [selectedSong, setSelectedSong] = useState<PlaylistSong | null>(null);
  const [showAddToPlaylistSheet, setShowAddToPlaylistSheet] = useState(false);
  const [downloadingSongs, setDownloadingSongs] = useState<Set<string>>(new Set());
  const { ws, sessionKey, sendEncryptedMessage, addMessageListener, removeMessageListener } = useWebSocket();

  const { streamSong, addToQueue } = useAudioPlayer();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAdmin();

  const searchSongs = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSongs([]);
      return;
    }
    setLoading(true);
    try {
      let serverUrl = (await AsyncStorage.getItem('server_url')) || '';
        serverUrl = serverUrl.replace(/^wss?:\/\//, '');
        const response = await axios.get(`http://${serverUrl}/api/deezer/search?q=${encodeURIComponent(q)}`);
      const results = (response.data.data ?? []).map((item: any) => ({
        title: item.title || 'Unknown Title',
        artist: item.artist?.name || 'Unknown Artist',
        image: item.album?.cover_big || '',
        duration: item.duration || 0, // Extract duration from Deezer API response
        // Remove the preview URL since we'll get the actual song URL from the WebSocket server
      }));
      setSongs(results);
    } catch (error) {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeSearch = async (text: string) => {
    // console.log(text)
    await setQuery(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      searchSongs(text);
    }, 500);
    setDebounceTimer(timer as unknown as NodeJS.Timeout);
  };

  const renderItem = ({ item }: { item: Song }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={async () => {
        console.log(`Selected song ${item.title} by ${item.artist}`);
        console.log('Song data:', item);
        
        // Always use streamSong to get the song from the WebSocket server
        console.log('Using streamSong to get song from WebSocket server');
        streamSong({
          ...item,
          url: '', // Dummy URL since streamSong doesn't use it - the real URL comes from WebSocket response
          duration: item.duration,
        });
      }}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.songImage} />
      ) : (
        <Ionicons name="musical-notes" size={50} color="white" style={{ marginRight: 12 }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.songTitle}>{item.title}</Text>
        <Text style={styles.songArtist}>{item.artist}</Text>
      </View>
      <TouchableOpacity
        style={styles.addToPlaylistButton}
        onPress={() => {
          setSelectedSong({
            id: `${item.title}-${item.artist}-${Date.now()}`, // Generate a unique ID with timestamp
            title: item.title,
            artist: item.artist,
            image: item.image,
            duration: item.duration,
          });
          setShowSongOptions(true);
        }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#1DB954" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const [currentTab, setCurrentTab] = useState<'Home' | 'Search' | 'Library' | 'Admin'>('Search');

  // This function is called when a tab is clicked
  const handleTabChange = (tab: 'Home' | 'Search' | 'Library' | 'Admin') => {
    setCurrentTab(tab);
    // The router.replace is handled inside BottomNavBar onPress
  };

  const handlePlayNow = async (song: PlaylistSong) => {
    try {
      await streamSong({
        title: song.title,
        artist: song.artist,
        image: song.image,
        url: '',
        duration: song.duration,
      });
    } catch (error) {
      // Error handling without debug logging
    }
  };

  const handleAddToQueue = async (song: PlaylistSong) => {
    try {
      if (!ws || !sessionKey) {
        return;
      }

      const songKey = `${song.title}-${song.artist}`;
      setDownloadingSongs(prev => new Set(prev).add(songKey));

      const songMetaData = {
        action: 'stream-song',
        title: song.title,
        artist: song.artist,
        image: song.image,
      };
      
      const messageListener = (data: any) => {
        if (data.success && data.type === 'url' && 
            data.title === song.title && data.artist === song.artist) {
          
          removeMessageListener('stream-song', messageListener);
          
          let serverUrl = '';
          AsyncStorage.getItem('server_url').then(storedUrl => {
            serverUrl = (storedUrl || '').replace(/^wss?:\/\//, '');
            let songUrl = data.url?.replace('URLPATH', `${serverUrl}`) ?? '';
            
            if (songUrl && !songUrl.startsWith('http://') && !songUrl.startsWith('https://')) {
              songUrl = `http://${songUrl}`;
            }

            if (!songUrl) {
              setDownloadingSongs(prev => {
                const newSet = new Set(prev);
                newSet.delete(songKey);
                return newSet;
              });
              return;
            }

            const songWithData = {
              title: data.title ?? song.title,
              artist: data.artist ?? song.artist,
              image: data.image ?? song.image,
              url: songUrl,
              duration: data.duration && typeof data.duration === 'number' && data.duration > 0 
                ? (data.duration < 1000 ? data.duration * 1000 : data.duration)
                : song.duration || 180000,
            };

            setDownloadingSongs(prev => {
              const newSet = new Set(prev);
              newSet.delete(songKey);
              return newSet;
            });

            addToQueue(songWithData);
          });
        } else if (data.error && data.title === song.title && data.artist === song.artist) {
          removeMessageListener('stream-song', messageListener);
          setDownloadingSongs(prev => {
            const newSet = new Set(prev);
            newSet.delete(songKey);
            return newSet;
          });
        }
      };

      addMessageListener('stream-song', messageListener);
      sendEncryptedMessage(songMetaData);

      setTimeout(() => {
        removeMessageListener('stream-song', messageListener);
        setDownloadingSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(songKey);
          return newSet;
        });
      }, 30000);
    } catch (error) {
      // Error handling without debug logging
    }
  };

  const handleAddToPlaylist = (song: PlaylistSong) => {
    // This function is now handled internally by SongOptionsSheet
    // The AddToPlaylistModal will be shown automatically
  };

  const handleShowAddToPlaylistSheet = () => {
    setShowAddToPlaylistSheet(true);
  };

  const handleCloseAddToPlaylistSheet = () => {
    setShowAddToPlaylistSheet(false);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Search</Text>
      </View>

      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="white70" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="What do you want to listen to?"
          placeholderTextColor="white70"
          style={styles.searchInput}
          value={query}
          onChangeText={onChangeSearch}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} size="large" color="#1DB954" />
      ) : songs.length === 0 && query.trim() !== '' ? (
        <View style={styles.noResults}>
          <Text style={{ color: 'white70' }}>No results found</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <QueueBar />

      <SongOptionsSheet
        visible={showSongOptions}
        onClose={() => {
          setShowSongOptions(false);
          // Don't clear selectedSong here - keep it for AddToPlaylistSheet
        }}
        song={selectedSong}
        onPlayNow={handlePlayNow}
        onAddToQueue={handleAddToQueue}
        onAddToPlaylist={handleAddToPlaylist}
        onShowAddToPlaylistModal={handleShowAddToPlaylistSheet}
      />

      <AddToPlaylistSheet
        visible={showAddToPlaylistSheet}
        onClose={() => {
          handleCloseAddToPlaylistSheet();
          setSelectedSong(null); // Clear song only when AddToPlaylistSheet closes
        }}
        song={selectedSong}
      />

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
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#222',
    marginHorizontal: 20,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  songTitle: {
    color: 'white',
    fontSize: 16,
  },
  songArtist: {
    color: 'gray',
    fontSize: 14,
  },
  noResults: {
    marginTop: 40,
    alignItems: 'center',
  },
  addToPlaylistButton: {
    padding: 4,
  },
});
