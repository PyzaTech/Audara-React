import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useWebSocket } from '../context/WebSocketContext';
import { useAdmin } from '../context/AdminContext';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';

export default function LoadingScreen() {
  const router = useRouter();
  const { connect, disconnect, sessionKey, isConnected, sendEncryptedMessage, addMessageListener, removeMessageListener } = useWebSocket();
  const { setAdminStatusFromLogin } = useAdmin();

  useEffect(() => {
    let initialized = false;

    async function initialize() {
      const url = await AsyncStorage.getItem('server_url');
      const username = await AsyncStorage.getItem('username');
      const password = await AsyncStorage.getItem('password');

      if (!url || url === "") {
        router.push('/screens/SelectServer');
        return;
      }

      const isValid = await testConnection(url);

      if (!isValid) {
        router.push('/screens/SelectServer');
        return;
      }

      connect(url);
      initialized = true;

      // The rest will wait for the session key in the next effect
    }

    initialize();

    // return () => disconnect();
  }, []);

// Effect to listen for login messages once sessionKey is ready
useEffect(() => {
  if (!sessionKey) return;

  const handleLoginResponse = (data: any) => {
    console.log('🔐 Login response received:', data);

    if (data.success) {
      console.log('✅ Login successful:', data);

      AsyncStorage.setItem('username', data.username);
      AsyncStorage.setItem('password', data.password);

      const adminStatus = data.isAdmin !== undefined ? data.isAdmin : data.is_admin;
      
      if (adminStatus !== undefined) {
        if (DEBUG_MODE) logger.log('LoadingScreen - Setting admin status from login response:', adminStatus);
        setAdminStatusFromLogin(adminStatus);
      }

      router.push('/screens/Home');
    } else {
      console.log('❌ Login failed:', data.error);
      Alert.alert('Login Failed', data.error || 'Unknown error');
      router.push('/screens/Start');
    }
  };

  addMessageListener('login', handleLoginResponse);

  return () => {
    removeMessageListener('login', handleLoginResponse);
  };
}, [sessionKey, addMessageListener, removeMessageListener, router]);

// Effect to auto login when connected and sessionKey ready
useEffect(() => {
  if (isConnected && sessionKey) {
    autoLogin();
  }
}, [isConnected, sessionKey]);


  const autoLogin = async () => {
    const username = await AsyncStorage.getItem('username');
    const password = await AsyncStorage.getItem('password');

    if (!username || !password) {
      router.push('/screens/Start');
      return;
    }

    logger.log(`🔐 Auto logging in with username: ${username} password: ${password}`);

    sendEncryptedMessage({
      action: 'login',
      username: username.trim(),
      password: password.trim(),
    });

    // You can send the login message here if you want:
    // Example:
    // sendEncryptedMessage({ action: 'login', username, password });

  };



  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}

async function testConnection(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch (e) {
      console.error('Connection test failed:', e);
      resolve(false);
    }
  });
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});
