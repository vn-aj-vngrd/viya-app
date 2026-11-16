import { describe, expect, test } from "bun:test";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";

import type { TripWorkspace } from "./trip-dashboard-types";
import { createTripDashboardModel } from "./trip-dashboard-utils";

const tripId = "trip_123" as Id<"trips">;
const dayId = "day_123" as Id<"itineraryDays">;
const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
	const nextDate = new Date(date);
	nextDate.setUTCDate(nextDate.getUTCDate() + days);
	return nextDate;
};

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
	test("counts every module for the dashboard rows", () => {
		const model = createTripDashboardModel({
			tripId,
			workspace: createWorkspace(),
		});

		expect(model.bookings).toMatchObject({ booked: 1, total: 1 });
		expect(model.places).toEqual({ saved: 1, unassigned: 1 });
		expect(model.vault.files).toBe(1);
		expect(model.risks).toEqual({ open: 1, topTitle: "Tight transfer" });
		expect(model.travelerCount).toBe(2);
		expect(model.itinerary.stops).toBe(1);
	});

	test("counts bookings marked booked externally as booked", () => {
		const workspace = createWorkspace();
		workspace.bookings = [
			{
				_id: "external_booking",
				_creationTime: 1,
				status: "bookedExternally",
				title: "Ferry",
				tripId,
				type: "transport",
				updatedAt: 1,
			} as unknown as TripWorkspace["bookings"][number],
		];
		const model = createTripDashboardModel({ tripId, workspace });

		expect(model.bookings).toMatchObject({ booked: 1, total: 1 });
	});

	test("uses trip days, not pre-trip lead time, for safe daily budget", () => {
		const workspace = createWorkspace();
		const today = new Date();
		workspace.trip.startDate = toIsoDate(addDays(today, 10));
		workspace.trip.endDate = toIsoDate(addDays(today, 13));
		workspace.trip.budgetAmount = 90_000;
		workspace.bookings = [
			{
				_id: "flight_booking",
				_creationTime: 1,
				cost: 21_800,
				currency: "PHP",
				status: "confirmed",
				title: "Flight",
				tripId,
				type: "flight",
				updatedAt: 1,
			} as unknown as TripWorkspace["bookings"][number],
			{
				_id: "hotel_booking",
				_creationTime: 1,
				cost: 32_400,
				currency: "PHP",
				status: "confirmed",
				title: "Hotel",
				tripId,
				type: "hotel",
				updatedAt: 1,
			} as unknown as TripWorkspace["bookings"][number],
		];
		workspace.expenses = [
			{
				_id: "foreign_receipt",
				_creationTime: 1,
				amount: 82,
				category: "transport",
				createdAt: 1,
				currency: "SGD",
				spentAt: workspace.trip.startDate,
				title: "MRT and SIM",
				tripId,
				updatedAt: 1,
			} as unknown as TripWorkspace["expenses"][number],
		];

		const model = createTripDashboardModel({ tripId, workspace });

		// Planned itinerary costs (3,000) now reduce what is left.
		expect(model.budget.left).toBe(32_800);
		expect(model.budget.spent).toBe(54_200);
		expect(model.budget.dailySafeSpend).toBe(8200);
	});

	test("leads Next up with the urgent risk and keeps open risks uncapped", () => {
		const workspace = createWorkspace();
		workspace.trip.startDate = toIsoDate(addDays(new Date(), 10));
		workspace.trip.endDate = toIsoDate(addDays(new Date(), 13));
		workspace.risks = Array.from({ length: 6 }, (_, index) => ({
			_id: `risk_${index}`,
			_creationTime: index,
			severity: "high",
			status: "open",
			suggestedAction: "Create a backup plan.",
			title: `Risk ${index + 1}`,
			tripId,
			type: "schedule",
		})) as unknown as TripWorkspace["risks"];
		const model = createTripDashboardModel({ tripId, workspace });

		expect(model.risks.open).toBe(6);
		expect(model.nextAction.description).toContain("High risk");
		expect(model.nextAction.icon).toBe("warning-outline");
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
		expect(model.openReadinessItems[0]?.title).toBe("Upload passport copy");
		expect(model.workspace.readinessItems.map((item) => `${item._id}`)).toEqual(
			[
				"readiness_earlier_high",
				"readiness_later_high",
				"readiness_done_critical",
			]
		);
	});
});

describe("trip dashboard next action rules", () => {
	const withDates = (startOffset: number, endOffset: number) => {
		const workspace = createWorkspace();
		const today = new Date();
		workspace.trip = {
			...workspace.trip,
			endDate: toIsoDate(addDays(today, endOffset)),
			startDate: toIsoDate(addDays(today, startOffset)),
		};
		workspace.risks = [];
		workspace.bookings = [];
		workspace.itineraryItems = [];

		return workspace;
	};

	test("flags an over-budget trip before routine prep", () => {
		const workspace = withDates(30, 35);
		workspace.expenses = [
			{
				...workspace.expenses[0],
				amount: 80_000,
			} as unknown as TripWorkspace["expenses"][number],
		];
		const model = createTripDashboardModel({ tripId, workspace });

		expect(model.nextAction.title).toBe("Review your budget");
	});

	test("counts down open checklist items when departure is close", () => {
		const model = createTripDashboardModel({
			tripId,
			workspace: withDates(3, 8),
		});

		expect(model.nextAction.title).toBe("Finish your prep");
		expect(model.nextAction.description).toContain("to go");
	});

	test("asks to complete a trip that already ended", () => {
		const model = createTripDashboardModel({
			tripId,
			workspace: withDates(-12, -6),
		});

		expect(model.nextAction.title).toBe("Mark this trip complete");
	});

	test("sends a completed trip to its recap", () => {
		const workspace = withDates(-12, -6);
		workspace.trip = { ...workspace.trip, status: "completed" };
		const model = createTripDashboardModel({ tripId, workspace });

		expect(model.nextAction.title).toBe("Relive this trip");
	});

	test("surfaces the top urgent risk first", () => {
		const workspace = withDates(30, 35);
		workspace.risks = createWorkspace().risks;
		const model = createTripDashboardModel({ tripId, workspace });

		expect(model.nextAction.title).toBe("Tight transfer");
	});
});
