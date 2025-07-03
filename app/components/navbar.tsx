import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type NavBarProps = {
  currentTab: 'home' | 'search' | 'library';
  onTabChange: (tab: 'home' | 'search' | 'library') => void;
};

export default function BottomNavBar({ currentTab, onTabChange }: NavBarProps) {
  return (
    <View style={styles.navBar}>
      <NavItem
        label="Home"
        active={currentTab === 'home'}
        onPress={() => onTabChange('home')}
      />
      <NavItem
        label="Search"
        active={currentTab === 'search'}
        onPress={() => onTabChange('search')}
      />
      <NavItem
        label="Your Library"
        active={currentTab === 'library'}
        onPress={() => onTabChange('library')}
      />
    </View>
  );
}

function NavItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.navItem}>
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 60,
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#282828',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  navTextActive: {
    color: '#1DB954',
    fontWeight: 'bold',
  },
});
