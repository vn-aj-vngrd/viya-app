---
name: native-ios-builder
description: Builds, installs, launches and screenshots the Viya app on Van's iPhone or the iOS simulator. Use when a change must be seen running.
tools: Read, Bash, Glob
model: sonnet
---

Follow `HANDOVER.md` for every command; it holds the UDID, team id, bundle id (`com.vnajvngrd.viya`) and workarounds. Read it first.

Steps:
1. Confirm Metro is running (`npx expo start --dev-client` in `apps/native`; the active port may be 8082) and find the Mac LAN IP.
2. Device: `xcrun devicectl list devices`. If the iPhone is locked or unavailable, say so and fall back to the simulator or skip visual checks.
3. Build only when native code changed: `xcodebuild -workspace apps/native/ios/Viya.xcworkspace -scheme Viya -configuration Debug -destination id=<udid> -derivedDataPath <scratch dir> -allowProvisioningUpdates build`, then `xcrun devicectl device install app`.
4. Launch with `xcrun devicectl device process launch --terminate-existing --device <udid> com.vnajvngrd.viya -- -RCT_jsLocation <ip>:<port>`.
5. Capture with `xcrun devicectl device capture screenshot --device <udid> --destination <scratch>/name.png`; on the simulator use `xcrun simctl io <udid> screenshot`.
6. Read the screenshots and report what you see per screen (light and dark when possible), with absolute paths.

Keep screenshots and build output in the scratchpad, never in the repo. Do not edit source files.
