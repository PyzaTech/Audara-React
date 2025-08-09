import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: screenHeight } = Dimensions.get('window');

type Song = {
  title: string;
  artist: string;
  image: string;
  url: string;
  duration: number;
};

type QueueSheetProps = {
  visible: boolean;
  onClose: () => void;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  onPlaySongAtIndex: (index: number) => void;
};

export default function QueueSheet({
  visible, onClose, queue, currentIndex, isPlaying, onPlaySongAtIndex
}: QueueSheetProps) {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const startY = useRef(0);
  const currentY = useRef(0);



  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleTouchStart = (event: any) => {
    startY.current = event.nativeEvent.pageY;
  };

  const handleTouchMove = (event: any) => {
    currentY.current = event.nativeEvent.pageY;
    const deltaY = currentY.current - startY.current;
    
    // Only apply downward movement (positive deltaY)
    if (deltaY > 0) {
      slideAnim.setValue(deltaY);
    } else {
      // Reset to original position when moving back up
      slideAnim.setValue(0);
    }
  };

  const handleTouchEnd = () => {
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 100) {
      onClose();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePlaySong = (index: number) => {
    onPlaySongAtIndex(index);
  };

  const formatTime = (millis: number) => {
    if (!millis || isNaN(millis) || millis <= 0) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderQueueItem = ({ item, index }: { item: Song; index: number }) => {
    const isCurrentSong = index === currentIndex;

    return (
      <TouchableOpacity
        style={[
          styles.queueItem,
          isCurrentSong && styles.currentSongItem,
        ]}
        onPress={() => handlePlaySong(index)}
        disabled={isCurrentSong}
      >
        <Image source={{ uri: item.image }} style={styles.songThumbnail} />
        <View style={styles.songInfo}>
          <View style={styles.songTextContainer}>
            <Text
              style={[
                styles.songTitle,
                isCurrentSong && styles.currentSongTitle
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.songArtist,
                isCurrentSong && styles.currentSongArtist
              ]}
              numberOfLines={1}
            >
              {item.artist}
            </Text>
          </View>
          <Text style={styles.songDuration}>
            {formatTime(item.duration)}
          </Text>
        </View>

        <View style={styles.songStatus}>
          {isCurrentSong && (
            <View style={styles.currentSongIndicator}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={16}
                color="#1DB954"
              />
              <Text style={styles.currentSongText}>Now Playing</Text>
            </View>
          )}
          {!isCurrentSong && (
            <Text style={styles.queuePositionText}>
              #{index + 1}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <>
      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]}
        onTouchEnd={onClose}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Queue</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#b3b3b3" />
          </TouchableOpacity>
        </View>

        <View style={styles.queueInfo}>
          <Text style={styles.queueCount}>
            {queue.length} {queue.length === 1 ? 'song' : 'songs'} in queue
          </Text>
          {currentIndex < queue.length && (
            <Text style={styles.nowPlayingText}>
              Now playing: {queue[currentIndex]?.title}
            </Text>
          )}
        </View>





        {queue.length > 0 ? (
          <FlatList
            data={queue}
            renderItem={renderQueueItem}
            keyExtractor={(item, index) => `${item.title}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.queueList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No songs in queue</Text>
          </View>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.8,
    zIndex: 1001,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  queueInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  queueCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  nowPlayingText: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  queueList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
  },
  currentSongItem: {
    backgroundColor: '#1DB954',
    borderWidth: 2,
    borderColor: '#1DB954',
  },
  songThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  songTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  currentSongTitle: {
    color: '#000',
  },
  songArtist: {
    fontSize: 14,
    color: '#b3b3b3',
  },
  currentSongArtist: {
    color: '#333',
  },
  songDuration: {
    fontSize: 14,
    color: '#b3b3b3',
    marginLeft: 'auto',
  },
  songStatus: {
    marginLeft: 12,
    alignItems: 'center',
  },
  currentSongIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentSongText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  queuePositionText: {
    fontSize: 12,
    color: '#b3b3b3',
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#b3b3b3',
  },
  errorMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1DB954',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  errorMessageText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorDismissButton: {
    padding: 4,
  },

});
