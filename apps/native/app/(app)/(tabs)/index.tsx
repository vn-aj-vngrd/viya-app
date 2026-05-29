import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Link, useRouter } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import {
	formatReadableTripDateRange,
	getDateRangeDurationDays,
} from "@/src/components/date/date-format-utils";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { ManualTripCreateSheet } from "@/src/features/trips/manual-trip-create-sheet";

const readinessCategories = [
	{ icon: "calendar-outline", label: "Bookings", status: "Needs review" },
	{ icon: "document-text-outline", label: "Documents", status: "Not synced" },
	{ icon: "wallet-outline", label: "Budget", status: "Not tracked" },
	{ icon: "bag-handle-outline", label: "Packing", status: "Not started" },
	{ icon: "shield-checkmark-outline", label: "Safety", status: "Needs review" },
] as const;

type IconName = ComponentProps<typeof Ionicons>["name"];

const activeTripCardStyle = {
	backgroundColor: "#071A2F",
	elevation: 4,
	shadowColor: "#071A2F",
	shadowOffset: { height: 22, width: 0 },
	shadowOpacity: 0.22,
	shadowRadius: 42,
} as const;
const activeTripMutedTextStyle = { color: "#A9B4C0" };
const activeTripSecondaryTextStyle = { color: "#B4BECA" };
const activeTripParagraphStyle = { color: "#D0D7DF" };
const activeTripMetricStyle = { backgroundColor: "#2B3B4E" };
const primarySoftBackgroundStyle = { backgroundColor: "#EAF2FF" };
const warningSoftBackgroundStyle = { backgroundColor: "#FFF7ED" };

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

const getTripWindow = (startDate?: string, endDate?: string) => {
	const tripWindow = formatReadableTripDateRange({
		endDate,
		fallbackLabel: "Dates not set",
		startDate,
	});
	const durationDays =
		startDate && endDate ? getDateRangeDurationDays(startDate, endDate) : null;

	return durationDays
		? `${tripWindow} · ${durationDays} ${durationDays === 1 ? "day" : "days"}`
		: tripWindow;
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
		<View
			className="flex-1 gap-1 rounded-2xl p-3"
			style={activeTripMetricStyle}
		>
			<Text style={activeTripSecondaryTextStyle} type="body-xs" weight="medium">
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
	tripId,
	tripWindow,
	title,
}: {
	budgetAmount?: number;
	budgetCurrency?: string;
	readinessScore: number;
	summary: string;
	tripId: Id<"trips">;
	title: string;
	tripWindow: string;
}) {
	const readinessLabel =
		readinessScore > 0 ? `${readinessScore}% Ready` : "Not checked";

	return (
		<Surface
			className="gap-5 overflow-hidden rounded-[34px] p-5"
			style={activeTripCardStyle}
		>
			<View className="gap-1">
				<Text style={activeTripMutedTextStyle} type="body-xs" weight="semibold">
					ACTIVE TRIP
				</Text>
				<Text.Heading className="text-white" type="h2" weight="semibold">
					{title}
				</Text.Heading>
				<Text
					style={activeTripSecondaryTextStyle}
					type="body-sm"
					weight="medium"
				>
					{tripWindow}
				</Text>
				<Text.Paragraph
					className="mt-2 leading-5"
					style={activeTripParagraphStyle}
					type="body-sm"
				>
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
					<View
						className="h-10 w-10 items-center justify-center rounded-full"
						style={primarySoftBackgroundStyle}
					>
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

			<Link asChild href={VIYA_ROUTES.tripDashboard(tripId)}>
				<Button>
					<Button.Label>Open Trip</Button.Label>
				</Button>
			</Link>
		</Surface>
	);
}

function ViyaRecommendation({
	tripId,
	tripTitle,
}: {
	tripId: Id<"trips">;
	tripTitle: string;
}) {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle title="Viya Recommends" />
			<View className="flex-row gap-3">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={primarySoftBackgroundStyle}
				>
					<Ionicons color="#0A84FF" name="sparkles" size={18} />
				</View>
				<Text.Paragraph className="flex-1 leading-5" type="body-sm">
					Start with a readiness review for {tripTitle}. I can check bookings,
					documents, budget, packing, and safety before you travel.
				</Text.Paragraph>
			</View>
			<View className="flex-row flex-wrap gap-2">
				<Link asChild href={VIYA_ROUTES.tripReadiness(tripId)}>
					<Button className="flex-1" size="sm">
						<Button.Label>Fix readiness</Button.Label>
					</Button>
				</Link>
				<Link asChild href={VIYA_ROUTES.tripVault(tripId)}>
					<Button className="flex-1" size="sm" variant="secondary">
						<Button.Label>Open vault</Button.Label>
					</Button>
				</Link>
				<Link asChild href={VIYA_ROUTES.viya}>
					<Button className="w-full" size="sm" variant="tertiary">
						<Button.Label>Ask Viya</Button.Label>
					</Button>
				</Link>
			</View>
		</Surface>
	);
}

