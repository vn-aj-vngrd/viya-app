import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Link } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import { VIYA_ROUTES } from "@/src/constants/routes";

const readinessCategories = [
	{ icon: "calendar-outline", label: "Bookings", status: "Needs review" },
	{ icon: "document-text-outline", label: "Documents", status: "Not synced" },
	{ icon: "wallet-outline", label: "Budget", status: "Not tracked" },
	{ icon: "bag-handle-outline", label: "Packing", status: "Not started" },
	{ icon: "shield-checkmark-outline", label: "Safety", status: "Needs review" },
] as const;

type IconName = ComponentProps<typeof Ionicons>["name"];

const makeCurrencyFormatter = (currency: string) =>
	new Intl.NumberFormat("en-PH", {
		currency,
		maximumFractionDigits: 0,
		style: "currency",
	});

const formatBudget = (amount?: number, currency = "PHP") => {
	if (typeof amount !== "number") {
		return "Not set";
	}

	return makeCurrencyFormatter(currency).format(amount);
};

const getTimeGreeting = () => {
	const hour = new Date().getHours();

	if (hour < 12) {
		return "Good morning";
	}

	if (hour < 18) {
		return "Good afternoon";
	}

	return "Good evening";
};

const formatTripDate = (date: string) => {
	const [, month, day] = date.split("-").map(Number);
	const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
		new Date(Date.UTC(2026, (month ?? 1) - 1, day ?? 1))
	);

	return `${monthName} ${day ?? 1}`;
};

const getTripWindow = (startDate?: string, endDate?: string) => {
	if (!(startDate && endDate)) {
		return "Dates not set";
	}

	const start = new Date(`${startDate}T00:00:00.000Z`);
	const end = new Date(`${endDate}T00:00:00.000Z`);
	const durationDays = Math.max(
		1,
		Math.round((end.getTime() - start.getTime()) / 86_400_000)
	);
	const startLabel = formatTripDate(startDate);
	const endDay = Number(endDate.split("-")[2] ?? 15);

	return `${startLabel}-${endDay} · ${durationDays} days`;
};

const getNextAction = (readinessScore: number) => {
	if (readinessScore <= 0) {
		return "Start readiness review";
	}

	if (readinessScore < 100) {
		return "Review open trip gaps";
	}

	return "Open trip plan";
};

function SectionTitle({
	action,
	title,
}: {
	action?: ReactNode;
	title: string;
}) {
	return (
		<View className="flex-row items-center justify-between gap-4">
			<Text.Heading type="h5" weight="semibold">
				{title}
			</Text.Heading>
			{action}
		</View>
	);
}

function MetricPill({ label, value }: { label: string; value: string }) {
	return (
		<View className="flex-1 gap-1 rounded-2xl bg-white/14 p-3">
			<Text className="text-white/72" type="body-xs" weight="medium">
				{label}
			</Text>
			<Text className="text-white" type="body-sm" weight="semibold">
				{value}
			</Text>
		</View>
	);
}

function ActiveTripCard({
	budgetAmount,
	budgetCurrency,
	readinessScore,
	summary,
	tripWindow,
	title,
}: {
	budgetAmount?: number;
	budgetCurrency?: string;
	readinessScore: number;
	summary: string;
	title: string;
	tripWindow: string;
}) {
	const readinessLabel =
		readinessScore > 0 ? `${readinessScore}% Ready` : "Not checked";

	return (
		<Surface
			className="gap-5 overflow-hidden rounded-[34px] bg-[#071A2F] p-5"
			style={{ boxShadow: "0 22px 42px rgba(7, 26, 47, 0.22)" }}
		>
			<View className="gap-1">
				<Text className="text-white/68" type="body-xs" weight="semibold">
					ACTIVE TRIP
				</Text>
				<Text.Heading className="text-white" type="h2" weight="semibold">
					{title}
				</Text.Heading>
				<Text className="text-white/72" type="body-sm" weight="medium">
					{tripWindow}
				</Text>
				<Text.Paragraph className="mt-2 text-white/82 leading-5" type="body-sm">
					{summary}
				</Text.Paragraph>
			</View>

			<View className="gap-3">
				<View className="flex-row gap-3">
					<MetricPill label="Readiness" value={readinessLabel} />
					<MetricPill
						label="Budget"
						value={formatBudget(budgetAmount, budgetCurrency)}
					/>
				</View>
				<View className="flex-row items-center gap-3 rounded-3xl bg-white p-4">
					<View className="h-10 w-10 items-center justify-center rounded-full bg-[#EAF2FF]">
						<Ionicons color="#0A84FF" name="flash-outline" size={18} />
					</View>
					<View className="flex-1">
						<Text color="muted" type="body-xs" weight="medium">
							Next action
						</Text>
						<Text type="body-sm" weight="semibold">
							{getNextAction(readinessScore)}
						</Text>
					</View>
				</View>
			</View>

			<Link asChild href={VIYA_ROUTES.trips}>
				<Button>
					<Button.Label>Open Trip</Button.Label>
				</Button>
			</Link>
		</Surface>
	);
}

