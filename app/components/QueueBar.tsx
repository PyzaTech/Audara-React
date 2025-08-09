import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import Slider from '@react-native-community/slider';
import { Easing } from 'react-native';
import VolumeControl from './volume_control';


function formatMillis(millis: number) {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function QueueBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  
  const {
    currentSong,
    isPlaying,
    playNext,
    playPrevious,
    pausePlayback,
    resumePlayback,
    progress,
    currentPositionMillis,
    durationMillis,
    isCurrentSongDownloading,
    queue,
    currentIndex,
  } = useAudioPlayer();

  // Calculate the bottom position based on navbar height and safe area
  const navbarBaseHeight = 70; // Base height of the navbar
  const navbarPaddingBottom = Math.max(insets.bottom, 12); // Same as navbar
  const navbarTotalHeight = navbarBaseHeight + navbarPaddingBottom;
  const queueBarBottom = navbarTotalHeight + 1; // +1 for the border

  const downloadAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCurrentSongDownloading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(downloadAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(downloadAnimation, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      downloadAnimation.setValue(0);
    }
  }, [isCurrentSongDownloading, downloadAnimation]);

  if (!queue.length || !currentSong?.title) return null;

const togglePlayPause = async () => {
  if (isCurrentSongDownloading) {
    return;
  }

  try {
    if (isPlaying) {
      await pausePlayback();
    } else {
      await resumePlayback();
    }
  } catch (error) {
    console.error('Error toggling play/pause:', error);
  }
};


  const handleBarPress = () => {
    router.push('/screens/SongDetail');
  };

  return (
    <View style={[styles.container, { bottom: queueBarBottom }]}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.songSection} activeOpacity={0.7} onPress={handleBarPress}>
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
            {isCurrentSongDownloading && (
              <Animated.View style={[styles.downloadingContainer, { opacity: downloadAnimation }]}>
                <Ionicons name="cloud-download" size={12} color="#1DB954" />
                <Text style={styles.downloadingText}>Downloading...</Text>
              </Animated.View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={28} color="white" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={togglePlayPause} 
            style={[
              styles.controlButton, 
              styles.playPauseButton,
              isCurrentSongDownloading && styles.disabledButton
            ]}
            disabled={isCurrentSongDownloading}
          >
            <Ionicons 
              name={isPlaying ? 'pause' : 'play'} 
              size={36} 
              color={isCurrentSongDownloading ? '#666' : 'white'} 
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={playNext} style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {!isCurrentSongDownloading && (
        <>
          <View style={styles.progressTimeContainer}>
            <Text style={styles.timeText}>{formatMillis(currentPositionMillis)}</Text>
            <Text style={styles.timeText}>{formatMillis(durationMillis)}</Text>
          </View>

          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${(progress ?? 0) * 100}%` }]} />
          </View>
        </>
      )}
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
    left: 0,
    right: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  songSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
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
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  downloadingText: {
    color: '#1DB954',
    fontSize: 12,
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
