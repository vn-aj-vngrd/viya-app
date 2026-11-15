import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { View } from "react-native";

import {
	AppText,
	Card,
	PrimaryButton,
	radius,
	SecondaryButton,
} from "@/src/components/ui";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface ModuleAccent {
	backgroundColor: string;
	color: string;
}

const defaultAccent: ModuleAccent = {
	backgroundColor: "rgba(10, 132, 255, 0.1)",
	color: "#0A84FF",
};

const moduleAccents: Record<string, ModuleAccent> = {
	bookings: { backgroundColor: "rgba(255, 159, 10, 0.12)", color: "#FF9F0A" },
	budget: { backgroundColor: "rgba(10, 165, 181, 0.12)", color: "#0AA5B5" },
	companions: { backgroundColor: "rgba(255, 45, 85, 0.1)", color: "#FF2D55" },
	documents: { backgroundColor: "rgba(175, 82, 222, 0.12)", color: "#AF52DE" },
	itinerary: { backgroundColor: "rgba(10, 132, 255, 0.1)", color: "#0A84FF" },
	moments: { backgroundColor: "rgba(191, 90, 242, 0.12)", color: "#BF5AF2" },
	notes: { backgroundColor: "rgba(255, 149, 0, 0.12)", color: "#FF9500" },
	places: { backgroundColor: "rgba(52, 199, 89, 0.12)", color: "#34C759" },
	readiness: { backgroundColor: "rgba(94, 92, 230, 0.12)", color: "#5E5CE6" },
	recap: { backgroundColor: "rgba(10, 132, 255, 0.1)", color: "#0A84FF" },
	risks: { backgroundColor: "rgba(255, 59, 48, 0.1)", color: "#FF3B30" },
	"travel mode": {
		backgroundColor: "rgba(0, 122, 255, 0.1)",
		color: "#007AFF",
	},
};

const getModuleAccent = (moduleLabel: string): ModuleAccent =>
	moduleAccents[moduleLabel.trim().toLowerCase()] ?? defaultAccent;

const moduleIcons: Record<string, IoniconName> = {
	bookings: "ticket-outline",
	budget: "wallet-outline",
	companions: "people-outline",
	documents: "cloud-upload-outline",
	itinerary: "calendar-outline",
	moments: "images-outline",
	notes: "document-text-outline",
	places: "map-outline",
	readiness: "checkbox-outline",
	recap: "sparkles-outline",
	risks: "warning-outline",
	"travel mode": "navigate-outline",
};

const moduleDisplayLabels: Record<string, string> = {
	bookings: "Bookings",
	budget: "Budget",
	companions: "Companions",
	documents: "Documents",
	itinerary: "Itinerary",
	moments: "Memories",
	notes: "Notes",
	places: "Places",
	readiness: "Checklist",
	recap: "Recap",
	risks: "Risks",
	"travel mode": "Travel Mode",
};

const normalizeModuleLabel = (moduleLabel: string) =>
	moduleLabel.trim().toLowerCase();

const getModuleIcon = (moduleLabel: string): IoniconName =>
	moduleIcons[normalizeModuleLabel(moduleLabel)] ?? "create-outline";

const getModuleDisplayLabel = (moduleLabel: string) =>
	moduleDisplayLabels[normalizeModuleLabel(moduleLabel)] ?? moduleLabel.trim();

interface TripModuleManualEntryCardProps {
	description: string;
	eyebrow?: string;
	icon?: IoniconName;
	isPrimaryDisabled?: boolean;
	isSecondaryDisabled?: boolean;
	moduleLabel: string;
	onPrimaryPress?: () => void;
	onSecondaryPress?: () => void;
	primaryActionIcon?: IoniconName;
	primaryActionLabel?: string;
	secondaryActionIcon?: IoniconName;
	secondaryActionLabel?: string;
	title?: string;
}

export function TripModuleManualEntryCard({
	description,
	eyebrow = "Trip workspace",
	icon,
	isPrimaryDisabled = false,
	isSecondaryDisabled = false,
	moduleLabel,
	onPrimaryPress,
	onSecondaryPress,
	primaryActionIcon = "add-outline",
	primaryActionLabel,
	secondaryActionIcon = "create-outline",
	secondaryActionLabel,
	title,
}: TripModuleManualEntryCardProps) {
	const accent = getModuleAccent(moduleLabel);
	const cardIcon = icon ?? getModuleIcon(moduleLabel);
	const displayLabel = getModuleDisplayLabel(moduleLabel);
	const cardTitle = title ?? `${displayLabel} board`;

	return (
		<Card padding="md" style={{ gap: 12 }}>
			<View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
				<View
					style={{
						alignItems: "center",
						backgroundColor: accent.backgroundColor,
						borderRadius: radius.pill,
						height: 40,
						justifyContent: "center",
						width: 40,
					}}
				>
					<Ionicons color={accent.color} name={cardIcon} size={19} />
				</View>
				<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
					<AppText tone="secondary" variant="eyebrow">
						{eyebrow}
					</AppText>
					<AppText variant="headline">{cardTitle}</AppText>
					<AppText numberOfLines={2} tone="secondary" variant="subhead">
						{description}
					</AppText>
				</View>
			</View>

			{primaryActionLabel || secondaryActionLabel ? (
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					{primaryActionLabel ? (
						<View style={{ flex: 1, minWidth: 132 }}>
							<PrimaryButton
								disabled={isPrimaryDisabled}
								icon={primaryActionIcon}
								label={primaryActionLabel}
								onPress={() => onPrimaryPress?.()}
							/>
						</View>
					) : null}
					{secondaryActionLabel ? (
						<View style={{ flex: 1, minWidth: 132 }}>
							<SecondaryButton
								disabled={isSecondaryDisabled}
								icon={secondaryActionIcon}
								label={secondaryActionLabel}
								onPress={() => onSecondaryPress?.()}
							/>
						</View>
					) : null}
				</View>
			) : null}
		</Card>
	);
}
