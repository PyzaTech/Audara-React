import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import QueueBar from '../components/QueueBar';
import { useWebSocket } from '../context/WebSocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNavBar from '../components/navbar';
import { DEBUG_MODE } from '../config/debug';
import { logger } from '../utils/_logger';
import { useAdmin } from '../context/AdminContext';
import SongOptionsSheet from '../components/SongOptionsSheet';
import AddToPlaylistSheet from '../components/AddToPlaylistSheet';
import { type PlaylistSong } from '../services/playlistService';

export default function HomeScreen() {
  const [username, setUsername] = useState('User');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [randomPicks, setRandomPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSongOptions, setShowSongOptions] = useState(false);
  const [selectedSong, setSelectedSong] = useState<PlaylistSong | null>(null);
  const [showAddToPlaylistSheet, setShowAddToPlaylistSheet] = useState(false);

  const { streamSong, isPlaying, pausePlayback, resumePlayback, stopPlayback, addToQueue } = useAudioPlayer();
  const { ws, isConnected, sessionKey, sendEncryptedMessage, addMessageListener, removeMessageListener } = useWebSocket();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // New state for dropdown visibility
  const [menuVisible, setMenuVisible] = useState(false);
  const { isAdmin } = useAdmin();

  // New state for downloading songs
  const [downloadingSongs, setDownloadingSongs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!ws || !isConnected) {
      const timer = setTimeout(() => {
        router.push('/screens/LoadingScreen');
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [ws, isConnected]);

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUsername = await AsyncStorage.getItem('username');
      const storedProfilePictureUrl = await AsyncStorage.getItem('profilePictureUrl');

      if (storedUsername) setUsername(storedUsername);
      if (storedProfilePictureUrl) setProfilePictureUrl(storedProfilePictureUrl);
    };

    const fetchRandomPicks = async () => {
      try {
        let serverUrl = (await AsyncStorage.getItem('server_url')) || '';
        serverUrl = serverUrl.replace(/^wss?:\/\//, '');
        const response = await axios.get(`http://${serverUrl}/api/deezer/chart`);
        let tracks = response.data.tracks.data.map((item: any) => ({
          title: item?.title ?? 'Unknown Title',
          artist: item?.artist?.name ?? 'Unknown Artist',
          image: item?.album?.cover_big ?? '',
          duration: item?.duration ?? 0, // Extract duration from Deezer API response
        }));

        tracks = tracks.sort(() => 0.5 - Math.random()).slice(0, 10);
        setRandomPicks(tracks);
      } catch (error) {
        console.error('Error fetching random picks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    fetchRandomPicks();
  }, []);

  const handleLogout = async () => {
    console.log("Logging out...")
    await AsyncStorage.multiRemove(['username', 'profilePictureUrl', 'password', 'isAdmin']);
    stopPlayback();
    router.push('/screens/SelectServer');
  };

  // Toggle menu visibility on avatar press
  const toggleMenu = () => setMenuVisible((prev) => !prev);

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
      if (DEBUG_MODE) logger.error('Error playing song:', error);
    }
  };

  const handleAddToQueue = async (song: PlaylistSong) => {
    try {
      if (DEBUG_MODE) logger.log('Adding song to queue:', song);
      
      if (!ws || !sessionKey) {
        if (DEBUG_MODE) logger.error('WebSocket or session key is missing');
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

      if (DEBUG_MODE) logger.log('Requesting song data for queue:', songMetaData);
      
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
              if (DEBUG_MODE) logger.error('Received invalid song URL');
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

            if (DEBUG_MODE) logger.log('Song data received, adding to queue:', songWithData);
            addToQueue(songWithData);
          });
        } else if (data.error && data.title === song.title && data.artist === song.artist) {
          removeMessageListener('stream-song', messageListener);
          setDownloadingSongs(prev => {
            const newSet = new Set(prev);
            newSet.delete(songKey);
            return newSet;
          });
          if (DEBUG_MODE) logger.error('Error requesting song data:', data.error);
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
        if (DEBUG_MODE) logger.error('Request timeout for song data');
      }, 30000);
    } catch (error) {
      if (DEBUG_MODE) logger.error('Error adding song to queue:', error);
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

  const renderSong = ({ item }: { item: Song }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
      onPress={async () => {
        console.log(`Selected song ${item.title} by ${item.artist}`);
        await streamSong(item);
      }}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={{ width: 50, height: 50, borderRadius: 4, marginRight: 12 }} />
      ) : (
        <Ionicons name="musical-notes" size={50} color="white" style={{ marginRight: 12 }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontSize: 16 }}>{item.title}</Text>
        <Text style={{ color: 'gray', fontSize: 14 }}>{item.artist}</Text>
      </View>
      <TouchableOpacity
        style={{ padding: 4 }}
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

  const recentlyPlayed = [
    { id: '1', title: 'Playlist 1' },
    { id: '2', title: 'Playlist 2' },
    { id: '3', title: 'Playlist 3' },
    { id: '4', title: 'Playlist 4' },
    { id: '5', title: 'Playlist 5' },
    { id: '6', title: 'Playlist 6' },
    { id: '7', title: 'Playlist 7' },
    { id: '8', title: 'Playlist 8' },
    { id: '9', title: 'Playlist 9' },
    { id: '10', title: 'Playlist 10' },
  ];

  const renderRecentlyPlayed = ({ item }: { item: RecentlyPlayedItem }) => (
    <View
      style={{
        width: 100,
        marginRight: 16,
        backgroundColor: '#333',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
      }}
    >
      <Ionicons name="musical-notes" size={40} color="white" />
      <Text style={{ color: 'white', marginTop: 8, textAlign: 'center' }}>{item.title}</Text>
    </View>
  );

  const [currentTab, setCurrentTab] = useState<'Home' | 'Search' | 'Library' | 'Admin'>('Home');

  // This function is called when a tab is clicked
  const handleTabChange = (tab: 'Home' | 'Search' | 'Library' | 'Admin') => {
    setCurrentTab(tab);
    // The router.replace is handled inside BottomNavBar onPress
  };

return (
  <View style={styles.safeArea}>
    <View style={styles.header}>
      <Text style={styles.headerText}>Good Evening {username}</Text>
      <View>
        <TouchableOpacity onPress={toggleMenu}>
          {profilePictureUrl ? (
            <Image source={{ uri: profilePictureUrl }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle" size={32} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </View>

    <FlatList
      data={randomPicks}
      keyExtractor={(item, index) => index.toString()}
      renderItem={renderSong}
      contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
      ListHeaderComponent={
        <>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <FlatList
            data={recentlyPlayed}
            keyExtractor={(item) => item.id}
            renderItem={renderRecentlyPlayed}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          />
          <Text style={styles.sectionTitle}>Random Picks</Text>
        </>
      }
    />

    {/* Render dropdown last so it's on top */}
    {menuVisible && (
      <View style={styles.dropdownMenu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setMenuVisible(false);
            console.log('View Profile tapped');
          }}
        >
          <Text style={styles.menuText}>View Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            setMenuVisible(false);
            console.log('Settings tapped');
          }}
        >
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              router.push('/screens/Admin');
            }}
          >
            <Text style={[styles.menuText, { color: '#1DB954' }]}>Admin Dashboard</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={async () => {
            console.log('Logout tapped');
            setMenuVisible(false);
            await handleLogout();
          }}
        >
          <Text style={[styles.menuText, { color: 'red' }]}>Logout</Text>
        </TouchableOpacity>
      </View>
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
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 8,
    width: 160,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20, // increase this
    zIndex: 9999,  // increase this
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    color: 'white',
    fontSize: 16,
  },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10, paddingHorizontal: 20 },
});
  
type Song = {
  id: string;
  title: string;
  artist: string;
  image: string;
  url: string;
  duration: number;
};

type RecentlyPlayedItem = {
  id: string;
  title: string;
};
