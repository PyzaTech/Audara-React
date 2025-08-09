import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWebSocket } from '../context/WebSocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../utils/_logger';
import { DEBUG_MODE } from '../config/debug';
import { useAdminService } from '../services/adminService';

type User = {
  id: string;
  username: string;
  isAdmin: boolean;
  isBanned: boolean;
  lastSeen: string;
  joinDate: string;
};

export default function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    isAdmin: false,
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const { addMessageListener, removeMessageListener, isConnected } = useWebSocket();
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

    const handleUserListResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('User list received:', data);
      setUsers(data.users || []);
      setLoading(false);
      setRefreshing(false);
    };

    const handleBanUserResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Ban user response:', data);
      if (data.success) {
        const bannedUser = users.find(user => user.id === data.user_id);
        const username = bannedUser?.username || data.username || 'Unknown user';
        Alert.alert('Success', `User ${username} has been banned.`);
        fetchUsers();
      } else {
        Alert.alert('Error', data.error || 'Failed to ban user');
      }
    };

    const handleUnbanUserResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Unban user response:', data);
      if (data.success) {
        const unbannedUser = users.find(user => user.id === data.user_id);
        const username = unbannedUser?.username || data.username || 'Unknown user';
        Alert.alert('Success', `User ${username} has been unbanned.`);
        fetchUsers();
      } else {
        Alert.alert('Error', data.error || 'Failed to unban user');
      }
    };

      const handlePromoteUserResponse = (data: any) => {
    if (DEBUG_MODE) logger.log('Promote user response:', data);
    if (data.success) {
      const promotedUser = users.find(user => user.id === data.user_id);
      const username = promotedUser?.username || data.username || 'Unknown user';
      Alert.alert('Success', `User ${username} has been promoted to admin.`);
      fetchUsers();
    } else {
      Alert.alert('Error', data.error || 'Failed to promote user');
    }
  };

    const handleDemoteUserResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Demote user response:', data);
      if (data.success) {
        const demotedUser = users.find(user => user.id === data.user_id);
        const username = demotedUser?.username || data.username || 'Unknown user';
        Alert.alert('Success', `User ${username} has been demoted from admin.`);
        fetchUsers();
      } else {
        Alert.alert('Error', data.error || 'Failed to demote user');
      }
    };

    const handleCreateUserResponse = (data: any) => {
      if (DEBUG_MODE) logger.log('Create user response:', data);
      setCreatingUser(false);
      if (data.success) {
        Alert.alert('Success', `User ${data.username} has been created successfully.`);
        setCreateModalVisible(false);
        setNewUser({ username: '', password: '', isAdmin: false });
        fetchUsers();
      } else {
        Alert.alert('Error', data.error || 'Failed to create user');
      }
    };

    addMessageListener('get_user_list', handleUserListResponse);
    addMessageListener('ban_user', handleBanUserResponse);
    addMessageListener('unban_user', handleUnbanUserResponse);
    addMessageListener('promote_user', handlePromoteUserResponse);
    addMessageListener('demote_user', handleDemoteUserResponse);
    addMessageListener('create_user', handleCreateUserResponse);

    fetchUsers();

    return () => {
      removeMessageListener('get_user_list', handleUserListResponse);
      removeMessageListener('ban_user', handleBanUserResponse);
      removeMessageListener('unban_user', handleUnbanUserResponse);
      removeMessageListener('promote_user', handlePromoteUserResponse);
      removeMessageListener('demote_user', handleDemoteUserResponse);
      removeMessageListener('create_user', handleCreateUserResponse);
    };
  }, [isConnected]);

  const fetchUsers = () => {
    setRefreshing(true);
    adminService.getUserList();
  };

  const handleBanUser = (user: User) => {
    Alert.alert(
      'Ban User',
      `Are you sure you want to ban ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Ban', 
          style: 'destructive',
          onPress: () => adminService.banUser(user.id, 'Banned by admin')
        }
      ]
    );
  };

  const handleUnbanUser = (user: User) => {
    Alert.alert(
      'Unban User',
      `Are you sure you want to unban ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unban', 
          onPress: () => adminService.unbanUser(user.id)
        }
      ]
    );
  };

  const handlePromoteUser = (user: User) => {
    Alert.alert(
      'Promote User',
      `Are you sure you want to promote ${user.username} to admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Promote', 
          onPress: () => adminService.promoteUser(user.id)
        }
      ]
    );
  };

  const handleDemoteUser = (user: User) => {
    Alert.alert(
      'Demote User',
      `Are you sure you want to demote ${user.username} from admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Demote', 
          style: 'destructive',
          onPress: () => adminService.demoteUser(user.id)
        }
      ]
    );
  };

  const handleCreateUser = () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setCreatingUser(true);
    adminService.createUser(newUser.username, newUser.password, newUser.isAdmin);
  };

  const resetCreateForm = () => {
    setNewUser({ username: '', password: '', isAdmin: false });
    setCreateModalVisible(false);
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={[styles.userCard, item.isBanned && styles.bannedUser]}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.username}>{item.username}</Text>
          <View style={styles.userBadges}>
            {item.isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#1DB954" />
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
            {item.isBanned && (
              <View style={styles.bannedBadge}>
                <Ionicons name="ban" size={12} color="#ff4444" />
                <Text style={styles.bannedText}>Banned</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.userDetails}>Joined: {item.joinDate}</Text>
        <Text style={styles.userDetails}>Last seen: {item.lastSeen}</Text>
      </View>
      
      <View style={styles.userActions}>
        {item.isBanned ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.unbanButton]}
            onPress={() => handleUnbanUser(item)}
          >
            <Ionicons name="checkmark-circle" size={16} color="#1DB954" />
            <Text style={styles.unbanText}>Unban</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.banButton]}
            onPress={() => handleBanUser(item)}
          >
            <Ionicons name="ban" size={16} color="#ff4444" />
            <Text style={styles.banText}>Ban</Text>
          </TouchableOpacity>
        )}
        
        {item.isAdmin ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.demoteButton]}
            onPress={() => handleDemoteUser(item)}
          >
            <Ionicons name="arrow-down" size={16} color="#ffaa00" />
            <Text style={styles.demoteText}>Demote</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.promoteButton]}
            onPress={() => handlePromoteUser(item)}
          >
            <Ionicons name="arrow-up" size={16} color="#1DB954" />
            <Text style={styles.promoteText}>Promote</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity onPress={fetchUsers} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.userList}
        refreshing={refreshing}
        onRefresh={fetchUsers}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Create User Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={resetCreateForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New User</Text>
              <TouchableOpacity onPress={resetCreateForm}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                value={newUser.username}
                onChangeText={(text) => setNewUser({ ...newUser, username: text })}
                placeholder="Enter username"
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={newUser.password}
                onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                placeholder="Enter password"
                placeholderTextColor="#666"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setNewUser({ ...newUser, isAdmin: !newUser.isAdmin })}
            >
              <View style={[styles.checkbox, newUser.isAdmin && styles.checkboxChecked]}>
                {newUser.isAdmin && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.checkboxLabel}>Admin privileges</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={resetCreateForm}
                disabled={creatingUser}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, creatingUser && styles.disabledButton]}
                onPress={handleCreateUser}
                disabled={creatingUser}
              >
                {creatingUser ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.createButtonText}>Create User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  userList: {
    padding: 20,
  },
  userCard: {
    backgroundColor: '#282828',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bannedUser: {
    backgroundColor: '#2a1a1a',
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  username: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  adminText: {
    color: '#1DB954',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  bannedText: {
    color: '#ff4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userDetails: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 4,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    gap: 4,
  },
  banButton: {
    backgroundColor: '#2a1a1a',
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  banText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  unbanButton: {
    backgroundColor: '#1a2a1a',
    borderColor: '#1DB954',
    borderWidth: 1,
  },
  unbanText: {
    color: '#1DB954',
    fontSize: 14,
    fontWeight: 'bold',
  },
  promoteButton: {
    backgroundColor: '#1a2a1a',
    borderColor: '#1DB954',
    borderWidth: 1,
  },
  promoteText: {
    color: '#1DB954',
    fontSize: 14,
    fontWeight: 'bold',
  },
  demoteButton: {
    backgroundColor: '#2a2a1a',
    borderColor: '#ffaa00',
    borderWidth: 1,
  },
  demoteText: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#282828',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  checkboxLabel: {
    color: 'white',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#1DB954',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
}); 