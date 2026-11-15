import { Ionicons } from "@expo/vector-icons";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
} from "@viya-app/domain";
import { type Href, Link } from "expo-router";
import { Menu } from "heroui-native";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import {
	AppText,
	PressableScale,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { PillAction } from "@/src/features/bookings/pill-action";

const statusLabels: Record<string, string> = {
	blocked: "Blocked",
	done: "Done",
	ignored: "Ignored",
	inProgress: "In progress",
	todo: "To do",
};

const statusOptions = [
	"todo",
	"inProgress",
	"done",
	"blocked",
	"ignored",
] as const;

function RowPill({ label }: { label: string }) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				paddingHorizontal: 10,
				paddingVertical: 4,
			}}
		>
			<AppText bold={true} tone="secondary" variant="footnote">
				{label}
			</AppText>
		</View>
	);
}

interface ReadinessItemRowProps {
	assignedToName?: string;
	categoryHref: Href | null;
	item: Doc<"readinessItems">;
	onDelete: (readinessItemId: Id<"readinessItems">) => void;
	onEdit: (item: Doc<"readinessItems">) => void;
	onStatusChange: (
		readinessItemId: Id<"readinessItems">,
		status: (typeof statusOptions)[number]
	) => void;
	ownerHref: Href | null;
}

export function ReadinessItemRow({
	assignedToName,
	categoryHref,
	item,
	onDelete,
	onEdit,
	ownerHref,
	onStatusChange,
}: ReadinessItemRowProps) {
	const { palette } = useUITheme();
	const categoryLabel =
		READINESS_CATEGORY_LABELS[item.category as ReadinessCategory];
	const priorityLabel = PRIORITY_LABELS[item.priority as Priority];
	const dueDateLabel = item.dueDate ? `Due ${item.dueDate}` : "No due date";
	const metaLabel = `${categoryLabel} · ${priorityLabel} · ${
		assignedToName ?? "Unassigned"
	} · ${dueDateLabel}`;
	const isDone = item.status === "done";

	return (
		<Animated.View
			entering={FadeIn}
			style={{ gap: spacing.md, padding: spacing.lg }}
		>
			<View
				style={{
					alignItems: "flex-start",
					flexDirection: "row",
					gap: spacing.md,
				}}
			>
				<Ionicons
					color={isDone ? palette.success : palette.inkTertiary}
					name={isDone ? "checkmark-circle" : "ellipse-outline"}
					size={24}
					style={{ marginTop: 1 }}
				/>
				<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
					<AppText
						bold={true}
						numberOfLines={2}
						style={isDone ? { textDecorationLine: "line-through" } : undefined}
						tone={isDone ? "secondary" : "ink"}
					>
						{item.title}
					</AppText>
					<AppText numberOfLines={2} tone="secondary" variant="subhead">
						{item.description}
					</AppText>
					<AppText numberOfLines={2} tone="tertiary" variant="footnote">
						{metaLabel}
					</AppText>
				</View>
				<Menu>
					<Menu.Trigger asChild={true}>
						<PressableScale
							accessibilityLabel="Task options"
							accessibilityRole="button"
							haptic="selection"
							hitSlop={8}
							scaleTo={0.92}
							style={{
								alignItems: "center",
								height: 32,
								justifyContent: "center",
								marginRight: -6,
								width: 32,
							}}
						>
							<Ionicons
								color={palette.inkTertiary}
								name="ellipsis-horizontal"
								size={18}
							/>
						</PressableScale>
					</Menu.Trigger>
					<Menu.Portal>
						<Menu.Overlay />
						<Menu.Content
							align="end"
							className="rounded-[20px] bg-surface p-2"
							offset={8}
							placement="bottom"
							presentation="popover"
							width={200}
						>
							<Menu.Item
								accessibilityLabel="Edit task"
								className="min-h-11 flex-row items-center gap-3 rounded-[14px] p-2.5"
								isAnimatedStyleActive={false}
								onPress={() => onEdit(item)}
							>
								<Ionicons
									color={palette.accent}
									name="create-outline"
									size={18}
								/>
								<Menu.ItemTitle className="font-semibold text-sm">
									Edit task
								</Menu.ItemTitle>
							</Menu.Item>
							<Menu.Item
								accessibilityLabel="Delete task"
								className="min-h-11 flex-row items-center gap-3 rounded-[14px] p-2.5"
								isAnimatedStyleActive={false}
								onPress={() => onDelete(item._id)}
							>
								<Ionicons
									color={palette.danger}
									name="trash-outline"
									size={18}
								/>
								<Menu.ItemTitle className="font-semibold text-danger text-sm">
									Delete task
								</Menu.ItemTitle>
							</Menu.Item>
						</Menu.Content>
					</Menu.Portal>
				</Menu>
			</View>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					flexWrap: "wrap",
					gap: spacing.sm,
				}}
			>
				<RowPill label={statusLabels[item.status] ?? item.status} />
				{item.status === "inProgress" ? null : (
					<PillAction
						label="Start"
						onPress={() => onStatusChange(item._id, "inProgress")}
					/>
				)}
				{item.status === "done" ? null : (
					<PillAction
						label="Done"
						onPress={() => onStatusChange(item._id, "done")}
					/>
				)}
				{item.status === "ignored" ? null : (
					<PillAction
						label="Ignore"
						onPress={() => onStatusChange(item._id, "ignored")}
						tone="danger"
					/>
				)}
			</View>
			{categoryHref || ownerHref ? (
				<View
					style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
				>
					{categoryHref ? (
						<Link asChild href={categoryHref}>
							<PillAction icon="open-outline" label="Open category" />
						</Link>
					) : null}
					{ownerHref ? (
						<Link asChild href={ownerHref}>
							<PillAction icon="people-outline" label="Open owner" />
						</Link>
					) : null}
				</View>
			) : null}
		</Animated.View>
	);
}
