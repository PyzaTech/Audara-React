import { router } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BottomNavBarProps = {
  currentTab: 'home' | 'search' | 'library';
  onTabChange: (tab: 'home' | 'search' | 'library') => void;
};

export default function BottomNavBar({ currentTab, onTabChange }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();

  const handlePress = (tab: 'home' | 'search' | 'library') => {
    onTabChange(tab);
    router.replace(tab); // replace with tab route
  };

  return (
    <View style={[styles.navbar, { paddingBottom: insets.bottom }]}>
      <NavButton
        iconName="home"
        label="Home"
        onPress={() => handlePress('home')}
        active={currentTab === 'home'}
      />
      <NavButton
        iconName="search"
        label="Search"
        onPress={() => handlePress('search')}
        active={currentTab === 'search'}
      />
      <NavButton
        iconName="library"
        label="Library"
        onPress={() => handlePress('library')}
        active={currentTab === 'library'}
      />
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
    height: 80,
    backgroundColor: '#282828',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopColor: '#333',
    borderTopWidth: 1,
  },
  navButton: {
    alignItems: 'center',
    flex: 1,
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
