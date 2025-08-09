import { router } from 'expo-router';
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BottomNavBarProps = {
  currentTab: 'Home' | 'Search' | 'Library' | 'Admin';
  onTabChange: (tab: 'Home' | 'Search' | 'Library' | 'Admin') => void;
  isAdmin?: boolean;
};

export default function BottomNavBar({ currentTab, onTabChange, isAdmin = false }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const lastPressTime = useRef(0);

  const handlePress = (tab: 'Home' | 'Search' | 'Library' | 'Admin') => {
    // Prevent rapid clicking (debounce)
    const now = Date.now();
    if (now - lastPressTime.current < 300) {
      return;
    }
    lastPressTime.current = now;

    // Don't navigate if already on the current tab
    if (tab === currentTab) {
      return;
    }

    onTabChange(tab);
    router.push(`screens/${tab}`); // push for smoother transitions
  };

  return (
    <View style={[styles.navbar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <NavButton
        iconName="home"
        label="Home"
        onPress={() => handlePress('Home')}
        active={currentTab === 'Home'}
      />
      <NavButton
        iconName="search"
        label="Search"
        onPress={() => handlePress('Search')}
        active={currentTab === 'Search'}
      />
      <NavButton
        iconName="library"
        label="Library"
        onPress={() => handlePress('Library')}
        active={currentTab === 'Library'}
      />
      {isAdmin && (
        <NavButton
          iconName="shield-checkmark"
          label="Admin"
          onPress={() => handlePress('Admin')}
          active={currentTab === 'Admin'}
        />
      )}
    </View>
  );
}

type NavButtonProps = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
};

const NavButton = ({ iconName, label, onPress, active }: NavButtonProps) => (
  <TouchableOpacity style={styles.navButton} onPress={onPress}>
    <Ionicons
      name={iconName}
      size={24}
      color={active ? '#1DB954' : 'white'}
    />
    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#282828',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopColor: '#333',
    borderTopWidth: 1,
    minHeight: 80,
    paddingTop: 8,
    paddingBottom: 12,
  },
  navButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  navLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  navLabelActive: {
    color: '#1DB954',
    fontWeight: 'bold',
  },
});
