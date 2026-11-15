import {
	ImpactFeedbackStyle,
	impactAsync,
	NotificationFeedbackType,
	notificationAsync,
	selectionAsync,
} from "expo-haptics";
import { Platform } from "react-native";

export type HapticKind =
	| "light"
	| "medium"
	| "selection"
	| "success"
	| "warning"
	| "error"
	| "none";

/** Fire-and-forget haptic; no-op on web and when unavailable. */
export function haptic(kind: HapticKind = "light") {
	if (kind === "none" || Platform.OS === "web") {
		return;
	}
	let result: Promise<void>;
	switch (kind) {
		case "selection":
			result = selectionAsync();
			break;
		case "medium":
			result = impactAsync(ImpactFeedbackStyle.Medium);
			break;
		case "success":
			result = notificationAsync(NotificationFeedbackType.Success);
			break;
		case "warning":
			result = notificationAsync(NotificationFeedbackType.Warning);
			break;
		case "error":
			result = notificationAsync(NotificationFeedbackType.Error);
			break;
		default:
			result = impactAsync(ImpactFeedbackStyle.Light);
	}
	result.catch(() => undefined);
}
