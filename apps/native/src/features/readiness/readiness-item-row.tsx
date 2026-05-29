import { Ionicons } from "@expo/vector-icons";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
} from "@viya-app/domain";
import { Button, Surface, Text } from "heroui-native";
import { View } from "react-native";

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
	item: Doc<"readinessItems">;
	onDelete: (readinessItemId: Id<"readinessItems">) => void;
	onEdit: (item: Doc<"readinessItems">) => void;
	onStatusChange: (
		readinessItemId: Id<"readinessItems">,
		status: (typeof statusOptions)[number]
	) => void;
}

export function ReadinessItemRow({
	item,
	onDelete,
	onEdit,
	onStatusChange,
}: ReadinessItemRowProps) {
	return (
		<Surface className="gap-3 rounded-[24px] border border-border bg-surface p-4">
			<View className="flex-row items-start gap-3">
				<View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="checkmark-circle-outline" size={18} />
				</View>
				<View className="flex-1 gap-2">
					<View className="flex-row flex-wrap gap-2">
						<RowPill
							label={
								READINESS_CATEGORY_LABELS[item.category as ReadinessCategory]
							}
						/>
						<RowPill label={PRIORITY_LABELS[item.priority as Priority]} />
					</View>
					<Text type="body-sm" weight="bold">
						{item.title}
					</Text>
					<Text.Paragraph color="muted" type="body-sm">
						{item.description}
					</Text.Paragraph>
					<Text color="muted" type="body-xs">
						Due {item.dueDate}
					</Text>
				</View>
			</View>
			<View className="flex-row flex-wrap items-center gap-2">
				<View className="rounded-full bg-surface-secondary px-3 py-2">
					<Text type="body-sm" weight="semibold">
						{statusLabels[item.status] ?? item.status}
					</Text>
				</View>
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
			<View className="flex-row flex-wrap gap-2">
				<Button
					className="flex-1"
					onPress={() => onEdit(item)}
					size="sm"
					variant="secondary"
				>
					<Button.Label>Edit task</Button.Label>
				</Button>
				<Button
					className="flex-1"
					onPress={() => onDelete(item._id)}
					size="sm"
					variant="tertiary"
				>
					<Button.Label>Delete task</Button.Label>
				</Button>
			</View>
		</Surface>
	);
}
