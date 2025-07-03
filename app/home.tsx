import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useAudioPlayer } from './context/AudioPlayerContext';
import QueueBar from './components/QueueBar';
import { useWebSocket } from './context/WebSocketContext';


export default function HomeScreen() {
  const [username, setUsername] = useState('User');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [randomPicks, setRandomPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { streamSong, isPlaying, queue, currentSong, playNext, playPrevious, pausePlayback, resumePlayback } = useAudioPlayer();

  const { ws, isConnected } = useWebSocket();
  const router = useRouter();

  useEffect(() => {
    if (!ws || !isConnected) {
      // Delay navigation to let navigator mount
      const timer = setTimeout(() => {
        router.replace('/loading_screen');
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
    await AsyncStorage.multiRemove(['username', 'profilePictureUrl', 'password']);
    router.replace('/select_server');
  };

  const handleMenuPress = () => {
    Alert.alert('Options', 'Select an option', [
      { text: 'View Profile', onPress: () => console.log('View Profile tapped') },
      { text: 'Settings', onPress: () => console.log('Settings tapped') },
      { text: 'Logout', onPress: handleLogout },
    ]);
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

  const togglePlayPause = async () => {
    if (isPlaying) {
      await pausePlayback();
    } else {
      await resumePlayback();
    }
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Good Evening {username}</Text>
        <TouchableOpacity onPress={handleMenuPress}>
          {profilePictureUrl ? (
            <Image source={{ uri: profilePictureUrl }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle" size={32} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={randomPicks}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderSong}
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

      <QueueBar>

      </QueueBar>

      <View style={styles.navbar}>
        <NavButton iconName="home" label="Home" onPress={() => {}} />
        <NavButton iconName="search" label="Search" onPress={() => router.replace('/search')} />
        <NavButton iconName="library" label="Library" onPress={() => {}} />
      </View>
    </View>
  );
}

type NavButtonProps = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
};

const NavButton = ({ iconName, label, onPress }: NavButtonProps) => (
  <TouchableOpacity style={styles.navButton} onPress={onPress}>
    <Ionicons name={iconName} size={24} color="white" />
    <Text style={styles.navLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10, paddingHorizontal: 20 },
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#282828',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopColor: '#333',
    borderTopWidth: 1,
  },
  navButton: { alignItems: 'center' },
  navLabel: { color: 'white', fontSize: 12, marginTop: 4 },
  queueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 10,
    borderTopColor: '#555',
    borderTopWidth: 1,
  },
  queueButton: { marginRight: 15 },
  queueInfo: { flex: 1 },
  queueTitle: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  queueArtist: { color: 'gray', fontSize: 12 },
});

type Song = {
  title: string;
  artist: string;
  image: string;
  url: string;
};

type RecentlyPlayedItem = {
  id: string;
  title: string;
};
