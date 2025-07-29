import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  const {
    currentSong,
    isPlaying,
    queue,
    currentIndex,
    progress,
    currentPositionMillis,
    durationMillis,
    debugAudioState,
    isLoadingAudio,
  } = useAudioPlayer();

  const updateDebugInfo = async () => {
    const info = {
      currentSong: currentSong ? `${currentSong.title} - ${currentSong.artist}` : 'None',
      isPlaying,
      isLoadingAudio,
      queueLength: queue.length,
      currentIndex,
      progress: progress ? `${(progress * 100).toFixed(1)}%` : '0%',
      position: `${Math.floor(currentPositionMillis / 1000)}s / ${Math.floor(durationMillis / 1000)}s`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setDebugInfo(info);
  };

  useEffect(() => {
    if (isVisible) {
      updateDebugInfo();
      const interval = setInterval(updateDebugInfo, 1000);
      return () => clearInterval(interval);
    }
  }, [isVisible, currentSong, isPlaying, queue, currentIndex, progress]);

  if (!isVisible) {
    return (
      <TouchableOpacity
        style={styles.debugButton}
        onPress={() => setIsVisible(true)}
      >
        <Ionicons name="bug" size={24} color="yellow" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Panel</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <TouchableOpacity style={styles.refreshButton} onPress={updateDebugInfo}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
        
        {Object.entries(debugInfo).map(([key, value]) => (
          <View key={key} style={styles.infoRow}>
            <Text style={styles.label}>{key}:</Text>
            <Text style={styles.value}>{String(value)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    width: 300,
    maxHeight: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 10,
  },
  refreshButton: {
    backgroundColor: '#1DB954',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    alignItems: 'center',
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  label: {
    color: '#ccc',
    fontSize: 12,
    flex: 1,
  },
  value: {
    color: 'white',
    fontSize: 12,
    flex: 2,
    textAlign: 'right',
  },
  debugButton: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 20,
    zIndex: 1000,
  },
});