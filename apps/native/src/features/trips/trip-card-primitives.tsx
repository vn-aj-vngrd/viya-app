import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText, radius, useUITheme } from "@/src/components/ui";
import { formatDestinationLabel } from "@/src/features/trips/trip-dashboard-utils";

export function TripRouteLine({ destination }: { destination: string }) {
	const { palette } = useUITheme();
	const destinationLabel = formatDestinationLabel(destination);

	return (
		<View style={{ gap: 2 }}>
			<View style={{ alignItems: "center", flexDirection: "row" }}>
				<View
					style={{
						backgroundColor: palette.accent,
						borderRadius: radius.pill,
						height: 6,
						width: 6,
					}}
				/>
				<View
					style={{
						alignItems: "center",
						flex: 1,
						flexDirection: "row",
						minWidth: 72,
						paddingHorizontal: 10,
					}}
				>
					<View
						style={{ backgroundColor: palette.separator, flex: 1, height: 1 }}
					/>
					<View
						style={{
							alignItems: "center",
							backgroundColor: palette.fill,
							borderRadius: radius.pill,
							height: 32,
							justifyContent: "center",
							width: 32,
						}}
					>
						<Ionicons color={palette.accent} name="airplane" size={16} />
					</View>
					<View
						style={{ backgroundColor: palette.separator, flex: 1, height: 1 }}
					/>
				</View>
				<View
					style={{
						backgroundColor: palette.inkTertiary,
						borderRadius: radius.pill,
						height: 6,
						width: 6,
					}}
				/>
			</View>
			<View style={{ flexDirection: "row", justifyContent: "space-between" }}>
				<AppText
					bold
					numberOfLines={1}
					style={{ width: 92 }}
					variant="footnote"
				>
					HOME
				</AppText>
				<AppText
					bold
					numberOfLines={1}
					style={{ textAlign: "right", width: 92 }}
					variant="footnote"
				>
					{destinationLabel}
				</AppText>
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
		<View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
			<AppText
				numberOfLines={2}
				style={{ flex: 1, minWidth: 0 }}
				variant="headline"
			>
				{title}
			</AppText>
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
		<View
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: 12,
				justifyContent: "space-between",
			}}
		>
			<AppText
				numberOfLines={1}
				style={{ flex: 1, minWidth: 0 }}
				tone="secondary"
				variant="subhead"
			>
				{left}
			</AppText>
			{right ? (
				<AppText numberOfLines={1} tone="secondary" variant="subhead">
					{right}
				</AppText>
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
	const { palette } = useUITheme();
	const fillColor = tone === "success" ? palette.success : palette.accent;
	const boundedProgress =
		progress === undefined ? undefined : Math.min(100, Math.max(0, progress));

	return (
		<View style={{ alignItems: align, flex: 1, gap: 6, minWidth: 0 }}>
			<AppText bold numberOfLines={1} tone="secondary" variant="footnote">
				{label}
			</AppText>
			{boundedProgress === undefined ? null : (
				<View
					accessibilityRole="progressbar"
					accessibilityValue={{ max: 100, min: 0, now: boundedProgress }}
					style={{
						backgroundColor: palette.fill,
						borderRadius: radius.pill,
						height: 6,
						overflow: "hidden",
						width: "100%",
					}}
				>
					<View
						style={{
							backgroundColor: fillColor,
							borderRadius: radius.pill,
							height: "100%",
							width: `${boundedProgress}%`,
						}}
					/>
				</View>
			)}
			<View
				style={{
					alignItems: "baseline",
					flexDirection: "row",
					gap: 8,
					justifyContent: align === "flex-end" ? "flex-end" : "flex-start",
					minWidth: 0,
				}}
			>
				<AppText bold numberOfLines={1} variant="subhead">
					{value}
				</AppText>
				<AppText numberOfLines={1} tone="secondary" variant="footnote">
					{detail}
				</AppText>
			</View>
		</View>
	);
}
