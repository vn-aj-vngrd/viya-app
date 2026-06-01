# Viya APK Requirements

This file is for people installing and testing the provided Android APK.
It does not require building the app locally.

## Reference Versions

- Viya native app: `apps/native`
- Expo package: `expo@~56.0.3`
- Expo SDK: 56
- React Native: 0.85.3
- Android package: `com.vnajvngrd.viya`

The Android requirement is based on Expo SDK 56, which lists Android 7+ as the minimum supported Android version in the [Expo SDK reference](https://docs.expo.dev/versions/latest/#support-for-android-and-ios-versions).

## APK Source

The APK is the Expo preview build provided by the Viya team. Install the shared `.apk` file directly on an Android device.

## Android Device Requirements

- Android 7.0 or newer, based on Expo SDK 56 support.
- Physical Android phone or tablet recommended for judging.
- Stable internet connection for authentication, Convex data sync, AI responses, and remote assets.
- Enough storage to download and install the APK.
- Ability to install apps from outside the Google Play Store.
- Google account access if using the Google sign-in path.

## What Is Not Required

- Expo Go is not required.
- Android Studio is not required to install the preview APK.
- A Google Play Store listing is not required.
- A development server is not required after the APK is installed.

## Install The APK

1. Download the APK from the EAS build link or from the shared file location.
2. Open the downloaded `.apk` file on the Android device.
3. If Android blocks the install, tap the settings prompt for the app used to open the APK, such as Chrome, Drive, Gmail, or Files.
4. Enable **Allow from this source** or **Install unknown apps** for that app.
5. Return to the APK and tap **Install**.
6. Open **Viya** after installation finishes.

On many Android devices, the manual setting is available at:

```text
Settings > Apps > Special app access > Install unknown apps
```

Choose the browser, file manager, email app, or Drive app used to open the APK, then enable installation from that source.

## First Run Checklist

- The Viya app launches without crashing.
- The sign-in screen appears.
- Google sign-in can open the account picker and complete authentication.
- The home dashboard loads after sign-in.
- Trip, itinerary, budget, vault, readiness, and AI chat screens can be opened.
- The device remains connected to the internet while testing.

## Troubleshooting

### Android says the app cannot be installed

Check that the device is running Android 7.0 or newer and that APK installs from the current source are allowed.

### The APK downloads but does not open

Open the APK from the Android **Files** app or download it again using Chrome. Some email and chat apps block direct APK installs.

### Sign-in or app data does not load

Confirm the device has internet access. The preview build depends on the configured Clerk and Convex preview environment values.

### The installed app is outdated

Uninstall the old Viya APK, download the latest Expo preview build APK, and install it again.
