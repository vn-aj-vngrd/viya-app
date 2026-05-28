import { Ionicons } from "@expo/vector-icons";
import { type Href, Link } from "expo-router";
import { Button, Chip, Surface, Text } from "heroui-native";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { RouteHeader } from "@/src/components/navigation/route-header";
import { VIYA_ROUTES } from "@/src/constants/routes";

import type {
	DashboardAction,
	DashboardMetric,
	DashboardTab,
	IoniconName,
	TripDashboardModel,
	TripTab,
} from "./trip-dashboard-types";

interface LinkButtonProps {
	children: string;
	href: Href;
	icon?: IoniconName;
	variant?: "primary" | "secondary" | "ghost";
}

export function LinkButton({
	children,
	href,
	icon,
	variant = "secondary",
}: LinkButtonProps) {
	return (
		<Link asChild href={href}>
			<Button size="sm" variant={variant}>
				{icon ? <Ionicons color="#0A84FF" name={icon} size={16} /> : null}
				<Button.Label>{children}</Button.Label>
			</Button>
		</Link>
	);
}

export function Section({
	children,
	icon,
	title,
}: {
	children: ReactNode;
	icon?: IoniconName;
	title: string;
}) {
	return (
		<Surface className="gap-3 rounded-[24px] border border-border bg-surface p-4">
			<View className="flex-row items-center gap-2">
				{icon ? <Ionicons color="#0A84FF" name={icon} size={18} /> : null}
				<Text.Heading type="h5" weight="semibold">
					{title}
				</Text.Heading>
			</View>
			{children}
		</Surface>
	);
}

export function EmptyCopy({
	children,
	icon = "ellipse-outline",
}: {
	children: string;
	icon?: IoniconName;
}) {
	return (
		<View className="items-center gap-2 rounded-[20px] bg-surface-secondary p-5">
			<Ionicons color="#8E8E93" name={icon} size={20} />
			<Text align="center" color="muted" type="body-sm">
				{children}
			</Text>
		</View>
	);
}

const getMetricToneClassName = (tone: DashboardMetric["tone"]) => {
	if (tone === "attention") {
		return "border-warning/30 bg-warning/10";
	}

	if (tone === "good") {
		return "border-success/30 bg-success/10";
	}

	return "border-border bg-surface-secondary";
};

function MetricPill({ metric }: { metric: DashboardMetric }) {
	const toneClassName = getMetricToneClassName(metric.tone);

	return (
		<Surface
			className={`min-w-[30%] flex-1 gap-1 rounded-[18px] border p-3 ${toneClassName}`}
		>
			<Text color="muted" numberOfLines={1} type="body-xs" weight="semibold">
				{metric.label}
			</Text>
			<Text numberOfLines={1} type="body" weight="bold">
				{metric.value}
			</Text>
		</Surface>
	);
}

export function TripHero({ model }: { model: TripDashboardModel }) {
	const { readiness, travelerLabel, tripWindow, workspace } = model;
	const destinationLine = `Origin TBD -> ${workspace.trip.destination}`;

	return (
		<View className="gap-3">
			<RouteHeader
				icon="map-outline"
				rightContent={
					<View className="flex-row gap-2">
						<LinkButton href={VIYA_ROUTES.viya as Href} icon="sparkles-outline">
							Ask
						</LinkButton>
						<LinkButton
							href={VIYA_ROUTES.tripWrapped(model.tripId)}
							icon="share-outline"
						>
							Share
						</LinkButton>
					</View>
				}
				subtitle="A focused board for this trip."
				title="Trip"
			/>
			<Surface className="overflow-hidden rounded-[30px] border border-border bg-surface">
				<View className="gap-4 p-5">
					<View className="gap-1">
						<Text.Heading type="h2" weight="semibold">
							{workspace.trip.title}
						</Text.Heading>
						<Text color="muted" type="body">
							{destinationLine}
						</Text>
						<Text color="muted" type="body-sm">
							{tripWindow} - {readiness.score}% ready - {travelerLabel}
						</Text>
					</View>
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>{readiness.label}</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>{workspace.trip.status}</Chip.Label>
						</Chip>
					</View>
				</View>
				<View
					className="h-1.5 bg-primary"
					style={{ width: `${readiness.score}%` }}
				/>
			</Surface>
		</View>
	);
}

export function StatusStrip({ metrics }: { metrics: DashboardMetric[] }) {
	return (
		<View className="flex-row gap-2">
			{metrics.map((metric) => (
				<MetricPill key={metric.label} metric={metric} />
			))}
		</View>
	);
}