function ViyaRecommendation({ tripTitle }: { tripTitle: string }) {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle title="Viya Recommends" />
			<View className="flex-row gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-[#EAF2FF]">
					<Ionicons color="#0A84FF" name="sparkles" size={18} />
				</View>
				<Text.Paragraph className="flex-1 leading-5" type="body-sm">
					Start with a readiness review for {tripTitle}. I can check bookings,
					documents, budget, packing, and safety before you travel.
				</Text.Paragraph>
			</View>
			<View className="flex-row flex-wrap gap-2">
				<Link asChild href={VIYA_ROUTES.tripReadiness}>
					<Button className="flex-1" size="sm">
						<Button.Label>Fix readiness</Button.Label>
					</Button>
				</Link>
				<Link asChild href={VIYA_ROUTES.tripVault}>
					<Button className="flex-1" size="sm" variant="secondary">
						<Button.Label>Open vault</Button.Label>
					</Button>
				</Link>
				<Link asChild href={VIYA_ROUTES.viya}>
					<Button className="w-full" size="sm" variant="ghost">
						<Button.Label>Ask Viya</Button.Label>
					</Button>
				</Link>
			</View>
		</Surface>
	);
}

function ReadinessSnapshot() {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle
				action={
					<Link asChild href={VIYA_ROUTES.tripReadiness}>
						<Button size="sm" variant="ghost">
							<Button.Label>Fix my readiness</Button.Label>
						</Button>
					</Link>
				}
				title="Readiness Snapshot"
			/>
			<View className="flex-row flex-wrap gap-3">
				{readinessCategories.map((item) => (
					<View
						className="w-[47%] gap-2 rounded-2xl bg-surface-secondary p-3"
						key={item.label}
					>
						<View className="h-9 w-9 items-center justify-center rounded-full bg-white">
							<Ionicons
								color="#0A84FF"
								name={item.icon as IconName}
								size={17}
							/>
						</View>
						<Text type="body-sm" weight="semibold">
							{item.label}
						</Text>
						<Text color="muted" type="body-xs" weight="medium">
							{item.status}
						</Text>
					</View>
				))}
			</View>
		</Surface>
	);
}

function UpcomingTimeline() {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle
				action={
					<Link asChild href={VIYA_ROUTES.tripItinerary}>
						<Button size="sm" variant="ghost">
							<Button.Label>View itinerary</Button.Label>
						</Button>
					</Link>
				}
				title="Upcoming Timeline"
			/>
			<View className="flex-row gap-3 rounded-3xl bg-surface-secondary p-4">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-white">
					<Ionicons color="#0A84FF" name="time-outline" size={18} />
				</View>
				<View className="flex-1 gap-1">
					<Text type="body-sm" weight="semibold">
						No itinerary events yet
					</Text>
					<Text.Paragraph color="muted" type="body-sm">
						Add flights, stays, and activities to build your trip timeline.
					</Text.Paragraph>
				</View>
			</View>
		</Surface>
	);
}

function TripVaultPreview() {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle
				action={
					<Link asChild href={VIYA_ROUTES.tripVault}>
						<Button size="sm" variant="ghost">
							<Button.Label>Open vault</Button.Label>
						</Button>
					</Link>
				}
				title="Trip Vault"
			/>
			<View className="gap-3">
				<View className="flex-row items-center gap-3 rounded-2xl bg-surface-secondary p-3">
					<Ionicons color="#0A84FF" name="cloud-upload-outline" size={19} />
					<View className="flex-1">
						<Text type="body-sm" weight="semibold">
							No synced documents yet
						</Text>
						<Text color="muted" type="body-xs">
							Upload confirmations, IDs, receipts, or booking files.
						</Text>
					</View>
				</View>
				<View className="flex-row items-center gap-3 rounded-2xl bg-[#FFF7ED] p-3">
					<Ionicons color="#E97816" name="alert-circle-outline" size={19} />
					<View className="flex-1">
						<Text type="body-sm" weight="semibold">
							Missing items will appear here
						</Text>
						<Text color="muted" type="body-xs">
							Viya can flag gaps once your trip details are added.
						</Text>
					</View>
				</View>
			</View>
		</Surface>
	);
}

