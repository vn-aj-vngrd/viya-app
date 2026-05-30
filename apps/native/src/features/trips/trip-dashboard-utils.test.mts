import { describe, expect, test } from "bun:test";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";

import type { TripTab, TripWorkspace } from "./trip-dashboard-types";
import { createTripDashboardModel } from "./trip-dashboard-utils";

const tripId = "trip_123" as Id<"trips">;
const dayId = "day_123" as Id<"itineraryDays">;

const createWorkspace = (): TripWorkspace => ({
	agentDrafts: [],
	bookings: [
		{
			_id: "booking_123",
			_creationTime: 1,
			confirmationCode: "ABC123",
			cost: 18_000,
			currency: "PHP",
			status: "confirmed",
			title: "Flight to Cebu",
			tripId,
			type: "flight",
			updatedAt: 10,
		} as unknown as TripWorkspace["bookings"][number],
	],
	companions: [
		{
			_id: "companion_123",
			_creationTime: 1,
			email: "maya@example.com",
			name: "Maya",
			phone: "",
			role: "organizer",
			tripId,
		} as unknown as TripWorkspace["companions"][number],
	],
	documents: [
		{
			_id: "document_123",
			_creationTime: 1,
			status: "verified",
			title: "Passport copy",
			tripId,
			type: "id",
		} as unknown as TripWorkspace["documents"][number],
	],
	expenses: [
		{
			_id: "expense_123",
			_creationTime: 1,
			amount: 1500,
			category: "food",
			createdAt: 20,
			currency: "PHP",
			title: "Dinner deposit",
			tripId,
		} as unknown as TripWorkspace["expenses"][number],
	],
	itineraryDays: [
		{
			_id: dayId,
			_creationTime: 1,
			date: "2026-06-10",
			dayNumber: 1,
			estimatedCost: 5000,
			pace: "balanced",
			summary: "Arrival and check-in",
			theme: "Arrival",
			title: "Arrival day",
			tripId,
			weatherNote: "",
		} as unknown as TripWorkspace["itineraryDays"][number],
	],
	itineraryItems: [
		{
			_id: "item_123",
			_creationTime: 1,
			category: "activity",
			dayId,
			estimatedCost: 3000,
			locationName: "Cebu City",
			startTime: "09:00",
			status: "planned",
			title: "Old town walk",
			tripId,
		} as unknown as TripWorkspace["itineraryItems"][number],
	],
	moduleSummaries: [],
	moments: [
		{
			_id: "moment_123",
			_creationTime: 1,
			caption: "First sunset",
			createdAt: 30,
			isHighlight: true,
			locationName: "Cebu",
			note: "Arrival memory",
			title: "Sunset arrival",
			tripId,
		} as unknown as TripWorkspace["moments"][number],
	],
	notes: [
		{
			_id: "note_123",
			_creationTime: 1,
			body: "Keep tickets offline.",
			category: "document",
			title: "Offline tickets",
			tripId,
			updatedAt: 40,
		} as unknown as TripWorkspace["notes"][number],
	],
	readinessItems: [
		{
			_id: "readiness_123",
			_creationTime: 1,
			aiReason: "Important before departure",
			category: "documents",
			description: "Save copies of travel documents.",
			dueDate: "2026-06-08",
			priority: "high",
			source: "manual",
			status: "todo",
			title: "Save document copies",
			tripId,
		} as unknown as TripWorkspace["readinessItems"][number],
	],
	risks: [
		{
			_id: "risk_123",
			_creationTime: 1,
			severity: "high",
			status: "open",
			suggestedAction: "Leave a transfer buffer.",
			title: "Tight transfer",
			tripId,
			type: "transport",
		} as unknown as TripWorkspace["risks"][number],
	],
	savedPlaces: [
		{
			_id: "place_123",
			_creationTime: 1,
			category: "food",
			locationName: "Cebu City",
			title: "Dinner spot",
			tripId,
		} as unknown as TripWorkspace["savedPlaces"][number],
	],
	trip: {
		_id: tripId,
		_creationTime: 1,
		budgetAmount: 50_000,
		budgetCurrency: "PHP",
		destination: "Cebu, Philippines",
		endDate: "2026-06-15",
		groupType: "couple",
		pace: "balanced",
		startDate: "2026-06-10",
		status: "planning",
		summary: "A Cebu city and coast plan.",
		title: "Cebu Escape",
		travelStyle: "balanced",
	} as unknown as TripWorkspace["trip"],
	vaultItems: [
		{
			_id: "vault_123",
			_creationTime: 1,
			createdAt: 50,
			fileName: "flight.pdf",
			kind: "booking",
			status: "synced",
			title: "Flight PDF",
			tripId,
			url: null,
		} as unknown as TripWorkspace["vaultItems"][number],
	],
});

