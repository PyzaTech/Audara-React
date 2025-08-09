import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import QueueSheet from '../components/QueueSheet';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
    queue,
    currentIndex,
    setCurrentIndex,
    playSongAtIndex,
    seekToMillis,
    volume,
    setVolume,
    startPlayback,
  } = useAudioPlayer();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showQueueSheet, setShowQueueSheet] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const togglePlayPause = async () => {
    if (isPlaying) {
      await pausePlayback();
    } else {
      await resumePlayback();
    }
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const formatTime = (millis: number) => {
    if (!millis || isNaN(millis) || millis <= 0) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number) => {
    if (durationMillis && isFinite(durationMillis)) {
      const newPosition = Math.floor(value * durationMillis);
      seekToMillis(newPosition);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
  };

  // If no song is playing and no queue, show empty state
  if (!currentSong && queue.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-down" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes" size={80} color="#666" />
          <Text style={styles.emptyTitle}>No music playing</Text>
          <Text style={styles.emptySubtitle}>Start playing a song to see it here</Text>
        </View>
      </View>
    );
  }

  // If there are songs in queue but no current song, show queue state
  if (!currentSong && queue.length > 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-down" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes" size={80} color="#666" />
          <Text style={styles.emptyTitle}>Songs in queue</Text>
          <Text style={styles.emptySubtitle}>
            {queue.length} song{queue.length > 1 ? 's' : ''} ready to play
          </Text>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startPlayback}
          >
            <Text style={styles.startButtonText}>Start Playing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Use current song or first song in queue as fallback
  const displaySong = currentSong || (queue.length > 0 ? queue[0] : null);

  // Debug logging for duration and position
  console.log('SongDetail - Duration debug:', {
    currentPositionMillis,
    durationMillis,
    currentSong: currentSong?.title,
    currentSongDuration: currentSong?.duration,
    formattedPosition: formatTime(currentPositionMillis),
    formattedDuration: formatTime(durationMillis)
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-down" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displaySong?.title || 'Now Playing'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {displaySong?.artist || 'Unknown Artist'}
          </Text>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="white" />
        </TouchableOpacity>
      </View>

             <ScrollView 
         style={styles.content}
         showsVerticalScrollIndicator={false}
         contentContainerStyle={styles.contentContainer}
       >
        <Animated.View 
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            {displaySong?.image ? (
              <Image source={{ uri: displaySong.image }} style={styles.albumArt} />
            ) : (
              <View style={styles.albumArtPlaceholder}>
                <Ionicons name="musical-notes" size={60} color="#666" />
              </View>
            )}
          </View>

          {/* Song Info */}
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={2}>
              {displaySong?.title || 'Unknown Title'}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {displaySong?.artist || 'Unknown Artist'}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Slider
              style={styles.progressSlider}
              minimumValue={0}
              maximumValue={1}
              value={progress || 0}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor="#1DB954"
              maximumTrackTintColor="#535353"
            />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentPositionMillis)}</Text>
              <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
            </View>
          </View>

          {/* Main Controls */}
          <View style={styles.mainControls}>
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="shuffle" size={24} color={isShuffled ? "#1DB954" : "white"} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={32} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
              <Ionicons 
                name={isPlaying ? 'pause' : 'play'} 
                size={40} 
                color="black" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={playNext} style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={32} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={toggleRepeat} style={styles.controlButton}>
              <Ionicons 
                name={repeatMode === 'one' ? 'repeat' : 'repeat'} 
                size={24} 
                color={repeatMode !== 'off' ? "#1DB954" : "white"} 
              />
            </TouchableOpacity>
          </View>

          {/* Secondary Controls */}
          <View style={styles.secondaryControls}>
            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="heart-outline" size={24} color={isLiked ? "#1DB954" : "white"} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="download-outline" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => setShowVolumeSlider(!showVolumeSlider)}
            >
              <Ionicons name="volume-high" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Volume Slider */}
          {showVolumeSlider && (
            <View style={styles.volumeContainer}>
              <Ionicons name="volume-low" size={16} color="#b3b3b3" />
              <Slider
                style={styles.volumeSlider}
                minimumValue={0}
                maximumValue={1}
                value={volume}
                onValueChange={handleVolumeChange}
                minimumTrackTintColor="#1DB954"
                maximumTrackTintColor="#535353"
              />
              <Ionicons name="volume-high" size={16} color="#b3b3b3" />
            </View>
          )}

          {/* Queue Info */}
          {queue.length > 0 && (
            <TouchableOpacity 
              style={styles.queueInfo}
              onPress={() => setShowQueueSheet(true)}
            >
              <View style={styles.queueInfoContent}>
                <View style={styles.queueTextContainer}>
                  <Text style={styles.queueText}>
                    {queue.length === 1 ? '1 song in queue' : `${queue.length} songs in queue`}
                  </Text>
                  {currentIndex < queue.length - 1 && (
                    <Text style={styles.upcomingText}>
                      Next: {queue[currentIndex + 1]?.title}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-up" size={16} color="#b3b3b3" />
              </View>
            </TouchableOpacity>
          )}
                 </Animated.View>
       </ScrollView>

      {/* Queue Sheet */}
      <QueueSheet
        visible={showQueueSheet}
        onClose={() => setShowQueueSheet(false)}
        queue={queue}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        onPlaySongAtIndex={playSongAtIndex}
      />
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
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  mainContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  albumArtContainer: {
    marginTop: 0,
    marginBottom: 0,
  },
  albumArt: {
    width: screenWidth - 80,
    height: screenWidth - 80,
    borderRadius: 8,
  },
  albumArtPlaceholder: {
    width: screenWidth - 80,
    height: screenWidth - 80,
    borderRadius: 8,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songInfo: {
    alignItems: 'center',
    marginBottom: 0,
    width: '100%',
  },
  songTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  songArtist: {
    color: '#b3b3b3',
    fontSize: 18,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 0,
  },
  progressSlider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#1DB954',
    width: 12,
    height: 12,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#b3b3b3',
    fontSize: 12,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 0,
    paddingHorizontal: 20,
  },
  controlButton: {
    padding: 12,
  },
  playPauseButton: {
    backgroundColor: '#1DB954',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1DB954',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 0,
  },
  secondaryButton: {
    padding: 12,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 16,
    height: 40,
  },
  volumeThumb: {
    backgroundColor: '#1DB954',
    width: 12,
    height: 12,
  },
  queueInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#282828',
    width: '100%',
  },
  queueInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  queueText: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  upcomingText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#b3b3b3',
    fontSize: 16,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
