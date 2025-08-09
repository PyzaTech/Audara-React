import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from './WebSocketContext';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AdminContextType = {
  isAdmin: boolean | null;
  loading: boolean;
  checkAdminStatus: () => void;
  setAdminStatusFromLogin: (isAdmin: boolean) => void;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { sendEncryptedMessage, addMessageListener, removeMessageListener, isConnected } = useWebSocket();

  const checkAdminStatus = () => {
    if (!isConnected) return;
    
    if (DEBUG_MODE) logger.log('Checking admin status...');
    setLoading(true);
    sendEncryptedMessage({ action: 'check_admin' });
  };

  const setAdminStatusFromLogin = (adminStatus: boolean) => {
    if (DEBUG_MODE) logger.log('Setting admin status from login:', adminStatus);
    setIsAdmin(adminStatus);
    setLoading(false);
    
    AsyncStorage.setItem('isAdmin', JSON.stringify(adminStatus)).catch(error => {
      if (DEBUG_MODE) logger.error('Error saving admin status to storage:', error);
    });
  };

  useEffect(() => {
    const initializeAdminStatus = async () => {
      try {
        const storedAdminStatus = await AsyncStorage.getItem('isAdmin');
        if (storedAdminStatus !== null) {
          const isAdmin = JSON.parse(storedAdminStatus);
          if (DEBUG_MODE) logger.log('Admin status loaded from storage:', isAdmin);
          setIsAdmin(isAdmin);
          setLoading(false);
          return;
        }
      } catch (error) {
        if (DEBUG_MODE) logger.error('Error loading admin status from storage:', error);
      }

      if (!isConnected) {
        setIsAdmin(null);
        setLoading(false);
        return;
      }

      const handleAdminResponse = (data: any) => {
        if (DEBUG_MODE) logger.log('Admin response received:', data);
        const adminStatus = data.is_admin || false;
        setIsAdmin(adminStatus);
        setLoading(false);
        
        AsyncStorage.setItem('isAdmin', JSON.stringify(adminStatus)).catch(error => {
          if (DEBUG_MODE) logger.error('Error saving admin status to storage:', error);
        });
      };

      addMessageListener('check_admin', handleAdminResponse);
      checkAdminStatus();

      return () => {
        removeMessageListener('check_admin', handleAdminResponse);
      };
    };

    initializeAdminStatus();
  }, [isConnected]);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        loading,
        checkAdminStatus,
        setAdminStatusFromLogin,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
} 