import { View, Text, Pressable, StyleSheet, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWebSocket } from '../context/WebSocketContext';

export default function StartScreen() {
  const router = useRouter();
  const { disconnect } = useWebSocket();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      <Text style={styles.logo}>Audara</Text>

      <View style={styles.buttonGroup}>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/screens/SignUp')}>
          <Text style={styles.primaryButtonText}>Sign Up Free</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/screens/Login')}>
          <Text style={styles.secondaryButtonText}>Log In</Text>
        </Pressable>

        <Pressable style={styles.googleButton} onPress={() => alert('Google Login Coming Soon')}>
          <View style={styles.googleButtonContent}>
            <FontAwesome name="google" size={20} color="#000" style={styles.googleIcon} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.footerText}>
        By continuing, you agree to Audara’s Terms of Service and Privacy Policy.
      </Text>

      {/* Change Server Button */}
      <Pressable
        style={styles.changeServerButton}
        onPress={async () => {
          try {
            await disconnect();
            await AsyncStorage.multiRemove(['username', 'profilePictureUrl', 'password', 'server_url']);
            console.log('Disconnected and cleared storage');

            // Wait 300ms before navigating to ensure cleanup settles
            setTimeout(() => {
              router.replace('/screens/SelectServer');
            }, 300);
          } catch (e) {
            console.error('Error during disconnect and storage clear:', e);
          }
        }}


      >
        <Text style={styles.changeServerText}>Change Server</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    color: '#1DB954',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 60,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#1DB954',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 15,
    width: '80%',
    maxWidth: Platform.OS === 'web' ? 300 : undefined, // Limit width on web
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 15,
    width: '80%',
    maxWidth: Platform.OS === 'web' ? 300 : undefined, // Limit width on web
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '80%',
    maxWidth: Platform.OS === 'web' ? 300 : undefined, // Limit width on web
    alignItems: 'center',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    marginTop: 50,
    color: '#b3b3b3',
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: 20,
  },
  changeServerButton: {
    position: 'absolute',
    bottom: 30,
  },
  changeServerText: {
    color: '#1DB954',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
