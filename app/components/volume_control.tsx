import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function VolumeControl({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPress} style={styles.button} activeOpacity={0.7}>
        <Ionicons name="volume-high" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 40,
  },
  button: {
    padding: 8,
  },
});
