import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useWebSocket } from '../context/WebSocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      if (index < 0 || index >= queue.length) {
        await stopPlayback();
        setCurrentIndex(-1);
        return;
      }

      try {
        if (sound.current) {
          await sound.current.unloadAsync();
          sound.current = null;
        }

        const song = queue[index];
        const newSound = new Audio.Sound();

        console.log('Loading sound from URL:', song.url);
        const status = await newSound.loadAsync(
          { uri: song.url },
          { shouldPlay: false, isLooping: loopCurrent },
          false
        );

        if (!status.isLoaded) {
          console.error('Failed to load sound:', song.url);
          return;
        }

        await newSound.setVolumeAsync(1.0);
        await newSound.playAsync();
        console.log('Playback started');

        sound.current = newSound;
        setCurrentIndex(index);
        setIsPlaying(true);


        newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded) return;

        setIsPlaying(status.isPlaying);

        if (typeof status.positionMillis === 'number' && status.positionMillis >= 0) {
            setCurrentPositionMillis(status.positionMillis);
        }

        setDurationMillis(song.duration);

        if (
            typeof status.positionMillis === 'number' &&
            typeof status.durationMillis === 'number' &&
            status.durationMillis > 0
        ) {
            setProgress(status.positionMillis / song.duration);
        } else {
            setProgress(0);
        }

        if (status.didJustFinish) {
          if (loopCurrent) {
            // Replay the current song
            await playSongAtIndex(index);
          } else if (index < queue.length - 1) {
            // Play the next song in the queue
            await playSongAtIndex(index + 1);
          } else if (loopQueue && queue.length > 0) {
            // Loop back to the start if loopQueue is enabled
            await playSongAtIndex(0);
          } else {
            // No more songs, stop playback and clear queue
            await stopPlayback();
            setCurrentIndex(-1);
            setQueue([]);
            setProgress(0);
            setCurrentPositionMillis(0);
            setDurationMillis(0);
          }
        }

        });
      } catch (error) {
        console.error('Error playing song:', error);
      }
    },
    [queue, loopCurrent, loopQueue]
  );

  const setVolume = async (newVolume: number) => {
  if (sound.current) {
    await sound.current.setVolumeAsync(newVolume);
  }
  setVolumeState(newVolume);
};


  const stopPlayback = async () => {
    if (sound.current) {
      await sound.current.stopAsync();
      await sound.current.unloadAsync();
      sound.current = null;
    }
    setIsPlaying(false);
    setProgress(0); // Reset progress on stop
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

        // If nothing is playing, start playing immediately
        if (prevQueue.length === 0) {
        setTimeout(() => playSongAtIndex(0), 0);
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

  const pausePlayback = async () => {
    if (sound.current && isPlaying) {
      await sound.current.pauseAsync();
      setIsPlaying(false);
    }
  };

  const resumePlayback = async () => {
    if (sound.current && !isPlaying) {
      await sound.current.playAsync();
      setIsPlaying(true);
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
          duration: data.duration,
        };

        console.log('Adding song to queue:', songToPlay);

        setQueue((prevQueue) => [...prevQueue, songToPlay]);

        if (currentIndex === -1) {
          setCurrentIndex(0);
          setTimeout(() => {
            playSongAtIndex(0);
          }, 0);
        }
      } else if (data.error) {
        console.error('Stream song error:', data.error);
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

    const songMetaData = {
      action: 'stream-song',
      title: song.title,
      artist: song.artist,
      image: song.image,

    };

    console.log('Sending stream request:', songMetaData);
    sendEncryptedMessage(songMetaData);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound.current) {
        sound.current.unloadAsync();
        sound.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (queue.length > 0 && currentIndex === -1) {
      playSongAtIndex(0);
    }
  }, [queue, currentIndex, playSongAtIndex]);

  return {
    queue,
    currentIndex,
    currentSong: currentIndex >= 0 ? queue[currentIndex] : null,
    isPlaying,
    loopCurrent,
    loopQueue,
    progress,               // Added progress here
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
  };
}
