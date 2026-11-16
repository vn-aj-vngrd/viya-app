import type { Ionicons } from "@expo/vector-icons";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import type {
	TripCountdown,
	TripModuleSummary,
	TripPhase,
} from "@viya-app/domain";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";

export type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** A pending Viya draft with plain lines saying what applying it changes. */
export type TripAgentDraftForReview = Doc<"tripAgentDrafts"> & {
	previewLines?: string[];
};

export interface TripWorkspace {
	agentDrafts: TripAgentDraftForReview[];
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
	title: string;
}

export interface TripDashboardModel {
	bookings: { booked: number; nextToBookTitle: string | null; total: number };
	budget: {
		amount: number;
		dailySafeSpend: number;
		hasBudget: boolean;
		left: number;
		over: number;
		spent: number;
	};
	countdown: TripCountdown;
	countdownLabel: string;
	currency: string;
	itinerary: { plannedDays: number; stops: number; tripDays: number | null };
	nextAction: NextAction;
	nextScheduledItem: ScheduledItem | null;
	nowScheduledItem: ScheduledItem | null;
	openReadinessItems: Doc<"readinessItems">[];
	phase: TripPhase;
	phaseLabel: string;
	phaseStatus: string;
	places: { saved: number; unassigned: number };
	readiness: {
		active: number;
		done: number;
		openCount: number;
		overdue: number;
		percent: number | null;
	};
	risks: { open: number; topTitle: string | null };
	todayKey: string;
	travelerCount: number | null;
	tripFacts: string;
	tripId: Id<"trips">;
	vault: { files: number; missingDocuments: number };
	workspace: TripWorkspace;
}
