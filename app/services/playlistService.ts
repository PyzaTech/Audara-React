import { useWebSocket } from '../context/WebSocketContext';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';

export type Playlist = {
  id: string;
  name: string;
  description?: string;
  songCount: number;
  createdAt: string;
  songs: PlaylistSong[];
};

export type PlaylistSong = {
  id: string;
  title: string;
  artist: string;
  image: string;
  duration: number;
};

export const usePlaylistService = () => {
  const { sendEncryptedMessage, addMessageListener, removeMessageListener } = useWebSocket();

  const createPlaylist = async (name: string, description?: string) => {
    if (DEBUG_MODE) logger.log('Creating playlist:', { name, description });
    
    await sendEncryptedMessage({
      action: 'create_playlist',
      name,
      description: description || ''
    });
  };

  const getPlaylists = async () => {
    if (DEBUG_MODE) logger.log('Fetching playlists');
    
    await sendEncryptedMessage({
      action: 'get_playlists'
    });
  };

  const getPlaylistSongs = async (playlistId: string) => {
    if (DEBUG_MODE) logger.log('Fetching playlist songs:', playlistId);
    
    await sendEncryptedMessage({
      action: 'get_playlist_songs',
      playlist_id: playlistId
    });
  };

  const addSongToPlaylist = async (playlistId: string, song: PlaylistSong) => {
    if (DEBUG_MODE) logger.log('Adding song to playlist:', { playlistId, song });
    
    await sendEncryptedMessage({
      action: 'add_song_to_playlist',
      playlist_id: playlistId,
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        image: song.image,
        duration: song.duration || 0
      }
    });
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    if (DEBUG_MODE) logger.log('Removing song from playlist:', { playlistId, songId });
    
    await sendEncryptedMessage({
      action: 'remove_song_from_playlist',
      playlist_id: playlistId,
      song_id: songId
    });
  };

  const deletePlaylist = async (playlistId: string) => {
    if (DEBUG_MODE) logger.log('Deleting playlist:', playlistId);
    
    await sendEncryptedMessage({
      action: 'delete_playlist',
      playlist_id: playlistId
    });
  };

  const playPlaylist = async (playlistId: string) => {
    if (DEBUG_MODE) logger.log('Playing playlist:', playlistId);
    
    await sendEncryptedMessage({
      action: 'play_playlist',
      playlist_id: playlistId
    });
  };

  return {
    createPlaylist,
    getPlaylists,
    getPlaylistSongs,
    addSongToPlaylist,
    removeSongFromPlaylist,
    deletePlaylist,
    playPlaylist,
    addMessageListener,
    removeMessageListener
  };
}; 