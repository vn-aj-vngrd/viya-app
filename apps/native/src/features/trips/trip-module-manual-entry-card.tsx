import { Ionicons } from "@expo/vector-icons";
import { Button, Text } from "heroui-native";
import type { ComponentProps } from "react";
import { View } from "react-native";

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
	const actionButtonClassName = "min-w-[132px] flex-1";

	return (
		<View className="gap-3 rounded-[28px] bg-surface-secondary p-3.5">
			<View className="flex-row items-center gap-3">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={{ backgroundColor: accent.backgroundColor }}
				>
					<Ionicons color={accent.color} name={cardIcon} size={19} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						{eyebrow.toUpperCase()}
					</Text>
					<Text type="body" weight="bold">
						{cardTitle}
					</Text>
					<Text color="muted" numberOfLines={2} type="body-sm">
						{description}
					</Text>
				</View>
			</View>

			{primaryActionLabel || secondaryActionLabel ? (
				<View className="flex-row flex-wrap gap-2">
					{primaryActionLabel ? (
						<Button
							className={actionButtonClassName}
							isDisabled={isPrimaryDisabled}
							onPress={onPrimaryPress}
							size="sm"
							variant="primary"
						>
							<Ionicons color="#FFFFFF" name={primaryActionIcon} size={16} />
							<Button.Label>{primaryActionLabel}</Button.Label>
						</Button>
					) : null}
					{secondaryActionLabel ? (
						<Button
							className={actionButtonClassName}
							isDisabled={isSecondaryDisabled}
							onPress={onSecondaryPress}
							size="sm"
							variant="secondary"
						>
							<Ionicons
								color={accent.color}
								name={secondaryActionIcon}
								size={16}
							/>
							<Button.Label>{secondaryActionLabel}</Button.Label>
						</Button>
					) : null}
				</View>
			) : null}
		</View>
	);
}
