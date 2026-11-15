import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { useUniwind } from "uniwind";

import { type ColorSchemeName, type Palette, palettes } from "./tokens";

export interface UITheme {
	isDark: boolean;
	palette: Palette;
	scheme: ColorSchemeName;
}

/** Current palette; follows Uniwind's theme (system or user override). */
export function useUITheme(): UITheme {
	const { theme } = useUniwind();
	const scheme: ColorSchemeName = theme === "dark" ? "dark" : "light";

	return { isDark: scheme === "dark", palette: palettes[scheme], scheme };
}

/** True when iOS Reduce Transparency is on (glass/blur become solid). */
export function useReduceTransparency() {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		if (Platform.OS !== "ios") {
			return;
		}
		let mounted = true;
		AccessibilityInfo.isReduceTransparencyEnabled()
			.then((value) => {
				if (mounted) {
					setEnabled(value);
				}
			})
			.catch(() => undefined);
		const subscription = AccessibilityInfo.addEventListener(
			"reduceTransparencyChanged",
			setEnabled
		);
		return () => {
			mounted = false;
			subscription.remove();
		};
	}, []);

	return enabled;
}
