import { Ionicons } from "@expo/vector-icons";
import { Button, cn, Text } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { View } from "react-native";

type EmptyStateIconName = ComponentProps<typeof Ionicons>["name"];

interface EmptyStateProps {
	action?: {
		label: string;
		onPress?: () => void;
		startContent?: ReactNode;
		variant?: "primary" | "secondary";
	};
	className?: string;
	description: string;
	icon?: EmptyStateIconName;
	title: string;
}

function EmptyStateIcon({ name }: { name: EmptyStateIconName }) {
	return (
		<View className="h-14 w-14 items-center justify-center rounded-full border border-border bg-surface">
			<Ionicons color="#0A84FF" name={name} size={24} />
		</View>
	);
}

export function EmptyState({
	action,
	className,
	description,
	icon = "search",
	title,
}: EmptyStateProps) {
	return (
		<View
			className={cn("flex-1 items-center justify-center px-8 py-12", className)}
		>
			<EmptyStateIcon name={icon} />

			<Text.Heading align="center" className="mt-3" type="h5" weight="semibold">
				{title}
			</Text.Heading>
			<Text.Paragraph
				align="center"
				className="mt-2 max-w-[270px] leading-5"
				color="muted"
				type="body-sm"
			>
				{description}
			</Text.Paragraph>

			{action ? (
				<Button
					className="mt-6 self-center"
					onPress={action.onPress}
					size="sm"
					variant={action.variant ?? "secondary"}
				>
					{action.startContent}
					<Button.Label>{action.label}</Button.Label>
				</Button>
			) : null}
		</View>
	);
}
