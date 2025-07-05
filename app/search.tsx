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
import { useAudioPlayer } from './context/AudioPlayerContext';
import QueueBar from './components/QueueBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navbar from './components/navbar';
import BottomNavBar from './components/navbar';

type Song = {
  title: string;
  artist: string;
  image: string;
  url: string;
};

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const { streamSong } = useAudioPlayer();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const searchSongs = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSongs([]);
      return;
    }
    setLoading(true);
    try {
      let serverUrl = (await AsyncStorage.getItem('server_url')) || '';
        serverUrl = serverUrl.replace(/^wss?:\/\//, '');
        const response = await axios.get(`http://${serverUrl}/api/deezer/search?q=${query}`);
      const results = (response.data.data ?? []).map((item: any) => ({
        title: item.title || 'Unknown Title',
        artist: item.artist?.name || 'Unknown Artist',
        image: item.album?.cover_big || '',
        url: item.preview || '', // Deezer provides 30s preview URL, optional
      }));
      setSongs(results);
    } catch (error) {
      console.error('Search error:', error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeSearch = (text: string) => {
    setQuery(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(
      setTimeout(() => {
        searchSongs(text);
      }, 300)
    );
  };

  const renderItem = ({ item }: { item: Song }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={async () => {
        console.log(`Selected song ${item.title} by ${item.artist}`);
        await streamSong(item);
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
      <Ionicons name="ellipsis-vertical" size={20} color="white" />
    </TouchableOpacity>
  );

const [currentTab, setCurrentTab] = useState<'home' | 'search' | 'library'>('search');

  // This function is called when a tab is clicked
  const handleTabChange = (tab: 'home' | 'search' | 'library') => {
    setCurrentTab(tab);
    // The router.replace is handled inside BottomNavBar onPress
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

      <BottomNavBar currentTab={currentTab} onTabChange={handleTabChange} />
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
});
