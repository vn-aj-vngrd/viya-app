import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import type { ComponentProps } from "react";
import { Image, Pressable, View } from "react-native";

import { Container } from "@/components/container";
import { VIYA_ROUTES } from "@/src/constants/routes";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface DashboardMetric {
	accent: string;
	icon: IconName;
	label: string;
	soft: string;
	value: string;
}

const dashboardMetrics = [
	{
		accent: "#0A84FF",
		icon: "map-outline",
		label: "Plans",
		soft: "#EAF2FF",
		value: "Start",
	},
	{
		accent: "#059669",
		icon: "shield-checkmark-outline",
		label: "Readiness",
		soft: "#E4F8EF",
		value: "New",
	},
	{
		accent: "#9333EA",
		icon: "folder-open-outline",
		label: "Vault",
		soft: "#F5E8FF",
		value: "Empty",
	},
] as const satisfies readonly DashboardMetric[];

const exploreCards = [
	{
		accent: "#0A84FF",
		href: VIYA_ROUTES.viya,
		icon: "sparkles-outline",
		subtitle: "Turn a rough idea into a trip blueprint.",
		title: "Plan with Viya",
	},
	{
		accent: "#059669",
		href: VIYA_ROUTES.tripVault,
		icon: "cloud-upload-outline",
		subtitle: "Keep bookings, receipts, and files together.",
		title: "Sync your trip",
	},
	{
		accent: "#E97816",
		href: VIYA_ROUTES.trips,
		icon: "compass-outline",
		subtitle: "See plans, live trips, and travel mode.",
		title: "Open trips",
	},
	{
		accent: "#DB2777",
		href: VIYA_ROUTES.moments,
		icon: "images-outline",
		subtitle: "Save notes, photos, ratings, and tips.",
		title: "Capture moments",
	},
] as const;

export default function HomeScreen() {
	const { user } = useUser();
	const firstName = user?.firstName ?? user?.fullName?.split(" ")[0] ?? "there";
	const initials =
		user?.firstName?.charAt(0) ?? user?.fullName?.charAt(0) ?? "V";

	return (
		<Container className="px-5">
			<View className="gap-5 pt-5 pb-36">
				<View className="flex-row items-center justify-between gap-4">
					<View className="flex-1 gap-1">
						<Text color="muted" type="body-sm" weight="medium">
							Welcome back
						</Text>
						<Text.Heading className="text-4xl" type="h1" weight="semibold">
							{firstName}
						</Text.Heading>
					</View>
					{user?.imageUrl ? (
						<Image
							className="h-14 w-14 rounded-full"
							source={{ uri: user.imageUrl }}
						/>
					) : (
						<Surface className="h-14 w-14 items-center justify-center rounded-full bg-foreground">
							<Text className="text-white" type="h5" weight="semibold">
								{initials.toUpperCase()}
							</Text>
						</Surface>
					)}
				</View>

				<Surface className="overflow-hidden rounded-4xl border border-border bg-surface p-5">
					<View className="gap-5">
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-2">
								<Surface
									className="self-start rounded-full bg-surface-secondary px-3 py-1.5"
									variant="secondary"
								>
									<Text color="muted" type="body-xs" weight="semibold">
										TODAY
									</Text>
								</Surface>
								<Text.Heading
									className="text-3xl leading-9"
									type="h2"
									weight="semibold"
								>
									Where should we go next?
								</Text.Heading>
								<Text.Paragraph
									className="leading-5"
									color="muted"
									type="body-sm"
								>
									Share a destination, mood, dates, or budget. Viya will shape
									the first plan.
								</Text.Paragraph>
							</View>
							<View className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-secondary">
								<Ionicons color="#0A84FF" name="sparkles" size={16} />
							</View>
						</View>

						<Surface
							className="gap-3 rounded-[28px] bg-surface-secondary p-4"
							variant="secondary"
						>
							<View className="flex-row items-center gap-3">
								<View
									className="h-10 w-10 items-center justify-center rounded-full"
									style={{ backgroundColor: "#EAF2FF" }}
								>
									<Ionicons
										color="#0A84FF"
										name="chatbubble-outline"
										size={19}
									/>
								</View>
								<View className="flex-1">
									<Text color="muted" type="body-sm">
										Try
									</Text>
									<Text type="body-sm" weight="semibold">
										Plan a calm 5-day trip under budget
									</Text>
								</View>
							</View>
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
					</View>
				</Surface>

				<View className="flex-row gap-3">
					{dashboardMetrics.map((item) => (
						<Surface
							className="flex-1 gap-3 rounded-3xl border border-border bg-surface p-4"
							key={item.label}
						>
							<View
								className="h-10 w-10 items-center justify-center rounded-full"
								style={{ backgroundColor: item.soft }}
							>
								<Ionicons color={item.accent} name={item.icon} size={19} />
							</View>
							<View className="gap-0.5">
								<Text type="body-sm" weight="semibold">
									{item.value}
								</Text>
								<Text color="muted" type="body-xs">
									{item.label}
								</Text>
							</View>
						</Surface>
					))}
				</View>

				<View className="gap-3">
					<View className="flex-row items-center justify-between">
						<Text.Heading type="h5" weight="semibold">
							Explore
						</Text.Heading>
						<Text color="muted" type="body-xs" weight="medium">
							Viya workspace
						</Text>
					</View>
					<View className="flex-row flex-wrap gap-3">
						{exploreCards.map((item) => (
							<Link asChild href={item.href} key={item.title}>
								<Pressable className="w-[48%]">
									<Surface className="gap-4 rounded-3xl border border-border bg-surface p-4">
										<View
											className="h-10 w-10 items-center justify-center rounded-full"
											style={{ backgroundColor: `${item.accent}18` }}
										>
											<Ionicons
												color={item.accent}
												name={item.icon}
												size={19}
											/>
										</View>
										<View className="gap-1">
											<Text type="body-sm" weight="semibold">
												{item.title}
											</Text>
											<Text.Paragraph color="muted" type="body-xs">
												{item.subtitle}
											</Text.Paragraph>
										</View>
									</Surface>
								</Pressable>
							</Link>
						))}
					</View>
				</View>

				<Surface className="gap-4 rounded-3xl border border-border bg-surface p-4">
					<View className="flex-row items-center gap-3">
						<View className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
							<Ionicons color="#71717A" name="albums-outline" size={19} />
						</View>
						<View className="flex-1">
							<Text type="body-sm" weight="semibold">
								Your workspace is ready
							</Text>
							<Text.Paragraph color="muted" type="body-xs">
								Plans, Vault files, readiness checks, and memories will appear
								here as you travel.
							</Text.Paragraph>
						</View>
					</View>
				</Surface>
			</View>
		</Container>
	);
}
