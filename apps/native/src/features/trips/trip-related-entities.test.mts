import { describe, expect, test } from "bun:test";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";

import type { TripWorkspace } from "./trip-dashboard-types";
import {
	getLinkedEntityMutationFields,
	getRelatedEntityMutationFields,
	getTripRelatedEntityHref,
	getTripRelatedEntityLabel,
	getTripRelatedEntityLabelByKey,
	getTripRelatedEntityOptions,
} from "./trip-related-entities";

const tripId = "trip_123" as Id<"trips">;

const createWorkspace = (): TripWorkspace =>
	({
		bookings: [],
		companions: [],
		documents: [],
		expenses: [],
		itineraryDays: [],
		itineraryItems: [],
		moments: [],
		notes: [
			{
				_id: "note_123",
				category: "document",
				title: "Offline ticket decision",
			},
		],
		readinessItems: [],
		risks: [
			{
				_id: "risk_123",
				status: "open",
				title: "Tight transfer window",
			},
		],
		savedPlaces: [],
		trip: {},
		vaultItems: [
			{
				_id: "vault_123",
				kind: "document",
				title: "Passport copy",
			},
		],
	}) as unknown as TripWorkspace;

describe("trip related entity helpers", () => {
	test("adds notes and risks only when requested", () => {
		const workspace = createWorkspace();

		expect(
			getTripRelatedEntityOptions(workspace).map((option) => option.type)
		).toContain("vaultItem");
		expect(
			getTripRelatedEntityOptions(workspace).map((option) => option.type)
		).not.toContain("tripNote");
		expect(
			getTripRelatedEntityOptions(workspace, {
				includeNotes: true,
				includeRisks: true,
				includeVaultItems: false,
			}).map((option) => option.type)
		).toEqual(["tripNote", "risk"]);
	});

	test("resolves labels and clear-link mutation fields", () => {
		const labelByKey = getTripRelatedEntityLabelByKey(createWorkspace());

		expect(
			getTripRelatedEntityLabel(
				{
					relatedEntityId: "note_123",
					relatedEntityType: "tripNote",
				},
				labelByKey
			)
		).toBe("Offline ticket decision");
		expect(
			getRelatedEntityMutationFields({
				relatedEntityKey: "",
				shouldClear: true,
			})
		).toEqual({
			relatedEntityId: "",
			relatedEntityType: "",
		});
		expect(
			getLinkedEntityMutationFields({
				relatedEntityKey: "booking:booking_123",
				shouldClear: true,
			})
		).toEqual({
			linkedEntityId: "booking_123",
			linkedEntityType: "booking",
		});
		expect(
			getLinkedEntityMutationFields({
				relatedEntityKey: "",
				shouldClear: true,
			})
		).toEqual({
			linkedEntityId: "",
			linkedEntityType: "",
		});
	});

	test("routes linked entities back to their owning trip modules", () => {
		const getPathname = (relatedEntityType?: string) => {
			const href = getTripRelatedEntityHref({ relatedEntityType, tripId });

			if (!href) {
				return null;
			}

			return typeof href === "string" ? href : href.pathname;
		};

		expect(getPathname("booking")).toBe("/(app)/trips/[tripId]/bookings");
		expect(getPathname("expense")).toBe("/(app)/trips/[tripId]/budget");
		expect(getPathname("itineraryItem")).toBe(
			"/(app)/trips/[tripId]/itinerary"
		);
		expect(getPathname("risk")).toBe("/(app)/trips/[tripId]/risks");
		expect(getPathname("tripNote")).toBe("/(app)/trips/[tripId]/notes");
		expect(getPathname("unknown")).toBeNull();
	});
});
