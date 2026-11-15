import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";

import { useUITheme } from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	contentTabHref,
	getLastContentTab,
} from "@/src/features/viya/ask-viya-launch";

/** Ask Viya tab: bounces back to the previous tab and opens chat as a cover. */
export default function AskViyaLauncher() {
	const router = useRouter();
	const { palette } = useUITheme();

	useFocusEffect(
		useCallback(() => {
			const source = getLastContentTab();
			router.navigate(contentTabHref[source]);
			requestAnimationFrame(() => {
				router.push({
					params: { fromTab: source, returnTo: "/(app)/(tabs)" },
					pathname: VIYA_ROUTES.ai,
				});
			});
		}, [router])
	);

	return <View style={{ backgroundColor: palette.canvas, flex: 1 }} />;
}
