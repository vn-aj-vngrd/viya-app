export type TravelStyle =
	| "relaxed"
	| "balanced"
	| "packed"
	| "adventure"
	| "luxury"
	| "budget";
export type PacePreference = "slow" | "moderate" | "fast";
export type BudgetPreference = "budget" | "midRange" | "premium";
export type TravelInterest =
	| "nature"
	| "food"
	| "culture"
	| "shopping"
	| "nightlife"
	| "wellness"
	| "beaches"
	| "hiddenGems";
export type FoodPreference =
	| "localEats"
	| "popularSpots"
	| "dietaryAware"
	| "flexible"
	| "lowPriority";
export type GroupType =
	| "solo"
	| "couple"
	| "family"
	| "friends"
	| "work"
	| "custom";
export type UserGroupPreference = Exclude<GroupType, "custom"> | "varies";
export type PlanningStyle = "decideForMe" | "giveOptions" | "flagRisks";
export type SpecialNeed =
	| "accessibility"
	| "dietaryRestrictions"
	| "earlyStarts"
	| "restBreaks"
	| "none";
export type TripStatus = "planning" | "traveling" | "completed" | "archived";
export type ItineraryPace = "light" | "balanced" | "packed";
export type ItineraryItemCategory =
	| "activity"
	| "food"
	| "transport"
	| "hotel"
	| "rest"
	| "shopping"
	| "note"
	| "flight"
	| "emergency";
export type ItineraryItemPriority = "required" | "recommended" | "optional";
export type ItineraryItemStatus =
	| "planned"
	| "confirmed"
	| "skipped"
	| "completed";
export type ReadinessCategory =
	| "documents"
	| "bookings"
	| "packing"
	| "budget"
	| "schedule"
	| "transport"
	| "weather"
	| "safety"
	| "group"
	| "backupPlan";
export type WorkStatus = "todo" | "inProgress" | "done" | "blocked" | "ignored";
export type Priority = "low" | "medium" | "high" | "critical";
export type RiskType =
	| "weather"
	| "schedule"
	| "booking"
	| "budget"
	| "transport"
	| "safety"
	| "group"
	| "document"
	| "fatigue"
	| "unknown";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskStatus = "open" | "mitigated" | "dismissed";
export type NextBestActionTarget =
	| "readiness"
	| "risks"
	| "itinerary"
	| "travelMode"
	| "moments";

export interface User {
	avatarUrl: string | null;
	clerkSubject: string;
	createdAt: string;
	email: string | null;
	id: string;
	name: string | null;
	updatedAt: string;
}

export interface UserPreferences {
	accessibilityNeeds: string;
	budgetPreference: BudgetPreference;
	foodPreference: FoodPreference;
	groupPreference: UserGroupPreference;
	interests: TravelInterest[];
	notificationPreference: string;
	pacePreference: PacePreference;
	planningStyle: PlanningStyle;
	preferredRestLevel: string;
	preferredStartTime: string;
	specialNeeds: SpecialNeed[];
	specialNeedsNote: string | null;
	travelStyle: TravelStyle;
}

export interface Trip {
	arrivalTime: string;
	budgetAmount: number;
	budgetCurrency: string;
	coverImageUrl: string;
	createdAt: string;
	departureTime: string;
	destination: string;
	endDate: string;
	groupType: GroupType;
	id: string;
	ownerId: string;
	pace: PacePreference;
	readinessScore: number;
	startDate: string;
	status: TripStatus;
	summary: string;
	title: string;
	travelStyle: TravelStyle;
	updatedAt: string;
}

export interface ItineraryDay {
	date: string;
	dayNumber: number;
	estimatedCost: number;
	id: string;
	pace: ItineraryPace;
	summary: string;
	theme: string;
	title: string;
	tripId: string;
	weatherNote: string;
}

export interface ItineraryItem {
	address: string;
	aiReason: string;
	bookingId: string | null;
	category: ItineraryItemCategory;
	dayId: string;
	description: string;
	durationMinutes: number;
	endTime: string;
	estimatedCost: number;
	id: string;
	latitude: number | null;
	locationName: string;
	longitude: number | null;
	priority: ItineraryItemPriority;
	startTime: string;
	status: ItineraryItemStatus;
	title: string;
	tripId: string;
}

export interface ReadinessItem {
	aiReason: string;
	assignedToMemberId: string | null;
	category: ReadinessCategory;
	description: string;
	dueDate: string;
	id: string;
	priority: Priority;
	source: "system" | "ai" | "user";
	status: WorkStatus;
	title: string;
	tripId: string;
}

export interface ReadinessScore {
	categoryScores: Record<ReadinessCategory, number>;
	overallScore: number;
	summary: string;
	tripId: string;
	updatedAt: string;
}

export interface Risk {
	aiReason: string;
	createdAt: string;
	id: string;
	message: string;
	relatedEntityId: string | null;
	relatedEntityType: string | null;
	severity: RiskSeverity;
	status: RiskStatus;
	suggestedAction: string;
	title: string;
	tripId: string;
	type: RiskType;
}

export interface Moment {
	caption: string;
	createdAt: string;
	dayId: string;
	id: string;
	isHighlight: boolean;
	locationName: string;
	note: string;
	photoUrl: string;
	title: string;
	tripId: string;
}

export type VaultItemKind =
	| "booking"
	| "document"
	| "momentPhoto"
	| "receipt"
	| "noteAttachment"
	| "other";
export type VaultLinkedEntityType =
	| "trip"
	| "booking"
	| "travelDocument"
	| "moment"
	| "readinessItem";
export type VaultItemStatus =
	| "uploaded"
	| "processing"
	| "ready"
	| "failed"
	| "archived";
export type TravelDocumentType =
	| "passport"
	| "id"
	| "visa"
	| "insurance"
	| "ticket"
	| "voucher"
	| "qr"
	| "permit"
	| "other";
export type TravelDocumentStatus =
	| "missing"
	| "uploaded"
	| "verified"
	| "expired";

export interface VaultItem {
	createdAt: string;
	extractedSummary: string | null;
	fileName: string;
	fileSize: number;
	id: string;
	kind: VaultItemKind;
	linkedEntityId: string | null;
	linkedEntityType: VaultLinkedEntityType | null;
	mimeType: string;
	note: string | null;
	ownerId: string;
	status: VaultItemStatus;
	storageId: string;
	title: string;
	tripId: string | null;
	updatedAt: string;
}

export interface TravelDocument {
	expiryDate: string | null;
	fileUrl: string | null;
	id: string;
	notes: string | null;
	status: TravelDocumentStatus;
	title: string;
	tripId: string;
	type: TravelDocumentType;
	vaultItemId: string | null;
}

export interface ViyaDemoTrip {
	days: ItineraryDay[];
	items: ItineraryItem[];
	moments: Moment[];
	preferences: UserPreferences;
	readinessItems: ReadinessItem[];
	risks: Risk[];
	trip: Trip;
}

export interface NextBestAction {
	label: string;
	reason: string;
	target: NextBestActionTarget;
}
