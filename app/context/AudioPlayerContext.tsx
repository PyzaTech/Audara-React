import React, { createContext, useContext, ReactNode } from 'react';
import usePlayQueue from '../hooks/useAudioPlayer';

type AudioPlayerContextType = ReturnType<typeof usePlayQueue> | null;

const AudioPlayerContext = createContext<AudioPlayerContextType>(null);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const audioPlayer = usePlayQueue();
  return (
    <AudioPlayerContext.Provider value={audioPlayer}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (context === null) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
