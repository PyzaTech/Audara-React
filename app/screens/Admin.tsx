import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useWebSocket } from '../context/WebSocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';
import { useAdmin } from '../context/AdminContext';
import { useAdminService } from '../services/adminService';

const formatUptime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60); // Floor to whole seconds
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export default function AdminScreen() {
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSongs: 0,
    serverUptime: 0,
    username: '',
  });

  const { addMessageListener, removeMessageListener, isConnected } = useWebSocket();
  const { isAdmin, loading } = useAdmin();
  const adminService = useAdminService();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isConnected) {
      const timer = setTimeout(() => {
        try {
          router.push('/screens/LoadingScreen');
        } catch (error) {
          if (DEBUG_MODE) logger.log('Navigation error:', error);
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    const handleAdminStatsResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Admin stats received:', data);
      setAdminStats(data.stats || {
        totalUsers: 0,
        activeUsers: 0,
        totalSongs: 0,
        serverUptime: 0
      });
    };

    addMessageListener('admin_stats', handleAdminStatsResponse);

    // Fetch stats when component mounts
    fetchAdminStats();

    return () => {
      removeMessageListener('admin_stats', handleAdminStatsResponse);
    };
  }, [isConnected]);

  // Auto-refresh admin stats every 3 seconds only when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (!isConnected || isAdmin === false) return;

      const interval = setInterval(() => {
        fetchAdminStats();
      }, 3000);

      return () => clearInterval(interval);
    }, [isConnected, isAdmin])
  );

  useEffect(() => {
    if (isAdmin === false) {
      Alert.alert(
        'Access Denied',
        'You do not have administrator privileges.',
        [{ text: 'OK', onPress: () => router.push('/screens/Home') }]
      );
    }
  }, [isAdmin]);

  const fetchAdminStats = async () => {
    await adminService.getAdminStats();
  };

  const handleUserManagement = () => {
    router.push('/screens/UserManagement');
  };

  const handleServerSettings = () => {
    Alert.alert('Server Settings', 'Server settings feature coming soon!');
  };

  const handleSystemLogs = () => {
    Alert.alert('System Logs', 'System logs feature coming soon!');
  };

  const handleBackupRestore = () => {
    Alert.alert('Backup & Restore', 'Backup and restore feature coming soon!');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/screens/Home')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={fetchAdminStats} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Server Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color="#1DB954" />
              <Text style={styles.statNumber}>{adminStats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="person" size={32} color="#1DB954" />
              <Text style={styles.statNumber}>{adminStats.activeUsers}</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="musical-notes" size={32} color="#1DB954" />
              <Text style={styles.statNumber}>{adminStats.totalSongs}</Text>
              <Text style={styles.statLabel}>Total Songs</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={32} color="#1DB954" />
              <Text style={styles.statNumber}>{formatUptime(adminStats.serverUptime)}</Text>
              <Text style={styles.statLabel}>Uptime</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Administrative Actions</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={handleUserManagement}>
            <View style={styles.actionIcon}>
              <Ionicons name="people-circle" size={32} color="#1DB954" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>User Management</Text>
              <Text style={styles.actionDescription}>Manage user accounts and permissions</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleServerSettings}>
            <View style={styles.actionIcon}>
              <Ionicons name="settings" size={32} color="#1DB954" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Server Settings</Text>
              <Text style={styles.actionDescription}>Configure server parameters</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleSystemLogs}>
            <View style={styles.actionIcon}>
              <Ionicons name="document-text" size={32} color="#1DB954" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>System Logs</Text>
              <Text style={styles.actionDescription}>View system logs and diagnostics</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleBackupRestore}>
            <View style={styles.actionIcon}>
              <Ionicons name="cloud-upload" size={32} color="#1DB954" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Backup & Restore</Text>
              <Text style={styles.actionDescription}>Manage system backups</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#282828',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  statNumber: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 4,
  },
  actionsContainer: {
    padding: 20,
  },
  actionCard: {
    backgroundColor: '#282828',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionDescription: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 2,
  },
}); 