import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useWebSocket } from '../context/WebSocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEBUG_MODE } from '../config/debug';

let globalAudioInstance: Audio.Sound | null = null;

type Song = {
  title: string;
  artist: string;
  image: string;
  url: string;
  duration: number;
};

type SongInput = {
  title: string;
  artist: string;
  image: string;
  url?: string;
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
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);
  const sound = useRef<Audio.Sound | null>(null);
  const { ws, sessionKey, sendEncryptedMessage, addMessageListener, removeMessageListener } = useWebSocket();
  const [volume, setVolumeState] = useState(1.0);
  
  // Use ref to store the latest playSongAtIndex function to avoid dependency issues
  const playSongAtIndexRef = useRef<typeof playSongAtIndex | null>(null);
  
  // Use ref to store the current queue to avoid dependency issues
  const queueRef = useRef<Song[]>([]);


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
        if (DEBUG_MODE) console.log('Audio mode set successfully');
      } catch (error) {
        if (DEBUG_MODE) console.error('Failed to set audio mode:', error);
      }
    }
    configureAudio();
  }, []);

  const playSongAtIndex = useCallback(
    async (index: number) => {
      if (DEBUG_MODE) {
        console.log('=== PLAY SONG AT INDEX CALLED ===');
        console.log('Index:', index);
        console.log('Queue length:', queueRef.current.length);
        console.log('Actual queue length:', queue.length);
        console.log('Is loading audio:', isLoadingAudio);
        console.log('Is starting playback:', isStartingPlayback);
        console.log('Current index:', currentIndex);
        console.log('Is playing:', isPlaying);
        console.log('Call stack:', new Error().stack);
      }
      
      if (isLoadingAudio || isStartingPlayback) {
        if (DEBUG_MODE) console.log('Already loading audio or starting playback, skipping this call');
        return;
      }

      // Use the actual queue state instead of the ref to avoid stale closures
      const currentQueue = queue;
      if (DEBUG_MODE) console.log('Using current queue length:', currentQueue.length);

      if (index < 0 || index >= currentQueue.length) {
        if (DEBUG_MODE) {
          console.log('Invalid index or queue empty, cannot play');
          console.log('Index:', index, 'Queue length:', currentQueue.length);
        }
        return;
      }

      setIsStartingPlayback(true);
      setIsLoadingAudio(true);
      if (DEBUG_MODE) console.log('Set isStartingPlayback and isLoadingAudio to true');

      const song = currentQueue[index];
      if (DEBUG_MODE) {
        console.log('Playing song:', song.title, 'by', song.artist);
        console.log('Song URL:', song.url);
        console.log('Song URL type:', typeof song.url);
        console.log('Song URL length:', song.url?.length);
      }
      
      if (!song.url || song.url.trim() === '') {
        if (DEBUG_MODE) console.error('Song URL is empty or invalid:', song.url);
        setIsLoadingAudio(false);
        setIsStartingPlayback(false);
        return;
      }
      
      // Validate URL format
      try {
        new URL(song.url);
        if (DEBUG_MODE) console.log('URL format is valid');
      } catch (urlError) {
        if (DEBUG_MODE) console.error('Invalid URL format:', song.url);
        if (DEBUG_MODE) console.error('URL error:', urlError);
        setIsLoadingAudio(false);
        setIsStartingPlayback(false);
        return;
      }

      try {
        // Clean up global audio instance
        if (globalAudioInstance) {
          if (DEBUG_MODE) console.log('Cleaning up global audio instance');
          try {
            await globalAudioInstance.stopAsync();
            await globalAudioInstance.unloadAsync();
          } catch (error) {
            if (DEBUG_MODE) console.log('Error cleaning up global audio instance:', error);
          }
          globalAudioInstance = null;
        }

        // Clean up local sound reference
        if (sound.current) {
          if (DEBUG_MODE) console.log('Unloading previous sound');
          try {
            await sound.current.stopAsync();
            await sound.current.unloadAsync();
          } catch (error) {
            if (DEBUG_MODE) console.log('Error cleaning up previous sound:', error);
          }
          sound.current = null;
        }
        
        const newSound = new Audio.Sound();

        if (DEBUG_MODE) console.log('Loading sound from URL:', song.url);
        if (DEBUG_MODE) console.log('URL protocol:', new URL(song.url).protocol);
        if (DEBUG_MODE) console.log('URL hostname:', new URL(song.url).hostname);
        if (DEBUG_MODE) console.log('Full URL being loaded:', song.url);
        
        const status = await newSound.loadAsync(
          { uri: song.url },
          { shouldPlay: false, isLooping: loopCurrent },
          false
        );

        if (DEBUG_MODE) console.log('Load status:', status);
        if (DEBUG_MODE) console.log('Load status isLoaded:', status.isLoaded);
        
        if (status.isLoaded) {
          if (DEBUG_MODE) console.log('Load status durationMillis:', status.durationMillis);
        } else {
          if (DEBUG_MODE) console.log('Load status error:', status.error);
        }

        if (!status.isLoaded) {
          if (DEBUG_MODE) console.error('Failed to load sound:', song.url);
          if (DEBUG_MODE) console.error('Load error:', status.error);
          setIsLoadingAudio(false);
          setIsStartingPlayback(false);
          return;
        }

        if (DEBUG_MODE) console.log('Sound loaded successfully, setting up playback');
        if (DEBUG_MODE) console.log('Sound duration:', status.durationMillis);
        if (DEBUG_MODE) console.log('Sound is playing:', status.isPlaying);
        
        // Don't update duration here - it's already set from the WebSocket response
        // The duration from the song data is more reliable than the loaded audio duration
        
        await newSound.setVolumeAsync(volume);
        if (DEBUG_MODE) console.log('Volume set to:', volume);
        
        await newSound.playAsync();
        if (DEBUG_MODE) console.log('PlayAsync called successfully');
        
        // Get the status after playAsync to confirm it's playing
        const playStatus = await newSound.getStatusAsync();
        if (DEBUG_MODE) console.log('Status after playAsync:', playStatus);
        
        if (DEBUG_MODE) console.log('Playback started, setting up status callback');
        
        // Set both global and local references
        globalAudioInstance = newSound;
        sound.current = newSound;
        setCurrentIndex(index);
        setIsPlaying(true);
        
        // Reset position to 0 when starting a new song
        setCurrentPositionMillis(0);
        if (DEBUG_MODE) console.log('Reset position to 0 for new song');
        
        if (DEBUG_MODE) console.log('State updated - currentIndex:', index, 'isPlaying: true');
        if (DEBUG_MODE) console.log('Global audio instance set:', !!globalAudioInstance);
        if (DEBUG_MODE) console.log('Local sound reference set:', !!sound.current);

        newSound.setOnPlaybackStatusUpdate(async (status) => {
          if (DEBUG_MODE) console.log('=== PLAYBACK STATUS UPDATE CALLED ===');
          if (DEBUG_MODE) console.log('Status object:', status);
          if (DEBUG_MODE) console.log('Status isLoaded:', status.isLoaded);
          
          if (!status.isLoaded) {
            if (DEBUG_MODE) console.log('Status update: Sound not loaded');
            return;
          }
          
          // Now TypeScript knows this is AVPlaybackStatusSuccess
          if (DEBUG_MODE) console.log('Status isPlaying:', status.isPlaying);
          if (DEBUG_MODE) console.log('Status positionMillis:', status.positionMillis);
          if (DEBUG_MODE) console.log('Status durationMillis:', status.durationMillis);
          if (DEBUG_MODE) console.log('Status didJustFinish:', status.didJustFinish);
          
          if (DEBUG_MODE) console.log('Playback status update:', {
            isPlaying: status.isPlaying,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis,
            didJustFinish: status.didJustFinish
          });

          // Update playing state
          if (DEBUG_MODE) console.log('Updating isPlaying from status:', status.isPlaying);
          setIsPlaying(status.isPlaying);

          // Update position
          if (typeof status.positionMillis === 'number' && status.positionMillis >= 0) {
            setCurrentPositionMillis(status.positionMillis);
            if (DEBUG_MODE) console.log('Updated position to:', status.positionMillis);
          } else {
            if (DEBUG_MODE) console.log('Position update skipped - invalid position:', status.positionMillis);
          }

          // Don't update duration - keep the original duration from song data
          // The duration is set once when the song is received from WebSocket

          // Update progress
          if (
            typeof status.positionMillis === 'number' &&
            typeof status.positionMillis === 'number'
          ) {
            // Use the current durationMillis state value
            const currentDuration = durationMillis;
            if (currentDuration > 0) {
              setProgress(status.positionMillis / currentDuration);
            } else {
              setProgress(0);
            }
          } else {
            setProgress(0);
          }

          // Handle song completion
          if (status.didJustFinish) {
            if (DEBUG_MODE) console.log('=== SONG FINISHED ===');
            if (DEBUG_MODE) console.log('Song finished, handling next song logic');
            if (DEBUG_MODE) console.log('Current isStartingPlayback:', isStartingPlayback);
            if (DEBUG_MODE) console.log('Current isPlaying:', isPlaying);
            
            // Only handle completion if the song actually finished and we're not starting playback
            if (isStartingPlayback) {
              if (DEBUG_MODE) console.log('Already starting playback, skipping completion handler');
              return;
            }
            
            // Additional check: if the song is still playing, don't handle completion
            if (status.isPlaying) {
              if (DEBUG_MODE) console.log('Song is still playing, skipping completion handler');
              return;
            }
            
            // Get current queue state to avoid stale closure issues
            setQueue((currentQueue) => {
              if (DEBUG_MODE) console.log('Current queue in completion handler:', currentQueue.length);
              
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
        
        if (DEBUG_MODE) console.log('PlaySongAtIndex completed successfully');
      } catch (error) {
        if (DEBUG_MODE) console.error('Error playing song:', error);
        if (error instanceof Error) {
          if (DEBUG_MODE) console.error('Error details:', error.message);
          if (DEBUG_MODE) console.error('Error stack:', error.stack);
          
          // Check for different types of HTTP errors
          if (error.message.includes('410') || error.message.includes('Response code: 410')) {
            if (DEBUG_MODE) console.error('410 Error detected - Resource no longer available:', song.url);
            if (DEBUG_MODE) console.error('This song URL has expired or is no longer accessible');
            
            // For 410 errors, suggest re-requesting via WebSocket to get a fresh URL
            if (DEBUG_MODE) console.log('URL failed with 410 (Gone), you may need to re-request this song via WebSocket');
          } else if (error.message.includes('404') || error.message.includes('Response code: 404')) {
            if (DEBUG_MODE) console.error('404 Error detected - URL not found:', song.url);
            if (DEBUG_MODE) console.error('This might be an expired URL or invalid server URL');
            
            // For any 404 error, suggest re-requesting via WebSocket to get a fresh URL
            if (DEBUG_MODE) console.log('URL failed with 404, you may need to re-request this song via WebSocket');
          } else if (error.message.includes('403') || error.message.includes('Response code: 403')) {
            if (DEBUG_MODE) console.error('403 Error detected - Access forbidden:', song.url);
            if (DEBUG_MODE) console.error('This song may require authentication or the URL has expired');
          } else if (error.message.includes('500') || error.message.includes('Response code: 500')) {
            if (DEBUG_MODE) console.error('500 Error detected - Server error:', song.url);
            if (DEBUG_MODE) console.error('Server error occurred while trying to access this song');
          }
        }
        // Ensure isLoadingAudio is reset even on error
        setIsLoadingAudio(false);
        setIsStartingPlayback(false);
      } finally {
        if (DEBUG_MODE) console.log('Setting isLoadingAudio and isStartingPlayback to false');
        setIsLoadingAudio(false);
        setIsStartingPlayback(false);
      }
    },
    [loopCurrent, loopQueue, isLoadingAudio, isStartingPlayback, volume, queue]
  );

  // Internal function that accepts queue data directly to avoid stale closures
  const playSongAtIndexWithQueue = useCallback(
    async (index: number, queueData: Song[]) => {
      if (DEBUG_MODE) console.log('=== PLAY SONG AT INDEX WITH QUEUE CALLED ===');
      if (DEBUG_MODE) console.log('Index:', index);
      if (DEBUG_MODE) console.log('Queue data length:', queueData.length);
      if (DEBUG_MODE) console.log('Is loading audio:', isLoadingAudio);
      if (DEBUG_MODE) console.log('Is starting playback:', isStartingPlayback);
      if (DEBUG_MODE) console.log('Current index:', currentIndex);
      if (DEBUG_MODE) console.log('Is playing:', isPlaying);
      
      if (isLoadingAudio || isStartingPlayback) {
        if (DEBUG_MODE) console.log('Already loading audio or starting playback, skipping this call');
        return;
      }

      if (index < 0 || index >= queueData.length) {
        if (DEBUG_MODE) console.log('Invalid index or queue empty, cannot play');
        if (DEBUG_MODE) console.log('Index:', index, 'Queue length:', queueData.length);
        return;
      }

      setIsStartingPlayback(true);
      setIsLoadingAudio(true);
      if (DEBUG_MODE) console.log('Set isStartingPlayback and isLoadingAudio to true');

      const song = queueData[index];
      if (DEBUG_MODE) console.log('Playing song:', song.title, 'by', song.artist);
      if (DEBUG_MODE) console.log('Song URL:', song.url);
      if (DEBUG_MODE) console.log('Song URL type:', typeof song.url);
      if (DEBUG_MODE) console.log('Song URL length:', song.url?.length);
      
      if (!song.url || song.url.trim() === '') {
        if (DEBUG_MODE) console.error('Song URL is empty or invalid:', song.url);
        setIsLoadingAudio(false);
        setIsStartingPlayback(false);
        return;
      }
      
      // Validate URL format
      try {
        new URL(song.url);
        if (DEBUG_MODE) console.log('URL format is valid');
      } catch (urlError) {
        if (DEBUG_MODE) console.error('Invalid URL format:', song.url);
        if (DEBUG_MODE) console.error('URL error:', urlError);
        setIsLoadingAudio(false);
        setIsStartingPlayback(false);
        return;
      }

      try {
        // Clean up global audio instance
        if (globalAudioInstance) {
          if (DEBUG_MODE) console.log('Cleaning up global audio instance');
          try {
            await globalAudioInstance.stopAsync();
            await globalAudioInstance.unloadAsync();
          } catch (error) {
            if (DEBUG_MODE) console.log('Error cleaning up global audio instance:', error);
          }
          globalAudioInstance = null;
        }

        // Clean up local sound reference
        if (sound.current) {
          if (DEBUG_MODE) console.log('Unloading previous sound');
          try {
            await sound.current.stopAsync();
            await sound.current.unloadAsync();
          } catch (error) {
            if (DEBUG_MODE) console.log('Error cleaning up previous sound:', error);
          }
          sound.current = null;
        }
        
        const newSound = new Audio.Sound();

        if (DEBUG_MODE) console.log('Loading sound from URL:', song.url);
        if (DEBUG_MODE) console.log('URL protocol:', new URL(song.url).protocol);
        if (DEBUG_MODE) console.log('URL hostname:', new URL(song.url).hostname);
        if (DEBUG_MODE) console.log('Full URL being loaded:', song.url);
        
        const status = await newSound.loadAsync(
          { uri: song.url },
          { shouldPlay: false, isLooping: loopCurrent },
          false
        );

        if (DEBUG_MODE) console.log('Load status:', status);
        if (DEBUG_MODE) console.log('Load status isLoaded:', status.isLoaded);
        
        if (status.isLoaded) {
          if (DEBUG_MODE) console.log('Load status durationMillis:', status.durationMillis);
        } else {
          if (DEBUG_MODE) console.log('Load status error:', status.error);
        }

        if (!status.isLoaded) {
          if (DEBUG_MODE) console.error('Failed to load sound:', song.url);
          if (DEBUG_MODE) console.error('Load error:', status.error);
          setIsLoadingAudio(false);
          setIsStartingPlayback(false);
          return;
        }

        if (DEBUG_MODE) console.log('Sound loaded successfully, setting up playback');
        if (DEBUG_MODE) console.log('Sound duration:', status.durationMillis);
        if (DEBUG_MODE) console.log('Sound is playing:', status.isPlaying);
        
        // Don't update duration here - it's already set from the WebSocket response
        // The duration from the song data is more reliable than the loaded audio duration
        
        await newSound.setVolumeAsync(volume);
        if (DEBUG_MODE) console.log('Volume set to:', volume);
        
        await newSound.playAsync();
        if (DEBUG_MODE) console.log('PlayAsync called successfully');
        
        // Get the status after playAsync to confirm it's playing
        const playStatus = await newSound.getStatusAsync();
        if (DEBUG_MODE) console.log('Status after playAsync:', playStatus);
        
        if (DEBUG_MODE) console.log('Playback started, setting up status callback');
        
        // Set both global and local references
        globalAudioInstance = newSound;
        sound.current = newSound;
        setCurrentIndex(index);
        setIsPlaying(true);
        
        // Reset position to 0 when starting a new song
        setCurrentPositionMillis(0);
        if (DEBUG_MODE) console.log('Reset position to 0 for new song');
        
        if (DEBUG_MODE) console.log('State updated - currentIndex:', index, 'isPlaying: true');
        if (DEBUG_MODE) console.log('Global audio instance set:', !!globalAudioInstance);
        if (DEBUG_MODE) console.log('Local sound reference set:', !!sound.current);

        newSound.setOnPlaybackStatusUpdate(async (status) => {
          if (DEBUG_MODE) console.log('=== PLAYBACK STATUS UPDATE CALLED ===');
          if (DEBUG_MODE) console.log('Status object:', status);
          if (DEBUG_MODE) console.log('Status isLoaded:', status.isLoaded);
          
          if (!status.isLoaded) {
            if (DEBUG_MODE) console.log('Status update: Sound not loaded');
            return;
          }
          
          // Now TypeScript knows this is AVPlaybackStatusSuccess
          if (DEBUG_MODE) console.log('Status isPlaying:', status.isPlaying);
          if (DEBUG_MODE) console.log('Status positionMillis:', status.positionMillis);
          if (DEBUG_MODE) console.log('Status durationMillis:', status.durationMillis);
          if (DEBUG_MODE) console.log('Status didJustFinish:', status.didJustFinish);
          
          if (DEBUG_MODE) console.log('Playback status update:', {
            isPlaying: status.isPlaying,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis,
            didJustFinish: status.didJustFinish
          });

          // Update playing state
          if (DEBUG_MODE) console.log('Updating isPlaying from status:', status.isPlaying);
          setIsPlaying(status.isPlaying);

          // Update position
          if (typeof status.positionMillis === 'number' && status.positionMillis >= 0) {
            setCurrentPositionMillis(status.positionMillis);
            if (DEBUG_MODE) console.log('Updated position to:', status.positionMillis);
          } else {
            if (DEBUG_MODE) console.log('Position update skipped - invalid position:', status.positionMillis);
          }

          // Don't update duration - keep the original duration from song data
          // The duration is set once when the song is received from WebSocket

          // Update progress
          if (
            typeof status.positionMillis === 'number' &&
            typeof status.positionMillis === 'number'
          ) {
            // Use the current durationMillis state value
            const currentDuration = durationMillis;
            if (currentDuration > 0) {
              setProgress(status.positionMillis / currentDuration);
            } else {
              setProgress(0);
            }
          } else {
            setProgress(0);
          }

          // Handle song completion
          if (status.didJustFinish) {
            if (DEBUG_MODE) console.log('=== SONG FINISHED ===');
            if (DEBUG_MODE) console.log('Song finished, handling next song logic');
            if (DEBUG_MODE) console.log('Current isStartingPlayback:', isStartingPlayback);
            if (DEBUG_MODE) console.log('Current isPlaying:', isPlaying);
            
            // Only handle completion if the song actually finished and we're not starting playback
            if (isStartingPlayback) {
              if (DEBUG_MODE) console.log('Already starting playback, skipping completion handler');
              return;
            }
            
            // Additional check: if the song is still playing, don't handle completion
            if (status.isPlaying) {
              if (DEBUG_MODE) console.log('Song is still playing, skipping completion handler');
              return;
            }
            
            // Get current queue state to avoid stale closure issues
            setQueue((currentQueue) => {
              if (DEBUG_MODE) console.log('Current queue in completion handler:', currentQueue.length);
              
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
        
        if (DEBUG_MODE) console.log('PlaySongAtIndexWithQueue completed successfully');
      } catch (error) {
        if (DEBUG_MODE) console.error('Error playing song:', error);
        if (error instanceof Error) {
          if (DEBUG_MODE) console.error('Error details:', error.message);
          if (DEBUG_MODE) console.error('Error stack:', error.stack);
          
          // Check for different types of HTTP errors
          if (error.message.includes('410') || error.message.includes('Response code: 410')) {
            if (DEBUG_MODE) console.error('410 Error detected - Resource no longer available:', song.url);
            if (DEBUG_MODE) console.error('This song URL has expired or is no longer accessible');
            
            // For 410 errors, suggest re-requesting via WebSocket to get a fresh URL
            if (DEBUG_MODE) console.log('URL failed with 410 (Gone), you may need to re-request this song via WebSocket');
          } else if (error.message.includes('404') || error.message.includes('Response code: 404')) {
            if (DEBUG_MODE) console.error('404 Error detected - URL not found:', song.url);
            if (DEBUG_MODE) console.error('This might be an expired URL or invalid server URL');
            
            // For any 404 error, suggest re-requesting via WebSocket to get a fresh URL
            if (DEBUG_MODE) console.log('URL failed with 404, you may need to re-request this song via WebSocket');
          } else if (error.message.includes('403') || error.message.includes('Response code: 403')) {
            if (DEBUG_MODE) console.error('403 Error detected - Access forbidden:', song.url);
            if (DEBUG_MODE) console.error('This song may require authentication or the URL has expired');
          } else if (error.message.includes('500') || error.message.includes('Response code: 500')) {
            if (DEBUG_MODE) console.error('500 Error detected - Server error:', song.url);
            if (DEBUG_MODE) console.error('Server error occurred while trying to access this song');
          }
        }
        // Ensure isLoadingAudio is reset even on error
        setIsLoadingAudio(false);
        setIsStartingPlayback(false);
      } finally {
        if (DEBUG_MODE) console.log('Setting isLoadingAudio and isStartingPlayback to false');
        setIsLoadingAudio(false);
        setIsStartingPlayback(false);
      }
    },
    [loopCurrent, loopQueue, isLoadingAudio, isStartingPlayback, volume]
  );

  // Update the ref whenever playSongAtIndex changes
  useEffect(() => {
    playSongAtIndexRef.current = playSongAtIndex;
  }, [playSongAtIndex]);

  // Update the queue ref whenever queue changes
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const setVolume = async (newVolume: number) => {
  if (sound.current) {
    await sound.current.setVolumeAsync(newVolume);
  }
  setVolumeState(newVolume);
};


  const stopPlayback = async () => {
    if (DEBUG_MODE) console.log('=== STOP PLAYBACK CALLED ===');
    try {
      // Clean up global audio instance
      if (globalAudioInstance) {
        if (DEBUG_MODE) console.log('Stopping and unloading global audio instance');
        try {
          await globalAudioInstance.stopAsync();
          await globalAudioInstance.unloadAsync();
        } catch (error) {
          if (DEBUG_MODE) console.log('Error during global stop/unload:', error);
        }
        globalAudioInstance = null;
      }

      // Clean up local sound reference
      if (sound.current) {
        if (DEBUG_MODE) console.log('Stopping and unloading local sound');
        try {
          await sound.current.stopAsync();
          await sound.current.unloadAsync();
        } catch (error) {
          if (DEBUG_MODE) console.log('Error during local stop/unload:', error);
        }
        sound.current = null;
      }
      
      setIsPlaying(false);
      setProgress(0);
      setCurrentPositionMillis(0);
      setDurationMillis(0);
      if (DEBUG_MODE) console.log('Playback stopped successfully');
    } catch (error) {
      if (DEBUG_MODE) console.error('Error stopping playback:', error);
    }
  };

  const playNext = useCallback(async () => {
    if (currentIndex < queue.length - 1 && !isStartingPlayback) {
      await playSongAtIndex(currentIndex + 1);
    } else if (loopQueue && queue.length > 0 && !isStartingPlayback) {
      await playSongAtIndex(0);
    }
  }, [currentIndex, queue.length, loopQueue, playSongAtIndex, isStartingPlayback]);

  const playPrevious = useCallback(async () => {
    if (currentIndex > 0 && !isStartingPlayback) {
      await playSongAtIndex(currentIndex - 1);
    } else if (loopQueue && queue.length > 0 && !isStartingPlayback) {
      await playSongAtIndex(queue.length - 1);
    }
  }, [currentIndex, queue.length, loopQueue, playSongAtIndex, isStartingPlayback]);

  const streamSong = (song: Song) => {
    if (DEBUG_MODE) console.log('=== STREAM SONG CALLED ===');
    if (DEBUG_MODE) console.log('WebSocket exists:', !!ws);
    if (DEBUG_MODE) console.log('Session key exists:', !!sessionKey);
    
    if (!ws || !sessionKey) {
      if (DEBUG_MODE) console.warn('WebSocket or session key is missing');
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

    if (DEBUG_MODE) console.log('Sending stream request:', songMetaData);
    sendEncryptedMessage(songMetaData);

    setTimeout(() => {
      setDownloadingSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(songKey);
        return newSet;
      });
    }, 30000);
  };

  const addToQueue = async (song: SongInput) => {
    if (DEBUG_MODE) console.log('=== ADD TO QUEUE CALLED ===');
    if (DEBUG_MODE) console.log('Song:', song);
    if (DEBUG_MODE) console.log('Current queue length:', queue.length);
    if (DEBUG_MODE) console.log('Current index:', currentIndex);
    if (DEBUG_MODE) console.log('Is playing:', isPlaying);
    
    if (!song.url || song.url.trim() === '') {
      if (DEBUG_MODE) console.log('Song missing URL, requesting song data first...');
      
      if (!ws || !sessionKey) {
        if (DEBUG_MODE) console.error('WebSocket or session key is missing, cannot request song data');
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

      if (DEBUG_MODE) console.log('Requesting song data for queue:', songMetaData);
      
      const messageListener = (data: any) => {
        if (data.success && data.type === 'url' && 
            data.title === song.title && data.artist === song.artist) {
          
          removeMessageListener('stream-song', messageListener);
          
          let serverUrl = '';
          AsyncStorage.getItem('server_url').then(storedUrl => {
            serverUrl = (storedUrl || '').replace(/^wss?:\/\//, '');
            let songUrl = data.url?.replace('URLPATH', `${serverUrl}`) ?? '';
            
            if (songUrl && !songUrl.startsWith('http://') && !songUrl.startsWith('https://')) {
              songUrl = `http://${songUrl}`;
            }

            if (!songUrl) {
              if (DEBUG_MODE) console.error('Received invalid song URL');
              setDownloadingSongs(prev => {
                const newSet = new Set(prev);
                newSet.delete(songKey);
                return newSet;
              });
              return;
            }

            const songWithData: Song = {
              title: data.title ?? song.title,
              artist: data.artist ?? song.artist,
              image: data.image ?? song.image,
              url: songUrl,
              duration: data.duration && typeof data.duration === 'number' && data.duration > 0 
                ? (data.duration < 1000 ? data.duration * 1000 : data.duration)
                : song.duration || 180000,
            };

            setDownloadingSongs(prev => {
              const newSet = new Set(prev);
              newSet.delete(songKey);
              return newSet;
            });

            if (DEBUG_MODE) console.log('Song data received, adding to queue:', songWithData);
            addToQueueInternal(songWithData);
          });
        } else if (data.error && data.title === song.title && data.artist === song.artist) {
          removeMessageListener('stream-song', messageListener);
          setDownloadingSongs(prev => {
            const newSet = new Set(prev);
            newSet.delete(songKey);
            return newSet;
          });
          if (DEBUG_MODE) console.error('Error requesting song data:', data.error);
        }
      };

      addMessageListener('stream-song', messageListener);
      sendEncryptedMessage(songMetaData);

      setTimeout(() => {
        removeMessageListener('stream-song', messageListener);
        setDownloadingSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(songKey);
          return newSet;
        });
        if (DEBUG_MODE) console.error('Request timeout for song data');
      }, 30000);

      return;
    }
    
    if (song.url) {
      addToQueueInternal(song as Song);
    } else {
      if (DEBUG_MODE) console.error('Song still missing URL after processing');
    }
  };

  const addToQueueInternal = (song: Song) => {
    setQueue((prevQueue) => {
      const existingIndex = prevQueue.findIndex(
        (s) => s.title === song.title && s.artist === song.artist
      );

      if (existingIndex === prevQueue.length - 1) {
        return prevQueue;
      }

      let newQueue;

      if (existingIndex !== -1) {
        newQueue = prevQueue.filter((_, idx) => idx !== existingIndex);
        newQueue.push(song);
      } else {
        newQueue = [...prevQueue, song];
      }

      setCurrentIndex((prevIndex) => {
        if (DEBUG_MODE) console.log('addToQueue: Setting currentIndex from', prevIndex, 'to', prevQueue.length === 0 ? 0 : prevIndex);
        setIsPlaying((prevIsPlaying) => {
          if (DEBUG_MODE) console.log('addToQueue: Current isPlaying state:', prevIsPlaying);
          if (prevQueue.length === 0 && prevIndex === -1 && !prevIsPlaying && !isStartingPlayback) {
            if (DEBUG_MODE) console.log('No song currently playing, starting playback of first song');
            setTimeout(() => {
              if (DEBUG_MODE) console.log('addToQueue: Calling playSongAtIndex(0)');
              playSongAtIndex(0);
            }, 200);
          } else {
            if (DEBUG_MODE) console.log('Song added to queue while another song is playing, not interfering with current playback');
          }
          return prevIsPlaying;
        });
        return prevQueue.length === 0 ? 0 : prevIndex;
      });

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
        if (DEBUG_MODE) console.log('Current sound status:', status);
        return status;
      } catch (error) {
        if (DEBUG_MODE) console.error('Error getting sound status:', error);
        return null;
      }
    }
    return null;
  };

  const pausePlayback = async () => {
    try {
      if (DEBUG_MODE) console.log('=== PAUSE PLAYBACK CALLED ===');
      if (DEBUG_MODE) console.log('Sound object exists:', !!sound.current);
      if (DEBUG_MODE) console.log('Current isPlaying state:', isPlaying);
      
      if (!sound.current) {
        if (DEBUG_MODE) console.log('No sound object available to pause');
        return;
      }

      const status = await sound.current.getStatusAsync();
      if (DEBUG_MODE) console.log('Current sound status:', status);
      
      if (status.isLoaded) {
        if (DEBUG_MODE) console.log('Pausing sound...');
        await sound.current.pauseAsync();
        if (DEBUG_MODE) console.log('Sound paused successfully');
        
        // Manually update state to ensure UI reflects the change
        setIsPlaying(false);
        if (DEBUG_MODE) console.log('isPlaying state set to false');
      } else {
        if (DEBUG_MODE) console.log('Sound not loaded, cannot pause');
      }
    } catch (error) {
      if (DEBUG_MODE) console.error('Error pausing playback:', error);
    }
  };

  const resumePlayback = async () => {
    try {
      if (DEBUG_MODE) console.log('=== RESUME PLAYBACK CALLED ===');
      if (DEBUG_MODE) console.log('Sound object exists:', !!sound.current);
      if (DEBUG_MODE) console.log('Current isPlaying state:', isPlaying);
      
      if (!sound.current) {
        if (DEBUG_MODE) console.log('No sound object available to resume');
        return;
      }

      const status = await sound.current.getStatusAsync();
      if (DEBUG_MODE) console.log('Current sound status:', status);
      
      if (status.isLoaded) {
        if (DEBUG_MODE) console.log('Resuming sound...');
        await sound.current.playAsync();
        if (DEBUG_MODE) console.log('Sound resumed successfully');
        
        // Manually update state to ensure UI reflects the change
        setIsPlaying(true);
        if (DEBUG_MODE) console.log('isPlaying state set to true');
      } else {
        if (DEBUG_MODE) console.log('Sound not loaded, cannot resume');
        // If sound is not loaded but we have a current song, try to reload it
        if (currentSong && currentIndex >= 0 && !isStartingPlayback) {
          if (DEBUG_MODE) console.log('Attempting to reload current song');
          await playSongAtIndex(currentIndex);
        }
      }
    } catch (error) {
      if (DEBUG_MODE) console.error('Error resuming playback:', error);
      // If resume fails, try to reload the current song
      if (currentSong && currentIndex >= 0 && !isStartingPlayback) {
        if (DEBUG_MODE) console.log('Resume failed, attempting to reload current song');
        await playSongAtIndex(currentIndex);
      }
    }
  };

  const seekToMillis = async (millis: number) => {
    if (sound.current && millis >= 0) {
      try {
        const status = await sound.current.getStatusAsync();
        if (DEBUG_MODE) console.log('Current sound status:', status);
        if (DEBUG_MODE) console.log('Seeking to:', millis, 'Current status:', status);

        // Type guard: Check if the status indicates a loaded sound
        if (status.isLoaded) {
          // Now TypeScript knows 'status' is of type AVPlaybackStatusSuccess
          // and 'durationMillis' will be accessible.
          if (status.durationMillis != null && millis <= status.durationMillis) {
            await sound.current.setPositionAsync(millis);
            if (DEBUG_MODE) console.log('Seek successful to:', millis);
          } else {
            if (DEBUG_MODE) console.warn('Seek position is out of bounds or durationMillis is null/undefined.');
          }
        } else {
          if (DEBUG_MODE) console.warn('Sound is not loaded, cannot seek.');
        }
      } catch (error) {
        if (DEBUG_MODE) console.error('Failed to seek:', error);
      }
    }
  };


  // Listen for "stream-song" responses from server and play immediately
  useEffect(() => {
    if (!ws || !sessionKey) return;

    const handleStreamSong = async (data: any) => {
      if (DEBUG_MODE) console.log('=== HANDLE STREAM SONG CALLED ===');
      if (DEBUG_MODE) console.log('Received data:', data);
      
      if (data.success && data.type === 'url') {
        let serverUrl = (await AsyncStorage.getItem('server_url')) || '';
        serverUrl = serverUrl.replace(/^wss?:\/\//, '');
        let songUrl = data.url?.replace('URLPATH', `${serverUrl}`) ?? '';
        
        // Ensure the URL has the proper protocol
        if (songUrl && !songUrl.startsWith('http://') && !songUrl.startsWith('https://')) {
          songUrl = `http://${songUrl}`;
        }

        if (DEBUG_MODE) console.log('URL construction:', {
          originalServerUrl: await AsyncStorage.getItem('server_url'),
          processedServerUrl: serverUrl,
          originalDataUrl: data.url,
          finalSongUrl: songUrl
        });

        if (!songUrl) {
          if (DEBUG_MODE) console.error('Received invalid song URL');
          return;
        }

        const songToPlay: Song = {
          title: data.title ?? '',
          artist: data.artist ?? '',
          image: data.image ?? '',
          url: songUrl,
          duration: data.duration && typeof data.duration === 'number' && data.duration > 0 
            ? (data.duration < 1000 ? data.duration * 1000 : data.duration) // Convert seconds to milliseconds if needed
            : 180000, // Default 3 minutes if no duration provided
        };

        if (DEBUG_MODE) console.log('Received song data from server:', {
          title: data.title,
          artist: data.artist,
          duration: data.duration,
          durationType: typeof data.duration,
          url: songUrl
        });

        if (DEBUG_MODE) console.log('Duration processing:', {
          rawDuration: data.duration,
          durationType: typeof data.duration,
          isNumber: typeof data.duration === 'number',
          isPositive: data.duration > 0,
          isSeconds: data.duration && data.duration < 1000,
          convertedDuration: data.duration && typeof data.duration === 'number' && data.duration > 0 
            ? (data.duration < 1000 ? data.duration * 1000 : data.duration)
            : 180000
        });

        const songKey = `${songToPlay.title}-${songToPlay.artist}`;
        setDownloadingSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(songKey);
          return newSet;
        });

        if (DEBUG_MODE) console.log('Adding song to queue:', songToPlay);

        // Set duration immediately if available from the song data
        if (songToPlay.duration && songToPlay.duration > 0) {
          setDurationMillis(songToPlay.duration);
          if (DEBUG_MODE) console.log('Set duration immediately from song data:', songToPlay.duration);
        }

        // Use functional state updates to avoid stale closure issues
        setQueue((prevQueue) => {
          if (DEBUG_MODE) console.log('Previous queue length:', prevQueue.length);
          const newQueue = [...prevQueue, songToPlay];
          if (DEBUG_MODE) console.log('New queue length:', newQueue.length);
          
          // Check current state using functional updates to avoid stale closures
          setCurrentIndex((prevIndex) => {
            if (DEBUG_MODE) console.log('Setting currentIndex from', prevIndex, 'to', prevQueue.length === 0 ? 0 : prevIndex);
            setIsPlaying((prevIsPlaying) => {
              if (DEBUG_MODE) console.log('Current isPlaying state:', prevIsPlaying);
              // Only start playing if this is the first song and nothing is currently playing
              if (prevQueue.length === 0 && prevIndex === -1 && !prevIsPlaying && !isStartingPlayback) {
                if (DEBUG_MODE) console.log('First song in queue and nothing playing, starting playback');
                // Call playSongAtIndex directly with the new queue data
                setTimeout(() => {
                  if (DEBUG_MODE) console.log('Calling playSongAtIndex(0) from handleStreamSong with queue data');
                  playSongAtIndexWithQueue(0, newQueue);
                }, 100);
              } else {
                if (DEBUG_MODE) console.log('Song added to queue while another song is playing, not interfering with current playback');
              }
              return prevIsPlaying; // Keep the current playing state
            });
            return prevQueue.length === 0 ? 0 : prevIndex; // Set to 0 if first song, otherwise keep current
          });
          
          return newQueue;
        });
      } else if (data.error) {
        if (DEBUG_MODE) console.error('Stream song error:', data.error);
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
  }, [ws, sessionKey, addMessageListener, removeMessageListener]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (DEBUG_MODE) console.log('=== CLEANUP EFFECT RUNNING ===');
      if (sound.current) {
        if (DEBUG_MODE) console.log('Cleaning up sound on unmount');
        sound.current.unloadAsync().catch(error => {
          if (DEBUG_MODE) console.log('Error during cleanup:', error);
        });
        sound.current = null;
      }
    };
  }, []);

  // Additional cleanup effect for when queue changes
  useEffect(() => {
    return () => {
      if (sound.current) {
        if (DEBUG_MODE) console.log('Cleaning up sound due to queue change');
        sound.current.unloadAsync().catch(error => {
          if (DEBUG_MODE) console.log('Error during queue cleanup:', error);
        });
        sound.current = null;
      }
    };
  }, [queue]);

  useEffect(() => {
    if (DEBUG_MODE) console.log('Queue/currentIndex effect triggered:', { 
      queueLength: queue.length, 
      currentIndex, 
      isLoadingAudio,
      isPlaying 
    });
    // Removed the automatic playback trigger to prevent duplicate playback
    // Playback is now handled by handleStreamSong and addToQueue functions
  }, [queue, currentIndex, playSongAtIndex, isLoadingAudio]);

  // Compute current song
  const currentSong = currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex] : null;

  // Debug effect to track currentSong changes
  useEffect(() => {
    if (DEBUG_MODE) console.log('Current song changed:', currentSong);
  }, [currentSong]);

  // Debug effect to track isPlaying changes
  useEffect(() => {
    if (DEBUG_MODE) console.log('Is playing changed:', isPlaying);
    if (DEBUG_MODE) console.log('Sound object exists:', !!sound.current);
    if (sound.current) {
      sound.current.getStatusAsync().then(status => {
        if (DEBUG_MODE) console.log('Current sound status:', status);
      }).catch(error => {
        if (DEBUG_MODE) console.log('Error getting sound status:', error);
      });
    }
  }, [isPlaying]);

  // Debug effect to track currentIndex changes
  useEffect(() => {
    if (DEBUG_MODE) console.log('Current index changed:', currentIndex);
    if (currentIndex >= 0 && queue[currentIndex]) {
      if (DEBUG_MODE) console.log('Current song:', queue[currentIndex]);
    }
  }, [currentIndex, queue]);

  // Debug effect to track queue changes
  useEffect(() => {
    if (DEBUG_MODE) console.log('Queue changed, length:', queue.length);
    if (DEBUG_MODE) console.log('Queue contents:', queue.map(song => `${song.title} - ${song.artist}`));
  }, [queue.length]);

  // Monitor for state mismatches
  useEffect(() => {
    if (DEBUG_MODE) console.log('=== MONITOR EFFECT TRIGGERED ===');
    if (DEBUG_MODE) console.log('Queue length changed:', queue.length);
    if (DEBUG_MODE) console.log('Current index changed:', currentIndex);
    if (DEBUG_MODE) console.log('Is playing changed:', isPlaying);
    checkAndRestoreQueueState();
  }, [queue.length, currentIndex, isPlaying]);

  const debugAudioState = async () => {
    if (DEBUG_MODE) console.log('=== AUDIO DEBUG INFO ===');
    if (DEBUG_MODE) console.log('Queue length:', queue.length);
    if (DEBUG_MODE) console.log('Current index:', currentIndex);
    if (DEBUG_MODE) console.log('Is playing:', isPlaying);
    if (DEBUG_MODE) console.log('Sound object exists:', !!sound.current);
    if (DEBUG_MODE) console.log('Current song:', currentSong);
    
    if (sound.current) {
      try {
        const status = await sound.current.getStatusAsync();
        if (DEBUG_MODE) console.log('Sound status:', status);
      } catch (error) {
        if (DEBUG_MODE) console.error('Error getting sound status:', error);
      }
    }
    if (DEBUG_MODE) console.log('=== END DEBUG INFO ===');
  };

  // Function to check and restore queue state
  const checkAndRestoreQueueState = () => {
    if (DEBUG_MODE) console.log('=== CHECKING QUEUE STATE ===');
    if (DEBUG_MODE) console.log('Queue length:', queue.length);
    if (DEBUG_MODE) console.log('Current index:', currentIndex);
    if (DEBUG_MODE) console.log('Is playing:', isPlaying);
    if (DEBUG_MODE) console.log('Sound object exists:', !!sound.current);
    if (DEBUG_MODE) console.log('Is loading audio:', isLoadingAudio);
    
    // If audio is playing but queue is empty, there's a state mismatch
    if (isPlaying && queue.length === 0 && sound.current) {
      if (DEBUG_MODE) console.log('State mismatch detected: Audio playing but queue empty');
      if (DEBUG_MODE) console.log('This might indicate the queue was cleared prematurely');
    }
    
    // If currentIndex is -1 but audio is playing, there's a state mismatch
    if (currentIndex === -1 && isPlaying && sound.current) {
      if (DEBUG_MODE) console.log('State mismatch detected: Audio playing but no current index');
      if (DEBUG_MODE) console.log('This might indicate the currentIndex was reset prematurely');
    }

    // Removed automatic playback trigger to prevent duplicate playback
    // Playback is now handled by handleStreamSong and addToQueue functions
  };

  // Function to manually start playback of first song
  const startPlayback = async () => {
    if (queue.length > 0 && currentIndex === -1 && !isStartingPlayback) {
      if (DEBUG_MODE) console.log('Manually starting playback of first song');
      await playSongAtIndex(0);
    }
  };

  // Function to force reload current song
  const reloadCurrentSong = async () => {
    if (currentIndex >= 0 && currentIndex < queue.length) {
      const currentSong = queue[currentIndex];
      if (DEBUG_MODE) console.log('Force reloading current song:', currentSong.title);
      if (DEBUG_MODE) console.log('Current song URL:', currentSong.url);
      
      // Check if this is a Deezer preview URL (which might be expired/404)
      const isDeezerUrl = currentSong.url && (
        currentSong.url.includes('e-cdns-proxy') || 
        currentSong.url.includes('deezer.com') ||
        currentSong.url.includes('preview')
      );
      
      // Always re-request via WebSocket to get a fresh URL
      // This handles both Deezer URLs and server URLs that might be expired/404
      if (DEBUG_MODE) console.log('Re-requesting song via WebSocket to get fresh URL');
      streamSong(currentSong);
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
    reloadCurrentSong,
  };
}