function BudgetSnapshot({
	budgetAmount,
	budgetCurrency,
}: {
	budgetAmount?: number;
	budgetCurrency?: string;
}) {
	const plannedBudget = formatBudget(budgetAmount, budgetCurrency);

	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle
				action={
					<Link asChild href={VIYA_ROUTES.viya}>
						<Button size="sm" variant="ghost">
							<Button.Label>Add expense</Button.Label>
						</Button>
					</Link>
				}
				title="Budget Snapshot"
			/>
			<View className="flex-row flex-wrap gap-3">
				{[
					["Planned", plannedBudget],
					["Spent", "Not tracked"],
					["Remaining", "Pending"],
					["Safe buffer", "Pending"],
				].map(([label, value]) => (
					<View
						className="w-[47%] gap-1 rounded-2xl bg-surface-secondary p-3"
						key={label}
					>
						<Text color="muted" type="body-xs" weight="medium">
							{label}
						</Text>
						<Text type="body-sm" weight="semibold">
							{value}
						</Text>
					</View>
				))}
			</View>
			<View className="rounded-2xl bg-[#FFF7ED] p-3">
				<Text.Paragraph className="leading-5" type="body-sm">
					Add expenses so Viya can watch your budget and warn you before
					spending gets tight.
				</Text.Paragraph>
			</View>
		</Surface>
	);
}

function MemoriesTeaser() {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle
				action={
					<Link asChild href={VIYA_ROUTES.tripWrapped}>
						<Button size="sm" variant="ghost">
							<Button.Label>Create Viya Wrapped</Button.Label>
						</Button>
					</Link>
				}
				title="Memories"
			/>
			<View className="flex-row gap-3">
				{[
					["Photos saved", "0"],
					["Notes captured", "0"],
					["Receipts attached", "0"],
				].map(([label, value]) => (
					<View
						className="flex-1 gap-1 rounded-2xl bg-surface-secondary p-3"
						key={label}
					>
						<Text type="body-sm" weight="semibold">
							{value}
						</Text>
						<Text color="muted" type="body-xs">
							{label}
						</Text>
					</View>
				))}
			</View>
			<Text.Paragraph color="muted" type="body-sm">
				Your trip memories will unlock after photos, notes, or receipts are
				added.
			</Text.Paragraph>
		</Surface>
	);
}

function HomeHeader({ greeting }: { greeting: string }) {
	return (
		<View
			className="flex-row items-center gap-4"
			style={{ alignSelf: "stretch" }}
		>
			<Text.Heading type="h2" weight="semibold">
				{greeting}
			</Text.Heading>
			<View style={{ marginLeft: "auto" }}>
				<AccountAvatarButton size={44} />
			</View>
		</View>
	);
}

function HomeLoadingState() {
	const greeting = getTimeGreeting();

	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4" style={{ alignSelf: "stretch" }}>
				<HomeHeader greeting={greeting} />
				<Surface className="gap-4 rounded-[34px] border border-border bg-surface p-5">
					<View className="h-4 w-24 rounded-full bg-surface-secondary" />
					<View className="h-8 w-3/4 rounded-full bg-surface-secondary" />
					<View className="h-4 w-full rounded-full bg-surface-secondary" />
					<View className="h-4 w-2/3 rounded-full bg-surface-secondary" />
				</Surface>
			</View>
		</Container>
	);
}

function EmptyHomeState() {
	const greeting = getTimeGreeting();

	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4" style={{ alignSelf: "stretch" }}>
				<HomeHeader greeting={greeting} />

				<Surface className="gap-5 rounded-[34px] border border-border bg-surface p-5">
					<View className="gap-2">
						<Text.Heading type="h3" weight="semibold">
							Plan your first trip with Viya
						</Text.Heading>
						<Text.Paragraph className="leading-5" color="muted" type="body-sm">
							Tell Viya your destination, budget, dates, or travel mood. Viya
							will help you turn it into a real trip plan.
						</Text.Paragraph>
					</View>
					<View className="gap-3">
						<Link asChild href={VIYA_ROUTES.viya}>
							<Button>
								<Button.Label>Plan my first trip</Button.Label>
							</Button>
						</Link>
					</View>
				</Surface>
			</View>
		</Container>
	);
}

export default function HomeScreen() {
	const trips = useQuery(api.trips.listTrips);
	const greeting = getTimeGreeting();

	if (trips === undefined) {
		return <HomeLoadingState />;
	}

	const realTrips = trips.filter((trip) => !trip.isDemo);
	const currentTrip = realTrips[0];

	if (!currentTrip) {
		return <EmptyHomeState />;
	}

	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4" style={{ alignSelf: "stretch" }}>
				<HomeHeader greeting={greeting} />

				<ActiveTripCard
					budgetAmount={currentTrip.budgetAmount}
					budgetCurrency={currentTrip.budgetCurrency}
					readinessScore={currentTrip.readinessScore}
					summary={currentTrip.summary}
					title={currentTrip.title}
					tripWindow={getTripWindow(currentTrip.startDate, currentTrip.endDate)}
				/>
				<ViyaRecommendation tripTitle={currentTrip.title} />
				<ReadinessSnapshot />
				<UpcomingTimeline />
				<TripVaultPreview />
				<BudgetSnapshot
					budgetAmount={currentTrip.budgetAmount}
					budgetCurrency={currentTrip.budgetCurrency}
				/>
				<MemoriesTeaser />
			</View>
		</Container>
	);
}
