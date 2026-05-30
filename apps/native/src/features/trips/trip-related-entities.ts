import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import type { Href } from "expo-router";
import { VIYA_ROUTES } from "@/src/constants/routes";
import type { TripWorkspace } from "./trip-dashboard-types";

type RelatedEntityWorkspace = Pick<
	TripWorkspace,
	| "bookings"
	| "companions"
	| "documents"
	| "expenses"
	| "itineraryDays"
	| "itineraryItems"
	| "moments"
	| "notes"
	| "readinessItems"
	| "risks"
	| "savedPlaces"
	| "vaultItems"
>;

interface RelatedEntityRef {
	relatedEntityId?: string;
	relatedEntityType?: string;
}

interface RelatedEntityHrefRef {
	relatedEntityType?: string;
	tripId: Id<"trips">;
}

interface RelatedEntityMutationInput {
	relatedEntityKey: string;
	shouldClear: boolean;
}

interface RelatedEntityMutationFields {
	relatedEntityId?: string;
	relatedEntityType?: string;
}

interface LinkedEntityMutationFields {
	linkedEntityId?: string;
	linkedEntityType?: string;
}

export interface TripRelatedEntityOption {
	detail: string;
	id: string;
	key: string;
	label: string;
	type: string;
}

interface TripRelatedEntityOptionsConfig {
	expenseLimit?: number;
	includeNotes?: boolean;
	includeRisks?: boolean;
	includeVaultItems?: boolean;
	itineraryItemLimit?: number;
	noteLimit?: number;
	riskLimit?: number;
	vaultItemLimit?: number;
}

export const getRelatedEntityKey = ({
	id,
	type,
}: {
	id?: string;
	type?: string;
}) => (id && type ? `${type}:${id}` : "");

export const parseRelatedEntityKey = (key: string) => {
	const [type, ...idParts] = key.split(":");
	const id = idParts.join(":");

	if (!(type && id)) {
		return null;
	}

	return { id, type };
};

export const getTripRelatedEntityHref = ({
	relatedEntityType,
	tripId,
}: RelatedEntityHrefRef): Href | null => {
	switch (relatedEntityType) {
		case "booking":
			return VIYA_ROUTES.tripBookings(tripId);
		case "companion":
			return VIYA_ROUTES.tripCompanions(tripId);
		case "expense":
			return VIYA_ROUTES.tripBudget(tripId);
		case "itineraryDay":
		case "itineraryItem":
			return VIYA_ROUTES.tripItinerary(tripId);
		case "moment":
			return VIYA_ROUTES.tripMoments(tripId);
		case "readinessItem":
			return VIYA_ROUTES.tripReadiness(tripId);
		case "risk":
			return VIYA_ROUTES.tripRisks(tripId);
		case "savedPlace":
			return VIYA_ROUTES.tripPlaces(tripId);
		case "travelDocument":
		case "vaultItem":
			return VIYA_ROUTES.tripVault(tripId);
		case "tripNote":
			return VIYA_ROUTES.tripNotes(tripId);
		default:
			return null;
	}
};

export const getRelatedEntityMutationFields = ({
	relatedEntityKey,
	shouldClear,
}: RelatedEntityMutationInput): RelatedEntityMutationFields => {
	const relatedEntity = parseRelatedEntityKey(relatedEntityKey);

	if (relatedEntity) {
		return {
			relatedEntityId: relatedEntity.id,
			relatedEntityType: relatedEntity.type,
		};
	}

	if (!shouldClear) {
		return {};
	}

	return {
		relatedEntityId: "",
		relatedEntityType: "",
	};
};

export const getLinkedEntityMutationFields = ({
	relatedEntityKey,
	shouldClear,
}: RelatedEntityMutationInput): LinkedEntityMutationFields => {
	const relatedEntity = parseRelatedEntityKey(relatedEntityKey);

	if (relatedEntity) {
		return {
			linkedEntityId: relatedEntity.id,
			linkedEntityType: relatedEntity.type,
		};
	}

	if (!shouldClear) {
		return {};
	}

	return {
		linkedEntityId: "",
		linkedEntityType: "",
	};
};

export const getCompactRelatedLabel = (label: string) => {
	const maxLabelLength = 26;

	if (label.length <= maxLabelLength) {
		return label;
	}

	return `${label.slice(0, maxLabelLength - 3).trimEnd()}...`;
};

const formatRelatedTypeLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

const createRelatedEntityOption = ({
	detail,
	id,
	label,
	type,
}: {
	detail: string;
	id: string;
	label: string;
	type: string;
}): TripRelatedEntityOption => ({
	detail,
	id,
	key: getRelatedEntityKey({ id, type }),
	label,
	type,
});

