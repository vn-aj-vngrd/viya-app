import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import {
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
} from "@viya-app/domain";
import { View } from "react-native";

import {
	AppText,
	haptic,
	Icon,
	ListRow,
	metrics,
	PressableScale,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { formatDay, formatRelativeDay, toLocalDateKey } from "@/src/lib/format";

const getInitials = (name: string) =>
	name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");

/** Leading checkbox: a 44pt target, filled when done. */
function Checkbox({
	isDone,
	onToggle,
	title,
}: {
	isDone: boolean;
	onToggle: () => void;
	title: string;
}) {
	return (
		<PressableScale
			accessibilityLabel={
				isDone ? `Mark ${title} as to do` : `Mark ${title} as done`
			}
			accessibilityRole="checkbox"
			accessibilityState={{ checked: isDone }}
			haptic="none"
			hitSlop={4}
			onPress={() => {
				haptic("selection");
				onToggle();
			}}
			style={{
				alignItems: "center",
				height: metrics.minTarget,
				justifyContent: "center",
				marginLeft: -spacing.sm,
				width: metrics.minTarget - spacing.sm,
			}}
		>
			<Icon
				name={isDone ? "checkmark-circle" : "ellipse-outline"}
				size={24}
				tone={isDone ? "accent" : "tertiary"}
			/>
		</PressableScale>
	);
}

function OwnerInitials({ name }: { name: string }) {
	const { palette } = useUITheme();

	return (
		<View
			accessibilityLabel={`Assigned to ${name}`}
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				height: 28,
				justifyContent: "center",
				width: 28,
			}}
		>
			<AppText tone="secondary" variant="footnote">
				{getInitials(name)}
			</AppText>
		</View>
	);
}

/** One subtitle for every task row: category, due state, high priority. */
export const getTaskSubtitle = (
	item: Pick<
		Doc<"readinessItems">,
		"category" | "dueDate" | "priority" | "status"
	>,
	showCategory = true
): string => {
	const today = toLocalDateKey();
	let dueText: string | null = null;

	if (item.dueDate) {
		dueText =
			item.status !== "done" && item.dueDate < today
				? `Overdue, was due ${formatDay(item.dueDate)}`
				: `Due ${formatRelativeDay(item.dueDate, today)}`;
	}

	return [
		showCategory
			? READINESS_CATEGORY_LABELS[item.category as ReadinessCategory]
			: null,
		dueText,
		item.priority === "high" || item.priority === "critical"
			? `${PRIORITY_LABELS[item.priority as Priority]} priority`
			: null,
	]
		.filter(Boolean)
		.join(" · ");
};

export function ReadinessTaskRow({
	assignedToName,
	item,
	onEdit,
	onToggle,
	showCategory,
}: {
	assignedToName?: string;
	item: Doc<"readinessItems">;
	onEdit: () => void;
	onToggle: () => void;
	showCategory?: boolean;
}) {
	const isDone = item.status === "done";
	const subtitle = getTaskSubtitle(item, showCategory);

	return (
		<ListRow
			accessibilityLabel={`${item.title}. Edit`}
			leading={
				<Checkbox isDone={isDone} onToggle={onToggle} title={item.title} />
			}
			onPress={onEdit}
			showChevron={false}
			subtitle={subtitle || undefined}
			title={item.title}
			trailing={assignedToName ? <OwnerInitials name={assignedToName} /> : null}
		/>
	);
}
