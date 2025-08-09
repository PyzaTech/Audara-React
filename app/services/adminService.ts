import { useWebSocket } from '../context/WebSocketContext';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAdminService = () => {
  const { sendEncryptedMessage } = useWebSocket();

  const getAdminStats = async () => {
    if (DEBUG_MODE) logger.log('Requesting admin stats...');
    const username = await AsyncStorage.getItem('username');
    sendEncryptedMessage({ action: 'admin_stats', username: username || '' });
  };

  const getUserList = async() => {
    if (DEBUG_MODE) logger.log('Requesting user list...');
    const username = await AsyncStorage.getItem('username');
    sendEncryptedMessage({ action: 'get_user_list', username: username || '' });
  };

  const createUser = (username: string, password: string, isAdmin: boolean = false) => {
    if (DEBUG_MODE) logger.log('Creating user:', username, isAdmin);
    sendEncryptedMessage({ 
      action: 'create_user', 
      username: username,
      password: password,
      is_admin: isAdmin
    });
  };

  const banUser = (userId: string, reason?: string) => {
    if (DEBUG_MODE) logger.log('Banning user:', userId, reason);
    sendEncryptedMessage({ 
      action: 'ban_user', 
      user_id: userId, 
      reason: reason || 'No reason provided' 
    });
  };

  const unbanUser = (userId: string) => {
    if (DEBUG_MODE) logger.log('Unbanning user:', userId);
    sendEncryptedMessage({ 
      action: 'unban_user', 
      user_id: userId 
    });
  };

  const promoteUser = (userId: string) => {
    if (DEBUG_MODE) logger.log('Promoting user to admin:', userId);
    sendEncryptedMessage({ 
      action: 'promote_user', 
      user_id: userId 
    });
  };

  const demoteUser = (userId: string) => {
    if (DEBUG_MODE) logger.log('Demoting user from admin:', userId);
    sendEncryptedMessage({ 
      action: 'demote_user', 
      user_id: userId 
    });
  };

  const getSystemLogs = (limit: number = 100) => {
    if (DEBUG_MODE) logger.log('Requesting system logs...');
    sendEncryptedMessage({ 
      action: 'get_system_logs', 
      limit 
    });
  };

  const restartServer = () => {
    if (DEBUG_MODE) logger.log('Requesting server restart...');
    sendEncryptedMessage({ action: 'restart_server' });
  };

  const backupDatabase = () => {
    if (DEBUG_MODE) logger.log('Requesting database backup...');
    sendEncryptedMessage({ action: 'backup_database' });
  };

  const restoreDatabase = (backupId: string) => {
    if (DEBUG_MODE) logger.log('Requesting database restore:', backupId);
    sendEncryptedMessage({ 
      action: 'restore_database', 
      backup_id: backupId 
    });
  };

  return {
    getAdminStats,
    getUserList,
    createUser,
    banUser,
    unbanUser,
    promoteUser,
    demoteUser,
    getSystemLogs,
    restartServer,
    backupDatabase,
    restoreDatabase,
  };
}; 