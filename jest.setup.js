jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Native-backed Expo modules aren't auto-mocked by jest-expo in this SDK —
// provide inert stand-ins so component smoke tests can render screens.
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ volume: 1, seekTo: () => {}, play: () => {} }),
  setAudioModeAsync: async () => {},
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  scheduleNotificationAsync: async () => 'mock-id',
  cancelAllScheduledNotificationsAsync: async () => {},
  setNotificationChannelAsync: async () => {},
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: async () => true,
}));
