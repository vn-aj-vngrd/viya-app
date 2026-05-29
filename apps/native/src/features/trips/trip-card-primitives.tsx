import { Ionicons } from "@expo/vector-icons";
import { Text } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import { formatDestinationLabel } from "@/src/features/trips/trip-dashboard-utils";

const accentColor = "#0A84FF";
const successColor = "#1CCB68";

export function TripRouteLine({ destination }: { destination: string }) {
	const destinationLabel = formatDestinationLabel(destination);

	return (
		<View className="gap-0.5">
			<View className="flex-row items-center">
				<View className="items-start">
					<View className="h-1.5 w-1.5 rounded-full bg-accent" />
				</View>
				<View className="min-w-[72px] flex-1 flex-row items-center px-2.5">
					<View className="h-px flex-1 bg-border" />
					<View className="h-8 w-8 items-center justify-center rounded-full bg-accent-soft">
						<Ionicons color={accentColor} name="airplane" size={16} />
					</View>
					<View className="h-px flex-1 bg-border" />
				</View>
				<View className="items-end">
					<View className="h-1.5 w-1.5 rounded-full bg-border" />
				</View>
			</View>
			<View className="flex-row items-start">
				<View className="w-[92px] items-start">
					<Text numberOfLines={1} type="body-xs" weight="bold">
						HOME
					</Text>
				</View>
				<View className="flex-1" />
				<View className="w-[92px] items-end">
					<Text
						numberOfLines={1}
						style={{ textAlign: "right" }}
						type="body-xs"
						weight="bold"
					>
						{destinationLabel}
					</Text>
				</View>
			</View>
		</View>
	);
}

export function TripCardTitleRow({
	statusSlot,
	title,
}: {
	statusSlot: ReactNode;
	title: string;
}) {
	return (
		<View className="flex-row items-start gap-3">
			<Text
				className="min-w-0 flex-1"
				numberOfLines={2}
				type="body"
				weight="bold"
			>
				{title}
			</Text>
			{statusSlot}
		</View>
	);
}

export function TripCardMetaRow({
	left,
	right,
}: {
	left: string;
	right?: string;
}) {
	return (
		<View className="flex-row items-center justify-between gap-3">
			<Text
				className="min-w-0 flex-1"
				color="muted"
				numberOfLines={1}
				type="body-sm"
			>
				{left}
			</Text>
			{right ? (
				<Text color="muted" numberOfLines={1} type="body-sm">
					{right}
				</Text>
			) : null}
		</View>
	);
}

export function TripMetricBlock({
	align = "flex-start",
	detail,
	label,
	progress,
	tone = "accent",
	value,
}: {
	align?: "flex-end" | "flex-start";
	detail: string;
	label: string;
	progress?: number;
	tone?: "accent" | "success";
	value: string;
}) {
	const fillColor = tone === "success" ? successColor : accentColor;
	const trackColor =
		tone === "success"
			? "rgba(28, 203, 104, 0.12)"
			: "rgba(10, 132, 255, 0.12)";
	const boundedProgress =
		progress === undefined ? undefined : Math.min(100, Math.max(0, progress));

	return (
		<View className="min-w-0 flex-1 gap-1.5" style={{ alignItems: align }}>
			<Text color="muted" numberOfLines={1} type="body-xs" weight="semibold">
				{label}
			</Text>
			{boundedProgress === undefined ? null : (
				<View
					className="h-1.5 w-full overflow-hidden rounded-full"
					style={{ backgroundColor: trackColor }}
				>
					<View
						className="h-full rounded-full"
						style={{ backgroundColor: fillColor, width: `${boundedProgress}%` }}
					/>
				</View>
			)}
			<View
				className="min-w-0 flex-row items-baseline gap-2"
				style={{
					justifyContent: align === "flex-end" ? "flex-end" : "flex-start",
				}}
			>
				<Text numberOfLines={1} type="body-sm" weight="bold">
					{value}
				</Text>
				<Text color="muted" numberOfLines={1} type="body-xs">
					{detail}
				</Text>
			</View>
		</View>
	);
}
