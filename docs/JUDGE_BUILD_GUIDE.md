# Build Guide — Viya APK for Judges

This guide walks you through building a Viya Android APK using Expo EAS Build (preview profile) for distribution to judges.

---

## Prerequisites

1. **Node.js** (v18+) and **Bun** (v1.3.5+)
2. **EAS CLI** installed globally:
   ```bash
   npm install -g eas-cli
   ```
3. **Expo account** — sign up at https://expo.dev/signup if you don't have one
4. **Log in to EAS**:
   ```bash
   eas login
   ```
5. **Link the project** (first time only, run from `apps/native/`):
   ```bash
   eas init
   ```
   This links the app to your Expo project. Select "Create a new project" when prompted.

---

## Step 1: Install Dependencies

From the project root:

```bash
bun install
```

---

## Step 2: Set Environment Secrets

The app requires two environment variables at build time. Set them as EAS Secrets:

```bash
eas secret:create --name EXPO_PUBLIC_CONVEX_URL --value "https://pastel-caterpillar-63.convex.cloud"
eas secret:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_test_bGFyZ2UtbWFydGVuLTEyLmNsZXJrLmFjY291bnRzLmRldiQ"
```

> **Note:** Run these from the `apps/native/` directory. Each secret only needs to be created once.

Verify secrets are set:

```bash
eas secret:list
```

---

## Step 3: Build the APK

### Option A: Cloud Build (Recommended)

Builds on Expo's cloud infrastructure — no Android SDK needed locally.

```bash
# From apps/native/
bun run build:preview
```

Or directly:

```bash
eas build -p android --profile preview
```

The build takes ~10-20 minutes. You'll get a download link when it's done.

### Option B: Local Build

Builds on your machine — requires Android SDK and Java 17.

```bash
# From apps/native/
bun run build:preview:local
```

Or directly:

```bash
eas build -p android --profile preview --local
```

The `.apk` file will be saved to the project directory when complete.

---

## Step 4: Download the APK

### Cloud Build

1. After the build completes, EAS prints a download URL
2. You can also find it at: https://expo.dev — navigate to your project > Builds
3. Download the `.apk` file

### Local Build

The APK path is printed at the end of the build output, typically:

```
apps/native/build-XXXXXXXXXXXXXX.apk
```

---

## Step 5: Distribute to Judges

### Direct APK Install

1. Share the `.apk` file via Google Drive, email, or any file sharing method
2. Judges install it on their Android device:
   - Enable **"Install from unknown sources"** in device settings
   - Open the `.apk` file to install
3. Launch the **Viya** app

### Via Expo Dashboard

1. Go to your project on https://expo.dev
2. Navigate to **Builds** > select the preview build
3. Share the download link with judges
4. Judges download and install the APK

---

## Step 6: Verify the Build

Before distributing, verify the APK works:

- [ ] App launches without crashes
- [ ] Clerk authentication flow works (sign in / sign up)
- [ ] Convex backend connects (data loads correctly)
- [ ] AI features respond (if applicable)
- [ ] Navigation between screens works
- [ ] Maps, camera, and native features work

---

## Updating the Build

When you make code changes and need a new APK:

```bash
# From apps/native/
eas build -p android --profile preview
```

Each build gets a new version automatically. Share the new APK with judges.

For **over-the-air (OTA) updates** without a new APK (JS-only changes), consider setting up `expo-updates` in the future.

---

## Troubleshooting

### Build fails with "module not found"

Ensure dependencies are installed and the monorepo is set up correctly:

```bash
bun install
eas build -p android --profile preview --clear-cache
```

### Build fails with signing errors

EAS handles Android signing automatically. If issues persist:

```bash
eas credentials
```

### APK crashes on launch

Check that environment secrets are set correctly:

```bash
eas secret:list
```

Verify `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` are present.

### "Install from unknown sources" blocked

On newer Android versions, go to **Settings > Apps > Special access > Install unknown apps** and enable it for the file manager or browser used to open the APK.

### Build takes too long

Cloud builds can take 10-20 minutes depending on queue. Use `--local` for faster builds if you have the Android SDK set up.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `eas login` | Log in to Expo |
| `eas init` | Link project (first time) |
| `eas secret:create` | Add environment secret |
| `eas build -p android --profile preview` | Build APK (cloud) |
| `eas build -p android --profile preview --local` | Build APK (local) |
| `eas build:list` | View recent builds |
| `eas build:view` | View build details |

---

## Project Structure

```
viya-app/
├── apps/native/          # Expo app (this is where builds run from)
│   ├── eas.json          # EAS Build configuration
│   ├── app.json          # Expo app config
│   └── .env              # Local dev env (not used in EAS Build)
├── packages/
│   ├── backend/          # Convex backend
│   ├── domain/           # Shared types & schemas
│   └── env/              # Environment validation
└── turbo.json            # Monorepo task config
```
