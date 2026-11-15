import { getTripStatusLabel, type TripStatus } from "@viya-app/domain";
import { View } from "react-native";

import {
	AppText,
	Icon,
	type IconName,
	type IconTone,
	palettes,
	spacing,
} from "@/src/components/ui";

interface TripStatusPresentation {
	/** Static colour for non-hook lookups (list rows). Prefer `tone`. */
	color: string;
	description: string;
	icon: IconName;
	label: string;
	tone: IconTone;
}

const staticPalette = palettes.light;

// Status is plain text plus a monochrome symbol, never a tinted pill.
const tripStatusPresentation = {
	archived: {
		color: staticPalette.inkSecondary,
		description: "Hidden from active planning without deleting history.",
		icon: "archive-outline",
		label: getTripStatusLabel("archived"),
		tone: "secondary",
	},
	ended: {
		color: staticPalette.inkSecondary,
		description:
			"The dates have passed. Mark the trip complete to unlock the recap.",
		icon: "flag-outline",
		label: "Ended",
		tone: "secondary",
	},
	completed: {
		color: staticPalette.success,
		description: "The trip is wrapped and ready to review later.",
		icon: "checkmark-circle-outline",
		label: getTripStatusLabel("completed"),
		tone: "success",
	},
	planning: {
		color: staticPalette.inkSecondary,
		description: "Trip basics, budget, and itinerary are being shaped.",
		icon: "map-outline",
		label: getTripStatusLabel("planning"),
		tone: "secondary",
	},
	traveling: {
		color: staticPalette.accent,
		description: "Day-of guidance and trip context are front and center.",
		icon: "navigate-outline",
		label: getTripStatusLabel("traveling"),
		tone: "accent",
	},
} as const satisfies Record<TripStatus | "ended", TripStatusPresentation>;

export const getTripStatusPresentation = (
	status: string
): TripStatusPresentation =>
	tripStatusPresentation[status as TripStatus | "ended"] ?? {
		color: staticPalette.inkSecondary,
		description: "Custom trip status.",
		icon: "ellipse-outline",
		label: status,
		tone: "secondary",
	};

const textToneByIconTone = {
	accent: "accent",
	danger: "danger",
	onPrimary: "onPrimary",
	primary: "ink",
	secondary: "secondary",
	success: "success",
	tertiary: "tertiary",
	warning: "warning",
} as const satisfies Record<IconTone, string>;

/** Trip status as a symbol and a word. No pill, no tint. */
export function TripStatusText({
	label,
	status,
}: {
	label?: string;
	status: string;
}) {
	const presentation = getTripStatusPresentation(status);
	const text = label ?? presentation.label;

	return (
		<View
			accessibilityLabel={`Status ${text}`}
			accessible
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.xs,
			}}
		>
			<Icon name={presentation.icon} size={14} tone={presentation.tone} />
			<AppText
				numberOfLines={1}
				tone={textToneByIconTone[presentation.tone]}
				variant="subhead"
			>
				{text}
			</AppText>
		</View>
	);
}
