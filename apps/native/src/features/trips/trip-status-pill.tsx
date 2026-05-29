import { getTripStatusLabel, type TripStatus } from "@viya-app/domain";
import { Text } from "heroui-native";
import type { ComponentProps } from "react";
import { View } from "react-native";

type TripStatusIcon = ComponentProps<
	typeof import("@expo/vector-icons").Ionicons
>["name"];

const tripStatusPresentation = {
	archived: {
		backgroundColor: "rgba(113, 113, 122, 0.12)",
		color: "#52525B",
		description: "Hidden from active planning without deleting history.",
		icon: "archive-outline",
		label: getTripStatusLabel("archived"),
	},
	booking: {
		backgroundColor: "rgba(255, 159, 10, 0.14)",
		color: "#B76E00",
		description:
			"Reservations, confirmations, and payment details are being locked.",
		icon: "briefcase-outline",
		label: getTripStatusLabel("booking"),
	},
	completed: {
		backgroundColor: "rgba(191, 90, 242, 0.14)",
		color: "#AF52DE",
		description: "The trip is wrapped and ready to review later.",
		icon: "checkmark-circle-outline",
		label: getTripStatusLabel("completed"),
	},
	planning: {
		backgroundColor: "rgba(10, 132, 255, 0.12)",
		color: "#0A84FF",
		description: "Trip basics, budget, and itinerary are being shaped.",
		icon: "map-outline",
		label: getTripStatusLabel("planning"),
	},
	preparing: {
		backgroundColor: "rgba(48, 209, 88, 0.14)",
		color: "#1F8F45",
		description:
			"Documents, packing, safety, and final checks are in progress.",
		icon: "shield-checkmark-outline",
		label: getTripStatusLabel("preparing"),
	},
	traveling: {
		backgroundColor: "rgba(50, 173, 230, 0.14)",
		color: "#007AFF",
		description: "Day-of guidance and trip context are front and center.",
		icon: "navigate-outline",
		label: getTripStatusLabel("traveling"),
	},
} as const satisfies Record<
	TripStatus,
	{
		backgroundColor: string;
		color: string;
		description: string;
		icon: TripStatusIcon;
		label: string;
	}
>;

const legacyTripStatusPresentation = {
	active: {
		backgroundColor: "rgba(50, 173, 230, 0.14)",
		color: "#007AFF",
		description: "Day-of guidance and trip context are front and center.",
		icon: "navigate-outline",
		label: "Traveling",
	},
	ready: {
		backgroundColor: "rgba(113, 113, 122, 0.12)",
		color: "#52525B",
		description:
			"Documents, packing, safety, and final checks are in progress.",
		icon: "shield-checkmark-outline",
		label: "Preparing",
	},
} as const satisfies Record<
	"active" | "ready",
	{
		backgroundColor: string;
		color: string;
		description: string;
		icon: TripStatusIcon;
		label: string;
	}
>;

export const getTripStatusPresentation = (status: string) =>
	tripStatusPresentation[status as TripStatus] ??
	legacyTripStatusPresentation[status as "active" | "ready"] ??
	({
		backgroundColor: "rgba(24, 24, 27, 0.04)",
		color: "#18181B",
		description: "Custom trip status.",
		icon: "ellipse-outline",
		label: status,
	} satisfies {
		backgroundColor: string;
		color: string;
		description: string;
		icon: TripStatusIcon;
		label: string;
	});

export function TripStatusPill({ status }: { status: string }) {
	const presentation = getTripStatusPresentation(status);

	return (
		<View
			className="rounded-full px-2.5 py-1"
			style={{ backgroundColor: presentation.backgroundColor }}
		>
			<Text
				numberOfLines={1}
				style={{ color: presentation.color }}
				type="body-xs"
				weight="semibold"
			>
				{presentation.label}
			</Text>
		</View>
	);
}
