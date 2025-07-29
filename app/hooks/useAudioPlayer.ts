import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useWebSocket } from '../context/WebSocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Global audio instance tracking
let globalAudioInstance: Audio.Sound | null = null;

type Song = {
  title: string;
  artist: string;
  image: string;
  url: string;
  duration: number;
};

export default function usePlayQueue() {
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [loopCurrent, setLoopCurrent] = useState(false);
  const [loopQueue, setLoopQueue] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPositionMillis, setCurrentPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [downloadingSongs, setDownloadingSongs] = useState<Set<string>>(new Set());
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const sound = useRef<Audio.Sound | null>(null);
  const { ws, sessionKey, sendEncryptedMessage, addMessageListener, removeMessageListener } = useWebSocket();
  const [volume, setVolumeState] = useState(1.0);


  useEffect(() => {
    async function configureAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          interruptionModeIOS: 1,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('Audio mode set successfully');
      } catch (error) {
        console.error('Failed to set audio mode:', error);
      }
    }
    configureAudio();
  }, []);

  const playSongAtIndex = useCallback(
    async (index: number) => {
      console.log('=== PLAY SONG AT INDEX CALLED ===');
      console.log('Index:', index);
      console.log('Queue length:', queue.length);
      console.log('Is loading audio:', isLoadingAudio);
      console.log('Current index:', currentIndex);
      console.log('Is playing:', isPlaying);
      
      if (isLoadingAudio) {
        console.log('Already loading audio, skipping this call');
        return;
      }

      if (index < 0 || index >= queue.length) {
        console.log('Invalid index or queue empty, cannot play');
        return;
      }

      setIsLoadingAudio(true);
      console.log('Set isLoadingAudio to true');

      try {
        // Clean up global audio instance
        if (globalAudioInstance) {
          console.log('Cleaning up global audio instance');
          try {
            await globalAudioInstance.stopAsync();
            await globalAudioInstance.unloadAsync();
          } catch (error) {
            console.log('Error cleaning up global audio instance:', error);
          }
          globalAudioInstance = null;
        }

        // Clean up local sound reference
        if (sound.current) {
          console.log('Unloading previous sound');
          try {
            await sound.current.stopAsync();
            await sound.current.unloadAsync();
          } catch (error) {
            console.log('Error cleaning up previous sound:', error);
          }
          sound.current = null;
        }

        const song = queue[index];
        console.log('Playing song:', song.title, 'by', song.artist);
        console.log('Song URL:', song.url);
        
        const newSound = new Audio.Sound();

        console.log('Loading sound from URL:', song.url);
        const status = await newSound.loadAsync(
          { uri: song.url },
          { shouldPlay: false, isLooping: loopCurrent },
          false
        );

        console.log('Load status:', status);

        if (!status.isLoaded) {
          console.error('Failed to load sound:', song.url);
          setIsLoadingAudio(false);
          return;
        }

        console.log('Sound loaded successfully, setting up playback');
        
        await newSound.setVolumeAsync(1.0);
        console.log('Volume set to 1.0');
        
        await newSound.playAsync();
        console.log('PlayAsync called successfully');
        
        console.log('Playback started, setting up status callback');
        
        // Set both global and local references
        globalAudioInstance = newSound;
        sound.current = newSound;
        setCurrentIndex(index);
        setIsPlaying(true);
        
        console.log('State updated - currentIndex:', index, 'isPlaying: true');

        newSound.setOnPlaybackStatusUpdate(async (status) => {
          if (!status.isLoaded) {
            console.log('Status update: Sound not loaded');
            return;
          }

          console.log('Playback status update:', {
            isPlaying: status.isPlaying,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis,
            didJustFinish: status.didJustFinish
          });

          // Update playing state
          setIsPlaying(status.isPlaying);

          // Update position
          if (typeof status.positionMillis === 'number' && status.positionMillis >= 0) {
            setCurrentPositionMillis(status.positionMillis);
          }

          // Update duration - use status.durationMillis if available, fallback to song.duration
          if (typeof status.durationMillis === 'number' && status.durationMillis > 0) {
            setDurationMillis(status.durationMillis);
          } else if (song.duration && song.duration > 0) {
            setDurationMillis(song.duration);
          }

          // Update progress
          if (
            typeof status.positionMillis === 'number' &&
            typeof status.durationMillis === 'number' &&
            status.durationMillis > 0
          ) {
            setProgress(status.positionMillis / status.durationMillis);
          } else if (
            typeof status.positionMillis === 'number' &&
            song.duration &&
            song.duration > 0
          ) {
            setProgress(status.positionMillis / song.duration);
          } else {
            setProgress(0);
          }

          // Handle song completion
          if (status.didJustFinish) {
            console.log('Song finished, handling next song logic');
            
            // Get current queue state to avoid stale closure issues
            setQueue((currentQueue) => {
              console.log('Current queue in completion handler:', currentQueue.length);
              
              if (loopCurrent) {
                playSongAtIndex(index);
              } else if (index < currentQueue.length - 1) {
                playSongAtIndex(index + 1);
              } else if (loopQueue && currentQueue.length > 0) {
                playSongAtIndex(0);
              } else {
                // No more songs, stop playback and clear queue
                stopPlayback();
                setCurrentIndex(-1);
                setProgress(0);
                setCurrentPositionMillis(0);
                setDurationMillis(0);
                return []; // Clear the queue
              }
              
              return currentQueue; // Keep the queue as is
            });
          }
        });
        
        console.log('PlaySongAtIndex completed successfully');
      } catch (error) {
        console.error('Error playing song:', error);
        // Ensure isLoadingAudio is reset even on error
        setIsLoadingAudio(false);
      } finally {
        setIsLoadingAudio(false);
      }
    },
    [queue, loopCurrent, loopQueue, isLoadingAudio]
  );

  const setVolume = async (newVolume: number) => {
  if (sound.current) {
    await sound.current.setVolumeAsync(newVolume);
  }
  setVolumeState(newVolume);
};


  const stopPlayback = async () => {
    console.log('=== STOP PLAYBACK CALLED ===');
    try {
      // Clean up global audio instance
      if (globalAudioInstance) {
        console.log('Stopping and unloading global audio instance');
        try {
          await globalAudioInstance.stopAsync();
          await globalAudioInstance.unloadAsync();
        } catch (error) {
          console.log('Error during global stop/unload:', error);
        }
        globalAudioInstance = null;
      }

      // Clean up local sound reference
      if (sound.current) {
        console.log('Stopping and unloading local sound');
        try {
          await sound.current.stopAsync();
          await sound.current.unloadAsync();
        } catch (error) {
          console.log('Error during local stop/unload:', error);
        }
        sound.current = null;
      }
      
      setIsPlaying(false);
      setProgress(0);
      setCurrentPositionMillis(0);
      setDurationMillis(0);
      console.log('Playback stopped successfully');
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  const playNext = useCallback(async () => {
    if (currentIndex < queue.length - 1) {
      await playSongAtIndex(currentIndex + 1);
    } else if (loopQueue && queue.length > 0) {
      await playSongAtIndex(0);
    }
  }, [currentIndex, queue.length, loopQueue, playSongAtIndex]);

  const playPrevious = useCallback(async () => {
    if (currentIndex > 0) {
      await playSongAtIndex(currentIndex - 1);
    } else if (loopQueue && queue.length > 0) {
      await playSongAtIndex(queue.length - 1);
    }
  }, [currentIndex, queue.length, loopQueue, playSongAtIndex]);

    const addToQueue = (song: Song) => {
    setQueue((prevQueue) => {
        // Find if the song already exists in the queue (by title & artist)
        const existingIndex = prevQueue.findIndex(
        (s) => s.title === song.title && s.artist === song.artist
        );

        // If the song is already last in queue, no need to change
        if (existingIndex === prevQueue.length - 1) {
        return prevQueue;
        }

        let newQueue;

        if (existingIndex !== -1) {
        // Song exists, remove from old position and push to end
        newQueue = prevQueue.filter((_, idx) => idx !== existingIndex);
        newQueue.push(song);
        } else {
        // Song not in queue, just add
        newQueue = [...prevQueue, song];
        }

        // Only start playing if nothing is currently playing
        if (prevQueue.length === 0 && currentIndex === -1 && !isPlaying) {
        console.log('No song currently playing, starting playback of first song');
        setTimeout(() => playSongAtIndex(0), 0);
        } else {
        console.log('Song added to queue while another song is playing, not interfering with current playback');
        }

        return newQueue;
    });
    };


  const clearQueue = async () => {
    await stopPlayback();
    setQueue([]);
    setCurrentIndex(-1);
  };

  const toggleLoop = () => {
    if (loopCurrent) {
      setLoopCurrent(false);
      setLoopQueue(true);
    } else if (loopQueue) {
      setLoopQueue(false);
    } else {
      setLoopCurrent(true);
    }
  };

  const isSoundValid = () => {
    return sound.current !== null;
  };

  const getSoundStatus = async () => {
    if (sound.current) {
      try {
        const status = await sound.current.getStatusAsync();
        console.log('Current sound status:', status);
        return status;
      } catch (error) {
        console.error('Error getting sound status:', error);
        return null;
      }
    }
    return null;
  };

  const pausePlayback = async () => {
    try {
      console.log('=== PAUSE PLAYBACK CALLED ===');
      console.log('Sound object exists:', !!sound.current);
      console.log('Current isPlaying state:', isPlaying);
      
      if (!sound.current) {
        console.log('No sound object available to pause');
        return;
      }

      const status = await sound.current.getStatusAsync();
      console.log('Current sound status:', status);
      
      if (status.isLoaded) {
        console.log('Pausing sound...');
        await sound.current.pauseAsync();
        console.log('Sound paused successfully');
        
        // Manually update state to ensure UI reflects the change
        setIsPlaying(false);
        console.log('isPlaying state set to false');
      } else {
        console.log('Sound not loaded, cannot pause');
      }
    } catch (error) {
      console.error('Error pausing playback:', error);
    }
  };

  const resumePlayback = async () => {
    try {
      console.log('=== RESUME PLAYBACK CALLED ===');
      console.log('Sound object exists:', !!sound.current);
      console.log('Current isPlaying state:', isPlaying);
      
      if (!sound.current) {
        console.log('No sound object available to resume');
        return;
      }

      const status = await sound.current.getStatusAsync();
      console.log('Current sound status:', status);
      
      if (status.isLoaded) {
        console.log('Resuming sound...');
        await sound.current.playAsync();
        console.log('Sound resumed successfully');
        
        // Manually update state to ensure UI reflects the change
        setIsPlaying(true);
        console.log('isPlaying state set to true');
      } else {
        console.log('Sound not loaded, cannot resume');
      }
    } catch (error) {
      console.error('Error resuming playback:', error);
    }
  };

  const seekToMillis = async (millis: number) => {
    if (sound.current && millis >= 0) {
      try {
        const status = await sound.current.getStatusAsync();
        console.log('Current sound status:', status);
        console.log('Seeking to:', millis, 'Current status:', status);

        // Type guard: Check if the status indicates a loaded sound
        if (status.isLoaded) {
          // Now TypeScript knows 'status' is of type AVPlaybackStatusSuccess
          // and 'durationMillis' will be accessible.
          if (status.durationMillis != null && millis <= status.durationMillis) {
            await sound.current.setPositionAsync(millis);
            console.log('Seek successful to:', millis);
          } else {
            console.warn('Seek position is out of bounds or durationMillis is null/undefined.');
          }
        } else {
          console.warn('Sound is not loaded, cannot seek.');
        }
      } catch (error) {
        console.error('Failed to seek:', error);
      }
    }
  };


  // Listen for "stream-song" responses from server and play immediately
  useEffect(() => {
    if (!ws || !sessionKey) return;

    const handleStreamSong = async (data: any) => {
      if (data.success && data.type === 'url') {
        let serverUrl = (await AsyncStorage.getItem('server_url')) || '';
        serverUrl = serverUrl.replace(/^wss?:\/\//, '');
        const songUrl = data.url?.replace('URLPATH', `${serverUrl}`) ?? '';

        if (!songUrl) {
          console.error('Received invalid song URL');
          return;
        }

        const songToPlay: Song = {
          title: data.title ?? '',
          artist: data.artist ?? '',
          image: data.image ?? '',
          url: songUrl,
          duration: data.duration && typeof data.duration === 'number' && data.duration > 0 
            ? data.duration 
            : 180000, // Default 3 minutes if no duration provided
        };

        console.log('Received song data from server:', {
          title: data.title,
          artist: data.artist,
          duration: data.duration,
          durationType: typeof data.duration,
          url: songUrl
        });

        const songKey = `${songToPlay.title}-${songToPlay.artist}`;
        setDownloadingSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(songKey);
          return newSet;
        });

        console.log('Adding song to queue:', songToPlay);

        setQueue((prevQueue) => {
          const newQueue = [...prevQueue, songToPlay];
          console.log('New queue length:', newQueue.length);
          
          // Only set currentIndex to 0 and start playback if nothing is currently playing
          if (prevQueue.length === 0 && currentIndex === -1 && !isPlaying) {
            console.log('First song in queue and nothing playing, setting currentIndex to 0 and starting playback');
            setCurrentIndex(0);
            // Start playback after a short delay to ensure state is updated
            setTimeout(() => {
              playSongAtIndex(0);
            }, 100);
          } else {
            console.log('Song added to queue while another song is playing, not changing currentIndex');
          }
          
          return newQueue;
        });
      } else if (data.error) {
        console.error('Stream song error:', data.error);
        const songKey = `${data.title}-${data.artist}`;
        setDownloadingSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(songKey);
          return newSet;
        });
      }
    };

    addMessageListener('stream-song', handleStreamSong);

    return () => {
      removeMessageListener('stream-song', handleStreamSong);
    };
  }, [ws, sessionKey, addMessageListener, removeMessageListener, playSongAtIndex]);

  const streamSong = (song: Song) => {
    if (!ws || !sessionKey) {
      console.warn('WebSocket or session key is missing');
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

    console.log('Sending stream request:', songMetaData);
    sendEncryptedMessage(songMetaData);

    setTimeout(() => {
      setDownloadingSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(songKey);
        return newSet;
      });
    }, 30000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('=== CLEANUP EFFECT RUNNING ===');
      if (sound.current) {
        console.log('Cleaning up sound on unmount');
        sound.current.unloadAsync().catch(error => {
          console.log('Error during cleanup:', error);
        });
        sound.current = null;
      }
    };
  }, []);

  // Additional cleanup effect for when queue changes
  useEffect(() => {
    return () => {
      if (sound.current) {
        console.log('Cleaning up sound due to queue change');
        sound.current.unloadAsync().catch(error => {
          console.log('Error during queue cleanup:', error);
        });
        sound.current = null;
      }
    };
  }, [queue]);

  useEffect(() => {
    console.log('Queue/currentIndex effect triggered:', { queueLength: queue.length, currentIndex });
    if (queue.length > 0 && currentIndex === -1 && !isLoadingAudio) {
      console.log('Starting playback via useEffect');
      playSongAtIndex(0);
    }
  }, [queue, currentIndex, playSongAtIndex, isLoadingAudio]);

  // Compute current song
  const currentSong = currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex] : null;

  // Debug effect to track currentSong changes
  useEffect(() => {
    console.log('Current song changed:', currentSong);
  }, [currentSong]);

  // Debug effect to track isPlaying changes
  useEffect(() => {
    console.log('Is playing changed:', isPlaying);
  }, [isPlaying]);

  // Debug effect to track currentIndex changes
  useEffect(() => {
    console.log('Current index changed:', currentIndex);
  }, [currentIndex]);

  // Debug effect to track queue changes
  useEffect(() => {
    console.log('Queue changed, length:', queue.length);
  }, [queue.length]);

  // Monitor for state mismatches
  useEffect(() => {
    checkAndRestoreQueueState();
  }, [queue.length, currentIndex, isPlaying]);

  const debugAudioState = async () => {
    console.log('=== AUDIO DEBUG INFO ===');
    console.log('Queue length:', queue.length);
    console.log('Current index:', currentIndex);
    console.log('Is playing:', isPlaying);
    console.log('Sound object exists:', !!sound.current);
    console.log('Current song:', currentSong);
    
    if (sound.current) {
      try {
        const status = await sound.current.getStatusAsync();
        console.log('Sound status:', status);
      } catch (error) {
        console.error('Error getting sound status:', error);
      }
    }
    console.log('=== END DEBUG INFO ===');
  };

  // Function to check and restore queue state
  const checkAndRestoreQueueState = () => {
    console.log('=== CHECKING QUEUE STATE ===');
    console.log('Queue length:', queue.length);
    console.log('Current index:', currentIndex);
    console.log('Is playing:', isPlaying);
    console.log('Sound object exists:', !!sound.current);
    
    // If audio is playing but queue is empty, there's a state mismatch
    if (isPlaying && queue.length === 0 && sound.current) {
      console.log('State mismatch detected: Audio playing but queue empty');
      console.log('This might indicate the queue was cleared prematurely');
    }
    
    // If currentIndex is -1 but audio is playing, there's a state mismatch
    if (currentIndex === -1 && isPlaying && sound.current) {
      console.log('State mismatch detected: Audio playing but no current index');
      console.log('This might indicate the currentIndex was reset prematurely');
    }

    // If there are songs in queue but nothing is playing, try to start playback
    if (queue.length > 0 && currentIndex === -1 && !isPlaying && !isLoadingAudio) {
      console.log('Attempting to start playback from queue state check');
      setTimeout(() => playSongAtIndex(0), 100);
    }
  };

  // Function to manually start playback of first song
  const startPlayback = async () => {
    if (queue.length > 0 && currentIndex === -1) {
      console.log('Manually starting playback of first song');
      await playSongAtIndex(0);
    }
  };

  return {
    queue,
    currentIndex,
    setCurrentIndex,
    currentSong,
    isPlaying,
    loopCurrent,
    loopQueue,
    progress,
    downloadingSongs,
    isLoadingAudio,
    isCurrentSongDownloading: currentSong ? 
      downloadingSongs.has(`${currentSong.title}-${currentSong.artist}`) : false,
    addToQueue,
    playNext,
    playPrevious,
    clearQueue,
    toggleLoop,
    playSongAtIndex,
    stopPlayback,
    streamSong,
    pausePlayback,
    resumePlayback,
    currentPositionMillis,
    durationMillis,
    volume,
    setVolume,
    seekToMillis,
    debugAudioState,
    checkAndRestoreQueueState,
    startPlayback,
  };
}
