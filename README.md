# audara

Audara lets you search, stream, or download music, like Spotify, but with auto-downloads for missing tracks.

## Features
- Stream music
- AES-256 encryption for all data (except for the initial session-key that the server sends to the client)
- Auto-download missing tracks (Still in development, on audara-server)

## TODO
- Search for music
- Download music
- Allow accounts to favourite songs
- Allow creations of playlists
- Fixed up ui's
- Make a more unique ui (right now its close to spotify)
- Speed up the overall load times for the app

## How to build on Android

1. cd android
2. gradlew assembleRelease
3. adb install app/build/outputs/apk/release/app-release.apk

One Line Command: `cd android && gradlew assembleRelease && adb install app/build/outputs/apk/release/app-release.apk && cd ..`