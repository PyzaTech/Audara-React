import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import CryptoJS from 'crypto-js';
import * as ExpoCrypto from 'expo-crypto';
import { logger } from '../utils/_logger';

type MessageListener = (data: any) => void;

type WSContextType = {
  ws: WebSocket | null;
  connect: (url: string) => void;
  sendMessage: (message: string) => void;
  sendEncryptedMessage: (obj: any) => void;
  lastMessage: string | null;
  isConnected: boolean;
  disconnect: () => void;
  sessionKey: CryptoJS.lib.WordArray | null;
  decryptMessage: (message: string, key: CryptoJS.lib.WordArray) => string | null;
  addMessageListener: (action: string, listener: MessageListener) => void;
  removeMessageListener: (action: string, listener: MessageListener) => void;
};

const WebSocketContext = createContext<WSContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ws = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionKey, setSessionKey] = useState<CryptoJS.lib.WordArray | null>(null);
  const sessionKeyRef = useRef<CryptoJS.lib.WordArray | null>(null);
  const heartbeatTimer = useRef<any>(null);

  const messageListenersByAction = useRef<Map<string, MessageListener[]>>(new Map());

  const HEARTBEAT_INTERVAL = 1000;

  const addMessageListener = (action: string, listener: MessageListener) => {
    if (!messageListenersByAction.current.has(action)) {
      messageListenersByAction.current.set(action, []);
    }
    messageListenersByAction.current.get(action)!.push(listener);
  };

  const removeMessageListener = (action: string, listener: MessageListener) => {
    const listeners = messageListenersByAction.current.get(action);
    if (!listeners) return;
    messageListenersByAction.current.set(
      action,
      listeners.filter((l) => l !== listener)
    );
  };

  const startHeartbeat = () => {
    if (!sessionKeyRef.current) {
      logger.warn('Session key is null, cannot start heartbeat');
      return;
    }

    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }

    logger.log('Heartbeat started');

    heartbeatTimer.current = setInterval(async () => {
      const heartbeatObj = { action: 'heartbeat' };
      const heartbeatJson = JSON.stringify(heartbeatObj);

      if (ws.current && isConnected && sessionKeyRef.current) {
        const encryptedHeartbeat = await encryptMessage(heartbeatJson, sessionKeyRef.current);
        ws.current.send(encryptedHeartbeat);
      }
    }, HEARTBEAT_INTERVAL);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
      logger.log('Heartbeat stopped');
    }
  };

  const connect = (url: string) => {
    if (ws.current) {
      ws.current.close();
    }

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setIsConnected(true);
      logger.log('WebSocket connected');
    };

    ws.current.onmessage = async (event) => {
      logger.log('📥 Raw WebSocket message received:', event.data);

      try {
        const parsed = JSON.parse(event.data);
        logger.log('✅ Parsed unencrypted JSON message:', parsed);

        if (parsed.type === 'session-key' && parsed.key) {
          const keyWordArray = CryptoJS.enc.Base64.parse(parsed.key);
          setSessionKey(keyWordArray);
          sessionKeyRef.current = keyWordArray;
          logger.log('🔑 Session key received and stored');
          return;
        }

        if (parsed.iv && parsed.data) {
          if (!sessionKeyRef.current) {
            logger.warn('No session key available for decryption.');
            return;
          }

          const decrypted = decryptMessage(event.data, sessionKeyRef.current);
          if (!decrypted) {
            logger.error('Failed to decrypt message.');
            return;
          }

          let decryptedData;
          try {
            decryptedData = JSON.parse(decrypted);
          } catch (err) {
            logger.error('Decrypted message is not valid JSON:', err);
            return;
          }

          logger.log('✅ Successfully decrypted message:', decryptedData);

          setLastMessage(JSON.stringify(decryptedData));

          const action = decryptedData.action || 'default';
          const listeners = messageListenersByAction.current.get(action) || [];

          if (listeners.length === 0) {
            logger.warn(`⚠️ No listeners registered for action: ${action}`);
          }

          console.log(`📨 Dispatching message to ${listeners.length} listeners for action: ${action}`);
          listeners.forEach((listener) => listener(decryptedData));
        } else {
          logger.log('📬 Dispatching unencrypted message:', parsed);

          setLastMessage(JSON.stringify(parsed));

          const action = parsed.action || 'default';
          const listeners = messageListenersByAction.current.get(action) || [];

          if (listeners.length === 0) {
            logger.warn(`⚠️ No listeners registered for action: ${action}`);
          }

          console.log(`📨 Dispatching unencrypted message to ${listeners.length} listeners for action: ${action}`);
          listeners.forEach((listener) => listener(parsed));
        }
      } catch (err) {
        logger.error('Error parsing WebSocket message:', err);
      }
    };

    ws.current.onerror = (error) => {
      logger.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      logger.log('WebSocket disconnected');
      setIsConnected(false);
      setSessionKey(null);
      sessionKeyRef.current = null;
      stopHeartbeat();

      setTimeout(() => {
        if (ws.current) {
          logger.log('Attempting to reconnect...');
          connect(ws.current.url);
        }
      }, 3000);
    };
  };

  const sendMessage = async (message: string) => {
    if (ws.current && isConnected) {
      if (sessionKeyRef.current) {
        const encrypted = await encryptMessage(message, sessionKeyRef.current);
        ws.current.send(encrypted);
      } else {
        ws.current.send(message);
      }
    } else {
      logger.warn('WebSocket not connected');
    }
  };

  const sendEncryptedMessage = async (messageObj: object) => {
    if (!ws.current || !isConnected) {
      logger.warn('WebSocket not connected');
      return;
    }
    if (!sessionKeyRef.current) {
      logger.warn('Session key is missing, cannot send encrypted message');
      return;
    }

    const jsonString = JSON.stringify(messageObj);
    logger.log('Sending:', jsonString);
    const encryptedPayload = await encryptMessage(jsonString, sessionKeyRef.current);
    ws.current.send(encryptedPayload);
  };

  const disconnect = () => {
    console.log("Websocket disconnect logic called")

    if (ws.current) {
      console.log("Websocket found, disconnecting")
      ws.current.close();
      ws.current = null;
      setSessionKey(null);
      sessionKeyRef.current = null;
    }
    stopHeartbeat();

  };

  useEffect(() => {
    if (sessionKey) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }
  }, [sessionKey]);

  return (
    <WebSocketContext.Provider
      value={{
        ws: ws.current,
        connect,
        sendMessage,
        sendEncryptedMessage,
        lastMessage,
        isConnected,
        disconnect,
        sessionKey,
        decryptMessage,
        addMessageListener,
        removeMessageListener,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

function decryptMessage(encryptedJson: string, sessionKey: CryptoJS.lib.WordArray) {
  try {
    const encryptedObj = JSON.parse(encryptedJson);
    if (!encryptedObj.iv || !encryptedObj.data) {
      throw new Error('Invalid encrypted message format');
    }
    const iv = CryptoJS.enc.Base64.parse(encryptedObj.iv);
    const ciphertext = encryptedObj.data;

    const decrypted = CryptoJS.AES.decrypt(ciphertext, sessionKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    return decryptedText;
  } catch (e) {
    logger.error('Failed to decrypt message:', e);
    return null;
  }
}

async function encryptMessage(plainText: string, sessionKey: CryptoJS.lib.WordArray) {
  const ivBytes = await ExpoCrypto.getRandomBytesAsync(16);
  const iv = CryptoJS.lib.WordArray.create(ivBytes);

  const encrypted = CryptoJS.AES.encrypt(plainText, sessionKey, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return JSON.stringify({
    iv: CryptoJS.enc.Base64.stringify(iv),
    data: encrypted.toString(),
  });
}

