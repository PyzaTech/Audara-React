import { router } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BottomNavBarProps = {
  currentTab: 'Home' | 'Search' | 'Library';
  onTabChange: (tab: 'Home' | 'Search' | 'Library') => void;
};

export default function BottomNavBar({ currentTab, onTabChange }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();

  const handlePress = (tab: 'Home' | 'Search' | 'Library') => {
    onTabChange(tab);
    router.replace(`screens/${tab}`); // replace with tab route
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
