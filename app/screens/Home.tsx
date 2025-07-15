import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import useAudioPlayer from '../hooks/useAudioPlayer';
import QueueBar from '../components/QueueBar';
import { useWebSocket } from '../context/WebSocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNavBar from '../components/navbar';

export default function HomeScreen() {
  const [username, setUsername] = useState('User');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [randomPicks, setRandomPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  const { streamSong, isPlaying, pausePlayback, resumePlayback, stopPlayback } = useAudioPlayer();
  const { ws, isConnected } = useWebSocket();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // New state for dropdown visibility
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (!ws || !isConnected) {
      const timer = setTimeout(() => {
        router.replace('/screens/LoadingScreen');
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
    await AsyncStorage.multiRemove(['username', 'profilePictureUrl', 'password']);
    stopPlayback();
    router.replace('/screens/SelectServer');
  };

  // Toggle menu visibility on avatar press
  const toggleMenu = () => setMenuVisible((prev) => !prev);

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
      <Ionicons name="ellipsis-vertical" size={20} color="white" />
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

  const [currentTab, setCurrentTab] = useState<'Home' | 'Search' | 'Library'>('Home');

  // This function is called when a tab is clicked
  const handleTabChange = (tab: 'Home' | 'Search' | 'Library') => {
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
    <BottomNavBar currentTab={currentTab} onTabChange={handleTabChange} />
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
