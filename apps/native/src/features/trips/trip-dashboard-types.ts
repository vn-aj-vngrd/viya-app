import type { Ionicons } from "@expo/vector-icons";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import type { TripModuleSummary } from "@viya-app/domain";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";

export type TripTab =
	| "overview"
	| "itinerary"
	| "places"
	| "bookings"
	| "documents"
	| "checklist"
	| "budget"
	| "risks"
	| "companions"
	| "notes"
	| "travel"
	| "memories"
	| "recap";

export type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface TripWorkspace {
	agentDrafts: Doc<"tripAgentDrafts">[];
	bookings: Doc<"bookings">[];
	companions: Doc<"tripCompanions">[];
	documents: Doc<"travelDocuments">[];
	expenses: Doc<"expenses">[];
	itineraryDays: Doc<"itineraryDays">[];
	itineraryItems: Doc<"itineraryItems">[];
	moduleSummaries: TripModuleSummary[];
	moments: Doc<"moments">[];
	notes: Doc<"tripNotes">[];
	readinessItems: Doc<"readinessItems">[];
	risks: Doc<"risks">[];
	savedPlaces: Doc<"savedPlaces">[];
	trip: Doc<"trips">;
	vaultItems: Array<Doc<"vaultItems"> & { url: string | null }>;
}

export interface DashboardAction {
	href?: Href;
	icon: IoniconName;
	label: string;
	tab?: TripTab;
}

export interface DashboardTab {
	icon: IoniconName;
	id: TripTab;
	label: string;
}

export interface DashboardMetric {
	label: string;
	tone?: "attention" | "calm" | "good";
	value: string;
}

export interface MissingItem {
	category: string;
	href: Href;
	title: string;
}

export interface RecentUpdate {
	actionLabel: string;
	createdAt: number;
	href: Href;
	icon: IoniconName;
	message: string;
	tab: TripTab;
}

export interface ScheduledItem {
	date: string;
	day?: Doc<"itineraryDays">;
	item: Doc<"itineraryItems">;
	sortKey: string;
}

export interface NextAction {
	description: string;
	href: Href;
	icon: IoniconName;
	tab: TripTab;
	title: string;
}

export interface BudgetDashboardSummary {
	booked: number;
	categoryBreakdown: Array<{ amount: number; category: string }>;
	dailySafeSpend: number;
	remaining: number;
	spent: number;
	status: string;
	totalTrackedSpend: number;
}

export interface TripCountdown {
	label: string;
	tone: "active" | "complete" | "upcoming";
}

export interface TripDashboardModel {
	activeDocuments: string[];
	bookingsByType: Array<{ items: Doc<"bookings">[]; type: string }>;
	budget: BudgetDashboardSummary;
	currency: string;
	highlights: string[];
	missingItems: MissingItem[];
	nextAction: NextAction;
	nextScheduledItem: ScheduledItem | null;
	nowScheduledItem: ScheduledItem | null;
	openReadinessItems: Doc<"readinessItems">[];
	quickActions: DashboardAction[];
	readiness: {
		label: string;
		openCount: number;
		score: number;
		topBlocker: string;
	};
	readinessByCategory: Array<{
		category: string;
		items: Doc<"readinessItems">[];
	}>;
	recentUpdates: RecentUpdate[];
	statusMetrics: DashboardMetric[];
	tabCounts: Partial<Record<TripTab, number>>;
	tabs: DashboardTab[];
	travelAlertCount: number;
	travelerLabel: string;
	tripCountdown: TripCountdown | null;
	tripId: Id<"trips">;
	tripWindow: string;
	watchOutItems: string[];
	workspace: TripWorkspace;
}
