import { Ionicons } from "@expo/vector-icons";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
} from "@viya-app/domain";
import { Button, Chip, Menu, type MenuKey, Surface, Text } from "heroui-native";
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

interface ReadinessItemRowProps {
	item: Doc<"readinessItems">;
	onStatusChange: (
		readinessItemId: Id<"readinessItems">,
		status: (typeof statusOptions)[number]
	) => void;
}

export function ReadinessItemRow({
	item,
	onStatusChange,
}: ReadinessItemRowProps) {
	const selectedKeys = new Set<MenuKey>([item.status]);

	return (
		<Surface className="gap-3 rounded-[24px] border border-border bg-surface p-4">
			<View className="flex-row items-start gap-3">
				<View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="checkmark-circle-outline" size={18} />
				</View>
				<View className="flex-1 gap-2">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{READINESS_CATEGORY_LABELS[item.category as ReadinessCategory]}
							</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{PRIORITY_LABELS[item.priority as Priority]}
							</Chip.Label>
						</Chip>
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
			<Menu>
				<Menu.Trigger asChild={true}>
					<Pressable accessibilityRole="button">
						<Button size="sm" variant="secondary">
							<Button.Label>
								{statusLabels[item.status] ?? item.status}
							</Button.Label>
						</Button>
					</Pressable>
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Overlay />
					<Menu.Content
						className="rounded-[24px] border border-border bg-surface p-2"
						presentation="popover"
						width={220}
					>
						<Menu.Group
							onSelectionChange={(keys) => {
								const [status] = keys;
								if (statusOptions.includes(status as never)) {
									onStatusChange(
										item._id,
										status as (typeof statusOptions)[number]
									);
								}
							}}
							selectedKeys={selectedKeys}
							selectionMode="single"
						>
							{statusOptions.map((status) => (
								<Menu.Item
									className="rounded-[18px] p-3"
									id={status}
									key={status}
								>
									<Menu.ItemTitle className="font-semibold text-sm">
										{statusLabels[status]}
									</Menu.ItemTitle>
									<Menu.ItemIndicator
										iconProps={{ color: "#18181B", size: 18 }}
									/>
								</Menu.Item>
							))}
						</Menu.Group>
					</Menu.Content>
				</Menu.Portal>
			</Menu>
		</Surface>
	);
}