export function NextActionCard({
	model,
	onSelectTab,
}: {
	model: TripDashboardModel;
	onSelectTab: (tab: TripTab) => void;
}) {
	return (
		<Surface className="gap-4 rounded-[26px] border border-primary/20 bg-primary/10 p-4">
			<View className="flex-row items-start gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
					<Ionicons color="#FFFFFF" name={model.nextAction.icon} size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						NEXT BEST ACTION
					</Text>
					<Text type="body" weight="bold">
						{model.nextAction.title}
					</Text>
					<Text color="muted" type="body-sm">
						{model.nextAction.description}
					</Text>
				</View>
			</View>
			<View className="flex-row flex-wrap gap-2">
				<LinkButton href={model.nextAction.href} variant="primary">
					Open
				</LinkButton>
				<Button
					onPress={() => onSelectTab(model.nextAction.tab)}
					size="sm"
					variant="secondary"
				>
					<Button.Label>See context</Button.Label>
				</Button>
			</View>
		</Surface>
	);
}

function QuickActionButton({
	action,
	onSelectTab,
}: {
	action: DashboardAction;
	onSelectTab: (tab: TripTab) => void;
}) {
	const button = (
		<Button
			className="min-w-[112px]"
			onPress={
				action.tab ? () => onSelectTab(action.tab as TripTab) : undefined
			}
			size="sm"
			variant="secondary"
		>
			<Ionicons color="#0A84FF" name={action.icon} size={16} />
			<Button.Label>{action.label}</Button.Label>
		</Button>
	);

	if (!action.href) {
		return button;
	}

	return (
		<Link asChild href={action.href}>
			{button}
		</Link>
	);
}

export function QuickActions({
	actions,
	onSelectTab,
}: {
	actions: DashboardAction[];
	onSelectTab: (tab: TripTab) => void;
}) {
	return (
		<View className="gap-2">
			<Text className="px-1" color="muted" type="body-xs" weight="semibold">
				QUICK ACTIONS
			</Text>
			<ScrollView
				contentContainerStyle={{ gap: 8, paddingRight: 8 }}
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{actions.map((action) => (
					<QuickActionButton
						action={action}
						key={action.label}
						onSelectTab={onSelectTab}
					/>
				))}
			</ScrollView>
		</View>
	);
}

function TabButton({
	count,
	isActive,
	onPress,
	tab,
}: {
	count?: number;
	isActive: boolean;
	onPress: () => void;
	tab: DashboardTab;
}) {
	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityState={{ selected: isActive }}
			className={[
				"h-11 flex-row items-center gap-2 rounded-full border px-4",
				isActive
					? "border-primary bg-primary"
					: "border-border bg-surface-secondary",
			].join(" ")}
			onPress={onPress}
		>
			<Ionicons
				color={isActive ? "#FFFFFF" : "#0A84FF"}
				name={tab.icon}
				size={16}
			/>
			<Text
				className={isActive ? "text-white" : ""}
				type="body-sm"
				weight="semibold"
			>
				{tab.label}
			</Text>
			{count ? (
				<Text
					className={isActive ? "text-white" : ""}
					color={isActive ? undefined : "muted"}
					type="body-xs"
				>
					{count}
				</Text>
			) : null}
		</Pressable>
	);
}

export function TripTabPicker({
	activeTab,
	model,
	onSelectTab,
}: {
	activeTab: TripTab;
	model: TripDashboardModel;
	onSelectTab: (tab: TripTab) => void;
}) {
	return (
		<View className="gap-2">
			<Text className="px-1" color="muted" type="body-xs" weight="semibold">
				FOCUS
			</Text>
			<ScrollView
				contentContainerStyle={{ gap: 8, paddingRight: 8 }}
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{model.tabs.map((tab) => (
					<TabButton
						count={model.tabCounts[tab.id]}
						isActive={tab.id === activeTab}
						key={tab.id}
						onPress={() => onSelectTab(tab.id)}
						tab={tab}
					/>
				))}
			</ScrollView>
		</View>
	);
}

export function InfoRow({
	detail,
	icon,
	label,
	right,
}: {
	detail?: string;
	icon?: IoniconName;
	label: string;
	right?: string;
}) {
	return (
		<View className="flex-row items-center gap-3 rounded-[18px] bg-surface-secondary p-3">
			{icon ? (
				<View className="h-8 w-8 items-center justify-center rounded-full bg-surface">
					<Ionicons color="#0A84FF" name={icon} size={16} />
				</View>
			) : null}
			<View className="min-w-0 flex-1">
				<Text numberOfLines={1} type="body-sm" weight="semibold">
					{label}
				</Text>
				{detail ? (
					<Text color="muted" numberOfLines={1} type="body-xs">
						{detail}
					</Text>
				) : null}
			</View>
			{right ? (
				<Text color="muted" numberOfLines={1} type="body-xs">
					{right}
				</Text>
			) : null}
		</View>
	);
}
