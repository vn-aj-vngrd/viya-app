import { Ionicons } from "@expo/vector-icons";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
} from "@viya-app/domain";
import { type Href, Link } from "expo-router";
import { Button, Menu, Text } from "heroui-native";
import { Pressable, View } from "react-native";

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
	return (
		<View className="rounded-full bg-surface-secondary px-2.5 py-1">
			<Text color="muted" type="body-xs" weight="semibold">
				{label}
			</Text>
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
	const categoryLabel =
		READINESS_CATEGORY_LABELS[item.category as ReadinessCategory];
	const priorityLabel = PRIORITY_LABELS[item.priority as Priority];
	const dueDateLabel = item.dueDate ? `Due ${item.dueDate}` : "No due date";
	const metaLabel = `${categoryLabel} - ${priorityLabel} - ${
		assignedToName ?? "Unassigned"
	} - ${dueDateLabel}`;

	return (
		<View className="gap-3 rounded-[24px] border border-border bg-surface p-4">
			<View className="flex-row items-start gap-3">
				<View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
					<Ionicons
						color={item.status === "done" ? "#34C759" : "#5E5CE6"}
						name={
							item.status === "done"
								? "checkmark-circle"
								: "checkmark-circle-outline"
						}
						size={17}
					/>
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text numberOfLines={2} type="body-sm" weight="semibold">
						{item.title}
					</Text>
					<Text.Paragraph color="muted" numberOfLines={2} type="body-sm">
						{item.description}
					</Text.Paragraph>
					<Text color="muted" numberOfLines={1} type="body-xs">
						{metaLabel}
					</Text>
				</View>
				<Menu>
					<Menu.Trigger asChild={true}>
						<Pressable
							accessibilityLabel="Task options"
							accessibilityRole="button"
							className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary"
							style={({ pressed }) => ({
								transform: [{ scale: pressed ? 0.94 : 1 }],
							})}
						>
							<Ionicons color="#71717A" name="ellipsis-horizontal" size={17} />
						</Pressable>
					</Menu.Trigger>
					<Menu.Portal>
						<Menu.Overlay />
						<Menu.Content
							align="end"
							className="rounded-[24px] border border-border bg-surface p-2"
							offset={8}
							placement="bottom"
							presentation="popover"
							width={200}
						>
							<Menu.Item
								accessibilityLabel="Edit task"
								className="flex-row items-center gap-3 rounded-[18px] p-2.5"
								isAnimatedStyleActive={false}
								onPress={() => onEdit(item)}
							>
								<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
									<Ionicons color="#0A84FF" name="create-outline" size={16} />
								</View>
								<Menu.ItemTitle className="font-semibold text-sm">
									Edit task
								</Menu.ItemTitle>
							</Menu.Item>
							<View className="mx-2 my-1 h-px bg-border" />
							<Menu.Item
								accessibilityLabel="Delete task"
								className="flex-row items-center gap-3 rounded-[18px] p-2.5"
								isAnimatedStyleActive={false}
								onPress={() => onDelete(item._id)}
							>
								<View className="h-8 w-8 items-center justify-center rounded-full bg-danger/10">
									<Ionicons color="#FF3B30" name="trash-outline" size={16} />
								</View>
								<Menu.ItemTitle className="font-semibold text-danger text-sm">
									Delete task
								</Menu.ItemTitle>
							</Menu.Item>
						</Menu.Content>
					</Menu.Portal>
				</Menu>
			</View>
			<View className="flex-row flex-wrap items-center gap-2">
				<RowPill label={statusLabels[item.status] ?? item.status} />
				{item.status === "inProgress" ? null : (
					<Button
						onPress={() => onStatusChange(item._id, "inProgress")}
						size="sm"
						variant="secondary"
					>
						<Button.Label>Start</Button.Label>
					</Button>
				)}
				{item.status === "done" ? null : (
					<Button
						onPress={() => onStatusChange(item._id, "done")}
						size="sm"
						variant="secondary"
					>
						<Button.Label>Done</Button.Label>
					</Button>
				)}
				{item.status === "ignored" ? null : (
					<Button
						onPress={() => onStatusChange(item._id, "ignored")}
						size="sm"
						variant="tertiary"
					>
						<Button.Label>Ignore</Button.Label>
					</Button>
				)}
			</View>
			{categoryHref || ownerHref ? (
				<View className="flex-row flex-wrap gap-2">
					{categoryHref ? (
						<Link asChild href={categoryHref}>
							<Button className="flex-1" size="sm" variant="secondary">
								<Ionicons color="#0A84FF" name="open-outline" size={15} />
								<Button.Label>Open category</Button.Label>
							</Button>
						</Link>
					) : null}
					{ownerHref ? (
						<Link asChild href={ownerHref}>
							<Button className="flex-1" size="sm" variant="secondary">
								<Ionicons color="#0A84FF" name="people-outline" size={15} />
								<Button.Label>Open owner</Button.Label>
							</Button>
						</Link>
					) : null}
				</View>
			) : null}
		</View>
	);
}
