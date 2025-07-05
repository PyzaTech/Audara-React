import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from './context/AudioPlayerContext';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';

export default function SongDetailScreen() {
  const router = useRouter();
  const {
    currentSong,
    isPlaying,
    playNext,
    playPrevious,
    resumePlayback,
    pausePlayback,
    progress,
    currentPositionMillis,
    durationMillis,
  } = useAudioPlayer();

  if (!currentSong) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white' }}>No song is currently playing.</Text>
      </View>
    );
  }

  const togglePlayPause = async () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <View style={{ width: 28 }} /> {/* Spacer to center title */}
      </View>

      {/* Album Art */}
      {currentSong.image ? (
        <Image source={{ uri: currentSong.image }} style={styles.albumArt} />
      ) : (
        <Ionicons name="musical-notes" size={250} color="white" style={{ marginBottom: 24 }} />
      )}

      {/* Song Info */}
      <Text style={styles.title}>{currentSong.title}</Text>
      <Text style={styles.artist}>{currentSong.artist}</Text>

      {/* Slider */}
      <Slider
        style={{ width: '90%', marginTop: 24 }}
        minimumValue={0}
        maximumValue={1}
        value={progress ?? 0}
        minimumTrackTintColor="#1DB954"
        maximumTrackTintColor="#b3b3b3"
        onSlidingComplete={(value) => {
          // Handle seeking (implement seek logic in your player if needed)
        }}
      />

      {/* Time Display */}
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatMillis(currentPositionMillis)}</Text>
        <Text style={styles.timeText}>{formatMillis(durationMillis)}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={playPrevious}>
          <Ionicons name="play-skip-back" size={48} color="white" />
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayPause}>
          <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={64} color="white" />
        </TouchableOpacity>

        <TouchableOpacity onPress={playNext}>
          <Ionicons name="play-skip-forward" size={48} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatMillis(millis: number) {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  albumArt: {
    width: 300,
    height: 300,
    borderRadius: 8,
    marginBottom: 24,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    color: '#b3b3b3',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 8,
  },
  timeText: {
    color: '#b3b3b3',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 40,
  },
});
