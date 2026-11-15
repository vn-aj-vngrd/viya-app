import { getTripStatusLabel, type TripStatus } from "@viya-app/domain";
import type { ComponentProps } from "react";
import { View } from "react-native";

import { AppText, radius, useUITheme } from "@/src/components/ui";

type TripStatusIcon = ComponentProps<
	typeof import("@expo/vector-icons").Ionicons
>["name"];

interface TripStatusPresentation {
	backgroundColor: string;
	color: string;
	description: string;
	icon: TripStatusIcon;
	label: string;
}

// Static presentation consumed by list screens (needs a non-hook lookup).
// Colors are translucent tints so they read in both light and dark mode.
const tripStatusPresentation = {
	archived: {
		backgroundColor: "rgba(113, 113, 122, 0.14)",
		color: "#71717A",
		description: "Hidden from active planning without deleting history.",
		icon: "archive-outline",
		label: getTripStatusLabel("archived"),
	},
	completed: {
		backgroundColor: "rgba(191, 90, 242, 0.14)",
		color: "#AF52DE",
		description: "The trip is wrapped and ready to review later.",
		icon: "checkmark-circle-outline",
		label: getTripStatusLabel("completed"),
	},
	planning: {
		backgroundColor: "rgba(10, 132, 255, 0.14)",
		color: "#0A84FF",
		description: "Trip basics, budget, and itinerary are being shaped.",
		icon: "map-outline",
		label: getTripStatusLabel("planning"),
	},
	traveling: {
		backgroundColor: "rgba(50, 173, 230, 0.16)",
		color: "#32ADE6",
		description: "Day-of guidance and trip context are front and center.",
		icon: "navigate-outline",
		label: getTripStatusLabel("traveling"),
	},
} as const satisfies Record<TripStatus, TripStatusPresentation>;

export const getTripStatusPresentation = (
	status: string
): TripStatusPresentation =>
	tripStatusPresentation[status as TripStatus] ?? {
		backgroundColor: "rgba(113, 113, 122, 0.14)",
		color: "#71717A",
		description: "Custom trip status.",
		icon: "ellipse-outline",
		label: status,
	};

export function TripStatusPill({ status }: { status: string }) {
	const { palette } = useUITheme();
	const presentation = getTripStatusPresentation(status);
	const known = status in tripStatusPresentation;

	return (
		<View
			accessibilityLabel={`Status ${presentation.label}`}
			style={{
				backgroundColor: known ? presentation.backgroundColor : palette.fill,
				borderRadius: radius.pill,
				paddingHorizontal: 10,
				paddingVertical: 4,
			}}
		>
			<AppText
				numberOfLines={1}
				style={{
					color: known ? presentation.color : palette.inkSecondary,
					fontWeight: "600",
				}}
				variant="footnote"
			>
				{presentation.label}
			</AppText>
		</View>
	);
}
