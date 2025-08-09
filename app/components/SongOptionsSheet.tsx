import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type PlaylistSong } from '../services/playlistService';

const { height: screenHeight } = Dimensions.get('window');

type SongOptionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  song: PlaylistSong | null;
  onPlayNow: (song: PlaylistSong) => void;
  onAddToQueue: (song: PlaylistSong) => void;
  onAddToPlaylist: (song: PlaylistSong) => void;
  onShowAddToPlaylistModal: () => void;
};

export default function SongOptionsSheet({ 
  visible, 
  onClose, 
  song, 
  onPlayNow, 
  onAddToQueue, 
  onAddToPlaylist,
  onShowAddToPlaylistModal
}: SongOptionsSheetProps) {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide up animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handlePlayNow = () => {
    if (song) {
      onPlayNow(song);
    }
    onClose();
  };

  const handleAddToQueue = () => {
    if (song) {
      onAddToQueue(song);
    }
    onClose();
  };

  const handleAddToPlaylist = () => {
    if (song) {
      onClose();
      onShowAddToPlaylistModal();
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Overlay */}
      <Animated.View 
        style={[
          styles.overlay, 
          { opacity: overlayOpacity }
        ]} 
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View 
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle}>
          <View style={styles.handleBar} />
        </View>

        {/* Song Info */}
        {song && (
          <View style={styles.songInfo}>
            <View style={styles.songImageContainer}>
              {song.image ? (
                <Image source={{ uri: song.image }} style={styles.songImage} />
              ) : (
                <Ionicons name="musical-notes" size={32} color="white" />
              )}
            </View>
            <View style={styles.songTextInfo}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {song.title}
              </Text>
              <Text style={styles.songArtist} numberOfLines={1}>
                {song.artist}
              </Text>
            </View>
          </View>
        )}

        {/* Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.option} onPress={handlePlayNow}>
            <View style={styles.optionIcon}>
              <Ionicons name="play" size={20} color="white" />
            </View>
            <Text style={styles.optionText}>Play Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleAddToQueue}>
            <View style={styles.optionIcon}>
              <Ionicons name="add-circle" size={20} color="white" />
            </View>
            <Text style={styles.optionText}>Add To Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleAddToPlaylist}>
            <View style={styles.optionIcon}>
              <Ionicons name="list" size={20} color="white" />
            </View>
            <Text style={styles.optionText}>Add To Playlist</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#282828',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 36,
    height: 3,
    backgroundColor: '#666',
    borderRadius: 2,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  songImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  songImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  songTextInfo: {
    flex: 1,
  },
  songTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtist: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  optionsContainer: {
    paddingTop: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
