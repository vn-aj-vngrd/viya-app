import type { DestinationSuggestion } from "@viya-app/domain";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	AppSheet,
	AppText,
	Icon,
	PrimaryButton,
	SecondaryButton,
	SheetHeader,
	spacing,
} from "@/src/components/ui";
import { formatCount, formatMoney, formatTripRange } from "@/src/lib/format";

const toneByBadge = {
	avoid: "danger",
	best: "success",
	caution: "warning",
	good: "secondary",
} as const;

function Line({
	icon,
	text,
	tone = "secondary",
}: {
	icon: "alert-circle-outline" | "checkmark-circle-outline";
	text: string;
	tone?: "secondary" | "warning";
}) {
	return (
		<View
			style={{
				alignItems: "flex-start",
				flexDirection: "row",
				gap: spacing.sm,
			}}
		>
			<Icon name={icon} size={18} tone={tone} />
			<AppText style={{ flex: 1 }} tone="secondary" variant="callout">
				{text}
			</AppText>
		</View>
	);
}

/** Season, cost and caveats for one destination, with Plan this trip as the one primary action. */
export function DestinationPlanSheet({
	onAskViya,
	onClose,
	onPlan,
	suggestion,
}: {
	onAskViya: (suggestion: DestinationSuggestion) => void;
	onClose: () => void;
	onPlan: (suggestion: DestinationSuggestion) => void;
	suggestion: DestinationSuggestion | null;
}) {
	const insets = useSafeAreaInsets();
	const window = suggestion?.suggestedWindow;

	return (
		<AppSheet
			isOpen={suggestion !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<SheetHeader
				onClose={onClose}
				subtitle={suggestion?.destination.region}
				title={suggestion?.destination.name ?? "Destination"}
			/>
			{suggestion && window ? (
				<View
					style={{
						gap: spacing.lg,
						paddingBottom: Math.max(insets.bottom, spacing.lg),
						paddingHorizontal: spacing.screen,
						paddingTop: spacing.md,
					}}
				>
					<View style={{ gap: spacing.xs }}>
						<AppText
							tone={toneByBadge[suggestion.badge.tone]}
							variant="headline"
						>
							{suggestion.badge.label}
						</AppText>
						<AppText tone="secondary" variant="callout">
							{suggestion.destination.detail}
						</AppText>
					</View>
					<View style={{ gap: spacing.sm }}>
						{suggestion.reasons.slice(0, 3).map((reason) => (
							<Line
								icon="checkmark-circle-outline"
								key={reason}
								text={reason}
							/>
						))}
						{suggestion.caveats.slice(0, 3).map((caveat) => (
							<Line
								icon="alert-circle-outline"
								key={caveat}
								text={caveat}
								tone="warning"
							/>
						))}
					</View>
					<View style={{ gap: spacing.xs }}>
						<AppText variant="body">
							{`${formatCount(window.days, "day")} · ${formatTripRange(window.startDate, window.endDate)}`}
						</AppText>
						<AppText tone="secondary" variant="subhead">
							{`About ${formatMoney(suggestion.estimate.totalPhp)} with flights from Manila. ${suggestion.destination.access.fromManila}`}
						</AppText>
					</View>
					<View style={{ gap: spacing.sm }}>
						<PrimaryButton
							icon="calendar-outline"
							label="Plan this trip"
							onPress={() => onPlan(suggestion)}
						/>
						<SecondaryButton
							icon="sparkles"
							label="Ask Viya"
							onPress={() => onAskViya(suggestion)}
							variant="plain"
						/>
					</View>
				</View>
			) : null}
		</AppSheet>
	);
}