export const getTripRelatedEntityOptions = (
	workspace: RelatedEntityWorkspace,
	{
		expenseLimit,
		includeNotes = false,
		includeRisks = false,
		includeVaultItems = true,
		itineraryItemLimit,
		noteLimit,
		riskLimit,
		vaultItemLimit,
	}: TripRelatedEntityOptionsConfig = {}
) => [
	...workspace.itineraryDays.map((day) =>
		createRelatedEntityOption({
			detail: day.date,
			id: day._id,
			label: `Day ${day.dayNumber}: ${day.title}`,
			type: "itineraryDay",
		})
	),
	...(itineraryItemLimit
		? workspace.itineraryItems.slice(0, itineraryItemLimit)
		: workspace.itineraryItems
	).map((item) =>
		createRelatedEntityOption({
			detail: item.locationName || item.startTime,
			id: item._id,
			label: item.title,
			type: "itineraryItem",
		})
	),
	...workspace.bookings.map((booking) =>
		createRelatedEntityOption({
			detail: booking.provider ?? "Booking target",
			id: booking._id,
			label: booking.title,
			type: "booking",
		})
	),
	...workspace.documents.map((document) =>
		createRelatedEntityOption({
			detail: document.status,
			id: document._id,
			label: document.title,
			type: "travelDocument",
		})
	),
	...workspace.companions.map((companion) =>
		createRelatedEntityOption({
			detail: companion.role,
			id: companion._id,
			label: companion.name,
			type: "companion",
		})
	),
	...workspace.readinessItems.map((item) =>
		createRelatedEntityOption({
			detail: item.status,
			id: item._id,
			label: item.title,
			type: "readinessItem",
		})
	),
	...workspace.savedPlaces.map((place) =>
		createRelatedEntityOption({
			detail: place.category,
			id: place._id,
			label: place.title,
			type: "savedPlace",
		})
	),
	...(includeVaultItems
		? (vaultItemLimit
				? workspace.vaultItems.slice(0, vaultItemLimit)
				: workspace.vaultItems
			).map((item) =>
				createRelatedEntityOption({
					detail: item.kind,
					id: item._id,
					label: item.title,
					type: "vaultItem",
				})
			)
		: []),
	...(expenseLimit
		? workspace.expenses.slice(0, expenseLimit)
		: workspace.expenses
	).map((expense) =>
		createRelatedEntityOption({
			detail: expense.category,
			id: expense._id,
			label: expense.title,
			type: "expense",
		})
	),
	...workspace.moments.map((moment) =>
		createRelatedEntityOption({
			detail: moment.locationName ?? "Memory",
			id: moment._id,
			label: moment.title,
			type: "moment",
		})
	),
	...(includeNotes
		? (noteLimit ? workspace.notes.slice(0, noteLimit) : workspace.notes).map(
				(note) =>
					createRelatedEntityOption({
						detail: note.category,
						id: note._id,
						label: note.title,
						type: "tripNote",
					})
			)
		: []),
	...(includeRisks
		? (riskLimit ? workspace.risks.slice(0, riskLimit) : workspace.risks).map(
				(risk) =>
					createRelatedEntityOption({
						detail: risk.status,
						id: risk._id,
						label: risk.title,
						type: "risk",
					})
			)
		: []),
];

export const getTripRelatedEntityLabelByKey = (
	workspace: RelatedEntityWorkspace
) =>
	new Map<string, string>([
		...workspace.itineraryDays.map(
			(day) =>
				[
					getRelatedEntityKey({ id: day._id, type: "itineraryDay" }),
					`Day ${day.dayNumber}: ${day.title}`,
				] as const
		),
		...workspace.itineraryItems.map(
			(item) =>
				[
					getRelatedEntityKey({ id: item._id, type: "itineraryItem" }),
					item.title,
				] as const
		),
		...workspace.bookings.map(
			(booking) =>
				[
					getRelatedEntityKey({ id: booking._id, type: "booking" }),
					booking.title,
				] as const
		),
		...workspace.documents.map(
			(document) =>
				[
					getRelatedEntityKey({
						id: document._id,
						type: "travelDocument",
					}),
					document.title,
				] as const
		),
		...workspace.companions.map(
			(companion) =>
				[
					getRelatedEntityKey({ id: companion._id, type: "companion" }),
					companion.name,
				] as const
		),
		...workspace.readinessItems.map(
			(item) =>
				[
					getRelatedEntityKey({ id: item._id, type: "readinessItem" }),
					item.title,
				] as const
		),
		...workspace.savedPlaces.map(
			(place) =>
				[
					getRelatedEntityKey({ id: place._id, type: "savedPlace" }),
					place.title,
				] as const
		),
		...workspace.vaultItems.map(
			(item) =>
				[
					getRelatedEntityKey({ id: item._id, type: "vaultItem" }),
					item.title,
				] as const
		),
		...workspace.expenses.map(
			(expense) =>
				[
					getRelatedEntityKey({ id: expense._id, type: "expense" }),
					expense.title,
				] as const
		),
		...workspace.moments.map(
			(moment) =>
				[
					getRelatedEntityKey({ id: moment._id, type: "moment" }),
					moment.title,
				] as const
		),
		...workspace.notes.map(
			(note) =>
				[
					getRelatedEntityKey({ id: note._id, type: "tripNote" }),
					note.title,
				] as const
		),
		...workspace.risks.map(
			(risk) =>
				[
					getRelatedEntityKey({ id: risk._id, type: "risk" }),
					risk.title,
				] as const
		),
	]);

export const getTripRelatedEntityLabel = (
	entity: RelatedEntityRef,
	relatedEntityLabelByKey: Map<string, string>
) => {
	const key = getRelatedEntityKey({
		id: entity.relatedEntityId,
		type: entity.relatedEntityType,
	});

	if (!key) {
		return null;
	}

	return (
		relatedEntityLabelByKey.get(key) ??
		(entity.relatedEntityType
			? `${formatRelatedTypeLabel(entity.relatedEntityType)} linked`
			: null)
	);
};
