import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../context/AudioPlayerContext';

function formatMillis(millis: number) {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function QueueBar() {
  const {
    currentSong,
    isPlaying,
    playNext,
    playPrevious,
    queue,
    resumePlayback,
    pausePlayback,
    progress,
    currentPositionMillis,
    durationMillis,
  } = useAudioPlayer();

  if (!queue.length || !currentSong?.title) return null;

  const togglePlayPause = async () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {currentSong.image ? (
          <Image source={{ uri: currentSong.image }} style={styles.albumArt} />
        ) : (
          <Ionicons name="musical-notes" size={48} color="white" style={{ marginRight: 12 }} />
        )}

        <View style={styles.songInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={28} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayPause} style={[styles.controlButton, styles.playPauseButton]}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={playNext} style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Time display */}
      <View style={styles.progressTimeContainer}>
        <Text style={styles.timeText}>{formatMillis(currentPositionMillis)}</Text>
        <Text style={styles.timeText}>{formatMillis(durationMillis)}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${(progress ?? 0) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    borderTopColor: '#282828',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  artist: {
    color: '#b3b3b3',
    fontSize: 13,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  controlButton: {
    marginHorizontal: 8,
  },
  playPauseButton: {
    marginHorizontal: 12,
  },
  progressTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#b3b3b3',
    fontSize: 12,
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: '#282828',
    borderRadius: 1,
    marginTop: 4,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 1,
    width: '0%',
  },
});