describe("trip dashboard model module coverage", () => {
	test("exposes every trip module as a dashboard tab", () => {
		const model = createTripDashboardModel({
			tripId,
			workspace: createWorkspace(),
		});
		const expectedTabs: TripTab[] = [
			"overview",
			"itinerary",
			"places",
			"bookings",
			"documents",
			"checklist",
			"budget",
			"risks",
			"companions",
			"notes",
			"travel",
			"memories",
			"recap",
		];

		expect(model.tabs.map((tab) => tab.id)).toEqual(expectedTabs);
	});

	test("counts every editable trip module for dashboard badges", () => {
		const model = createTripDashboardModel({
			tripId,
			workspace: createWorkspace(),
		});

		expect(model.tabCounts).toMatchObject({
			bookings: 1,
			budget: 1,
			checklist: 1,
			companions: 1,
			documents: 2,
			itinerary: 1,
			memories: 1,
			notes: 1,
			places: 2,
			risks: 1,
			travel: 2,
		});
	});

	test("routes recent dashboard activity back to source modules", () => {
		const workspace = createWorkspace();
		workspace.notes = [];
		const model = createTripDashboardModel({ tripId, workspace });

		expect(
			model.recentUpdates.map((update) => ({
				actionLabel: update.actionLabel,
				pathname:
					typeof update.href === "string" ? update.href : update.href.pathname,
				tab: update.tab,
			}))
		).toEqual([
			{
				actionLabel: "Open file",
				pathname: "/(app)/trips/[tripId]/vault",
				tab: "documents",
			},
			{
				actionLabel: "Open memory",
				pathname: "/(app)/trips/[tripId]/moments",
				tab: "memories",
			},
			{
				actionLabel: "Open expense",
				pathname: "/(app)/trips/[tripId]/budget",
				tab: "budget",
			},
			{
				actionLabel: "Open booking",
				pathname: "/(app)/trips/[tripId]/bookings",
				tab: "bookings",
			},
		]);
	});

	test("keeps travel alert count uncapped while preview stays compact", () => {
		const workspace = createWorkspace();
		workspace.risks = Array.from({ length: 6 }, (_, index) => ({
			_id: `risk_${index}`,
			_creationTime: index,
			severity: "medium",
			status: "open",
			suggestedAction: "Create a backup plan.",
			title: `Risk ${index + 1}`,
			tripId,
			type: "schedule",
		})) as unknown as TripWorkspace["risks"];
		const model = createTripDashboardModel({
			tripId,
			workspace,
		});

		expect(model.watchOutItems).toHaveLength(4);
		expect(model.travelAlertCount).toBe(7);
		expect(model.tabCounts).toMatchObject({
			risks: 6,
			travel: 7,
		});
	});

	test("orders dashboard readiness gaps by shared review urgency", () => {
		const workspace = createWorkspace();
		workspace.readinessItems = [
			{
				_id: "readiness_later_high",
				_creationTime: 3,
				aiReason: "High priority but later.",
				category: "safety",
				description: "Confirm emergency contacts.",
				dueDate: "2026-06-12",
				priority: "high",
				source: "manual",
				status: "todo",
				title: "Confirm emergency contacts",
				tripId,
			},
			{
				_id: "readiness_earlier_high",
				_creationTime: 2,
				aiReason: "Same priority and status but earlier due date.",
				category: "documents",
				description: "Upload passport copy.",
				dueDate: "2026-06-07",
				priority: "high",
				source: "manual",
				status: "todo",
				title: "Upload passport copy",
				tripId,
			},
			{
				_id: "readiness_done_critical",
				_creationTime: 1,
				aiReason: "Already handled.",
				category: "bookings",
				description: "Booking proof saved.",
				dueDate: "2026-06-01",
				priority: "critical",
				source: "manual",
				status: "done",
				title: "Save booking proof",
				tripId,
			},
		] as unknown as TripWorkspace["readinessItems"];
		const model = createTripDashboardModel({ tripId, workspace });

		expect(model.openReadinessItems.map((item) => `${item._id}`)).toEqual([
			"readiness_earlier_high",
			"readiness_later_high",
		]);
		expect(model.readiness.topBlocker).toBe("Upload passport copy");
		expect(model.workspace.readinessItems.map((item) => `${item._id}`)).toEqual(
			[
				"readiness_earlier_high",
				"readiness_later_high",
				"readiness_done_critical",
			]
		);
	});
});
