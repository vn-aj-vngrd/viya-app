import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { palawanDemoTrip } from "@viya-app/domain";
import { useQuery } from "convex/react";
import { Link } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import { VIYA_ROUTES } from "@/src/constants/routes";

const activeTrip = palawanDemoTrip.trip;

const readinessCategories = [
	{ label: "Bookings", score: 72 },
	{ label: "Documents", score: 88 },
	{ label: "Budget", score: 78 },
	{ label: "Packing", score: 64 },
	{ label: "Safety", score: 92 },
] as const;

const timelineItems = [
	{ date: "Jun 10", title: "Flight to Puerto Princesa" },
	{ date: "Jun 10", title: "Hotel check-in" },
	{ date: "Jun 11", title: "Underground River tour" },
	{ date: "Jun 12", title: "Free beach day" },
] as const;

const syncedDocuments = ["Flight confirmation", "Hotel receipt"] as const;
const missingDocuments = ["Tour booking", "Valid ID copy"] as const;

const pesoFormatter = new Intl.NumberFormat("en-PH", {
	currency: "PHP",
	maximumFractionDigits: 0,
	style: "currency",
});

const formatBudget = (amount: number) => pesoFormatter.format(amount);

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
		return "June 10-15 · 5 days";
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
	tripWindow,
	title,
}: {
	title: string;
	tripWindow: string;
}) {
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
					Relaxed beach + light adventure
				</Text.Paragraph>
			</View>

			<View className="gap-3">
				<View className="flex-row gap-3">
					<MetricPill label="Readiness Score" value="82% Ready" />
					<MetricPill label="Budget" value="₱18,400 / ₱30,000" />
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
							Book airport transfer
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

function ViyaRecommendation() {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<SectionTitle title="Viya Recommends" />
			<View className="flex-row gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-[#EAF2FF]">
					<Ionicons color="#0A84FF" name="sparkles" size={18} />
				</View>
				<Text.Paragraph className="flex-1 leading-5" type="body-sm">
					Your hotel confirmation is not synced yet. Upload it so I can update
					your readiness score.
				</Text.Paragraph>
			</View>
			<View className="flex-row flex-wrap gap-2">
				<Link asChild href={VIYA_ROUTES.tripVault}>
					<Button className="flex-1" size="sm">
						<Button.Label>Upload document</Button.Label>
					</Button>
				</Link>
				<Button className="flex-1" size="sm" variant="secondary">
					<Button.Label>Mark as booked</Button.Label>
				</Button>
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
			<View className="gap-3">
				{readinessCategories.map((item) => (
					<View className="gap-1.5" key={item.label}>
						<View className="flex-row items-center justify-between">
							<Text type="body-sm" weight="medium">
								{item.label}
							</Text>
							<Text color="muted" type="body-xs" weight="semibold">
								{item.score}%
							</Text>
						</View>
						<View className="h-2 overflow-hidden rounded-full bg-surface-secondary">
							<View
								className="h-full rounded-full bg-[#0A84FF]"
								style={{ width: `${item.score}%` }}
							/>
						</View>
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
			<View className="gap-3">
				{timelineItems.map((item) => (
					<View className="flex-row items-center gap-3" key={item.title}>
						<Text color="muted" type="body-xs" weight="semibold">
							{item.date}
						</Text>
						<View className="h-2 w-2 rounded-full bg-[#0A84FF]" />
						<Text className="flex-1" type="body-sm" weight="medium">
							{item.title}
						</Text>
					</View>
				))}
			</View>
		</Surface>
	);
}

function DocumentRow({
	name,
	status,
}: {
	name: string;
	status: "missing" | "synced";
}) {
	const isSynced = status === "synced";

	return (
		<View className="flex-row items-center gap-2">
			<Ionicons
				color={isSynced ? "#059669" : "#E97816"}
				name={isSynced ? "checkmark-circle" : "alert-circle"}
				size={17}
			/>
			<Text type="body-sm" weight="medium">
				{name}
			</Text>
		</View>
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
			<View className="flex-row gap-5">
				<View className="flex-1 gap-2">
					<Text color="muted" type="body-xs" weight="semibold">
						SYNCED
					</Text>
					{syncedDocuments.map((item) => (
						<DocumentRow key={item} name={item} status="synced" />
					))}
				</View>
				<View className="flex-1 gap-2">
					<Text color="muted" type="body-xs" weight="semibold">
						MISSING
					</Text>
					{missingDocuments.map((item) => (
						<DocumentRow key={item} name={item} status="missing" />
					))}
				</View>
			</View>
		</Surface>
	);
}

function BudgetSnapshot() {
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
					["Planned", 30_000],
					["Spent", 18_400],
					["Remaining", 11_600],
					["Safe buffer", 5200],
				].map(([label, value]) => (
					<View
						className="w-[47%] gap-1 rounded-2xl bg-surface-secondary p-3"
						key={label}
					>
						<Text color="muted" type="body-xs" weight="medium">
							{label}
						</Text>
						<Text type="body-sm" weight="semibold">
							{formatBudget(value as number)}
						</Text>
					</View>
				))}
			</View>
			<View className="rounded-2xl bg-[#FFF7ED] p-3">
				<Text.Paragraph className="leading-5" type="body-sm">
					You're still within budget, but food spending is trending high.
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
					["Receipts attached", "2"],
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
		</Surface>
	);
}

function EmptyHomeState() {
	const greeting = getTimeGreeting();

	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4" style={{ alignSelf: "stretch" }}>
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

				<Surface className="gap-5 rounded-[34px] border border-border bg-surface p-5">
					<View className="gap-2">
						<Text.Heading type="h2" weight="semibold">
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
						<Link asChild href={VIYA_ROUTES.trips}>
							<Button variant="secondary">
								<Button.Label>Explore demo trip</Button.Label>
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
	const hasTrips = (trips?.length ?? 0) > 0;
	const currentTrip = trips?.[0];
	const greeting = getTimeGreeting();

	if (!hasTrips) {
		return <EmptyHomeState />;
	}

	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4" style={{ alignSelf: "stretch" }}>
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

				<ActiveTripCard
					title={currentTrip?.title ?? activeTrip.title}
					tripWindow={getTripWindow(
						currentTrip?.startDate,
						currentTrip?.endDate
					)}
				/>
				<ViyaRecommendation />
				<ReadinessSnapshot />
				<UpcomingTimeline />
				<TripVaultPreview />
				<BudgetSnapshot />
				<MemoriesTeaser />
			</View>
		</Container>
	);
}