function ReadinessSnapshot({ tripId }: { tripId: Id<"trips"> }) {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle
				action={
					<Link asChild href={VIYA_ROUTES.tripReadiness(tripId)}>
						<Button size="sm" variant="tertiary">
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

function UpcomingTimeline({ tripId }: { tripId: Id<"trips"> }) {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle
				action={
					<Link asChild href={VIYA_ROUTES.tripItinerary(tripId)}>
						<Button size="sm" variant="tertiary">
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

function TripVaultPreview({ tripId }: { tripId: Id<"trips"> }) {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle
				action={
					<Link asChild href={VIYA_ROUTES.tripVault(tripId)}>
						<Button size="sm" variant="tertiary">
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
				<View
					className="flex-row items-center gap-3 rounded-2xl p-3"
					style={warningSoftBackgroundStyle}
				>
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
						<Button size="sm" variant="tertiary">
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
			<View className="rounded-2xl p-3" style={warningSoftBackgroundStyle}>
				<Text.Paragraph className="leading-5" type="body-sm">
					Add expenses so Viya can watch your budget and warn you before
					spending gets tight.
				</Text.Paragraph>
			</View>
		</Surface>
	);
}

function MemoriesTeaser({ tripId }: { tripId: Id<"trips"> }) {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle
				action={
					<Link asChild href={VIYA_ROUTES.tripWrapped(tripId)}>
						<Button size="sm" variant="tertiary">
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
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-row items-center gap-4 bg-background px-4 pb-3"
			style={{ alignSelf: "stretch" }}
		>
			<View
				className="flex-1 flex-row items-center gap-4"
				style={{ paddingTop: Math.max(insets.top, 12) }}
			>
				<Text.Heading type="h2" weight="semibold">
					{greeting}
				</Text.Heading>
				<View style={{ marginLeft: "auto" }}>
					<AccountAvatarButton size={44} />
				</View>
			</View>
		</View>
	);
}

function StickyHomeShell({
	children,
	greeting,
}: {
	children: ReactNode;
	greeting: string;
}) {
	return (
		<Container className="pb-28" isScrollable={false}>
			<HomeHeader greeting={greeting} />
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					gap: 16,
					paddingBottom: 112,
					paddingHorizontal: 16,
					paddingTop: 4,
				}}
				contentInsetAdjustmentBehavior="automatic"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{children}
			</ScrollView>
		</Container>
	);
}

function HomeLoadingState() {
	const greeting = getTimeGreeting();

	return (
		<StickyHomeShell greeting={greeting}>
			<Surface className="gap-4 rounded-[34px] border border-border bg-surface p-5">
				<View className="h-4 w-24 rounded-full bg-surface-secondary" />
				<View className="h-8 w-3/4 rounded-full bg-surface-secondary" />
				<View className="h-4 w-full rounded-full bg-surface-secondary" />
				<View className="h-4 w-2/3 rounded-full bg-surface-secondary" />
			</Surface>
		</StickyHomeShell>
	);
}

function EmptyHomeState() {
	const greeting = getTimeGreeting();
	const router = useRouter();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
	const handlePlanWithViya = () => {
		setIsCreateSheetOpen(false);
		router.push({
			params: { mode: "plan" },
			pathname: "/(app)/(tabs)/viya",
		});
	};

	return (
		<Container className="pb-28" isScrollable={false}>
			<HomeHeader greeting={greeting} />
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					paddingBottom: 112,
					paddingHorizontal: 16,
					paddingTop: 4,
				}}
				contentInsetAdjustmentBehavior="automatic"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
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
						<Button onPress={() => setIsCreateSheetOpen(true)}>
							<Button.Label>Create manually</Button.Label>
						</Button>
						<Link
							asChild
							href={{
								params: { mode: "plan" },
								pathname: "/(app)/(tabs)/viya",
							}}
						>
							<Button variant="secondary">
								<Button.Label>Plan with Viya</Button.Label>
							</Button>
						</Link>
					</View>
				</Surface>
			</ScrollView>
			<ManualTripCreateSheet
				isOpen={isCreateSheetOpen}
				onCreated={(tripId) => {
					router.push(VIYA_ROUTES.tripDashboard(tripId));
				}}
				onOpenChange={setIsCreateSheetOpen}
				onPlanWithViya={handlePlanWithViya}
			/>
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
		<StickyHomeShell greeting={greeting}>
			<ActiveTripCard
				budgetAmount={currentTrip.budgetAmount}
				budgetCurrency={currentTrip.budgetCurrency}
				readinessScore={currentTrip.readinessScore}
				summary={currentTrip.summary}
				title={currentTrip.title}
				tripId={currentTrip._id}
				tripWindow={getTripWindow(currentTrip.startDate, currentTrip.endDate)}
			/>
			<ViyaRecommendation
				tripId={currentTrip._id}
				tripTitle={currentTrip.title}
			/>
			<ReadinessSnapshot tripId={currentTrip._id} />
			<UpcomingTimeline tripId={currentTrip._id} />
			<TripVaultPreview tripId={currentTrip._id} />
			<BudgetSnapshot
				budgetAmount={currentTrip.budgetAmount}
				budgetCurrency={currentTrip.budgetCurrency}
			/>
			<MemoriesTeaser tripId={currentTrip._id} />
		</StickyHomeShell>
	);
}
