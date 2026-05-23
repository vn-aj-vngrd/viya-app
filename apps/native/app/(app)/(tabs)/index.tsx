import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { VIYA_ROUTES } from "@/src/constants/routes";

const workspaceStatus = [
	{ accent: "#0A84FF", label: "Plan", value: "Ready" },
	{ accent: "#059669", label: "Vault", value: "0 files" },
	{ accent: "#9333EA", label: "Story", value: "Empty" },
] as const;

export default function HomeScreen() {
	return (
		<Container className="px-5 pb-28">
			<View className="gap-5 py-5">
				<View className="gap-1">
					<Text.Heading className="text-4xl" type="h1" weight="semibold">
						Viya
					</Text.Heading>
					<Text.Paragraph color="muted" type="body-sm">
						Travel, one step ahead
					</Text.Paragraph>
				</View>

				<Surface className="gap-5 rounded-4xl border border-border bg-surface p-5">
					<View className="flex-row items-center justify-between">
						<Surface
							className="rounded-full bg-surface-secondary px-3 py-1.5"
							variant="secondary"
						>
							<Text color="muted" type="body-xs" weight="semibold">
								NEW TRIP
							</Text>
						</Surface>
						<View className="h-11 w-11 items-center justify-center rounded-full bg-foreground">
							<Ionicons color="#FFFFFF" name="sparkles" size={20} />
						</View>
					</View>

					<View className="gap-3">
						<Text.Heading
							className="text-3xl leading-9"
							type="h2"
							weight="semibold"
						>
							Where should we go next?
						</Text.Heading>
						<Text.Paragraph className="leading-5" color="muted" type="body-sm">
							Tell Viya the destination, mood, dates, or budget. It will turn
							the idea into a clear first plan.
						</Text.Paragraph>
					</View>

					<Surface
						className="gap-2 rounded-[26px] bg-surface-secondary p-3"
						variant="secondary"
					>
						<Text.Paragraph color="muted" type="body-sm">
							Plan a calm 5-day beach trip under budget
						</Text.Paragraph>
						<View className="flex-row flex-wrap gap-2">
							{["Budget", "Readiness", "Vault"].map((item) => (
								<Surface
									className="rounded-full bg-surface px-3 py-1.5"
									key={item}
								>
									<Text type="body-xs" weight="semibold">
										{item}
									</Text>
								</Surface>
							))}
						</View>
					</Surface>

					<Link asChild href={VIYA_ROUTES.viya}>
						<Button>
							<Button.Label>Start planning</Button.Label>
						</Button>
					</Link>
				</Surface>

				<Surface className="gap-4 rounded-[28px] border border-border bg-surface p-4">
					<View className="flex-row items-center justify-between">
						<Text.Heading type="h5" weight="semibold">
							Workspace
						</Text.Heading>
						<Text color="muted" type="body-xs" weight="semibold">
							EMPTY
						</Text>
					</View>
					<View className="gap-3">
						{workspaceStatus.map((item) => (
							<View className="flex-row items-center gap-3" key={item.label}>
								<View
									className="h-2.5 w-2.5 rounded-full"
									style={{ backgroundColor: item.accent }}
								/>
								<Text className="flex-1" type="body-sm" weight="medium">
									{item.label}
								</Text>
								<Text color="muted" type="body-sm" weight="semibold">
									{item.value}
								</Text>
							</View>
						))}
					</View>
				</Surface>
			</View>
		</Container>
	);
}
