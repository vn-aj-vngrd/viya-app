import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	users: defineTable({
		clerkSubject: v.string(),
		name: v.optional(v.string()),
		email: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_clerk_subject", ["clerkSubject"]),
	userPreferences: defineTable({
		ownerId: v.string(),
		travelStyle: v.union(
			v.literal("relaxed"),
			v.literal("balanced"),
			v.literal("packed"),
			v.literal("adventure"),
			v.literal("luxury"),
			v.literal("budget")
		),
		pacePreference: v.union(
			v.literal("slow"),
			v.literal("moderate"),
			v.literal("fast")
		),
		budgetPreference: v.union(
			v.literal("budget"),
			v.literal("midRange"),
			v.literal("premium")
		),
		interests: v.array(
			v.union(
				v.literal("nature"),
				v.literal("food"),
				v.literal("culture"),
				v.literal("shopping"),
				v.literal("nightlife"),
				v.literal("wellness"),
				v.literal("beaches"),
				v.literal("hiddenGems")
			)
		),
		foodPreference: v.union(
			v.literal("localEats"),
			v.literal("popularSpots"),
			v.literal("dietaryAware"),
			v.literal("flexible"),
			v.literal("lowPriority")
		),
		groupPreference: v.union(
			v.literal("solo"),
			v.literal("couple"),
			v.literal("family"),
			v.literal("friends"),
			v.literal("work"),
			v.literal("varies")
		),
		planningStyle: v.union(
			v.literal("decideForMe"),
			v.literal("giveOptions"),
			v.literal("flagRisks")
		),
		specialNeeds: v.array(
			v.union(
				v.literal("accessibility"),
				v.literal("dietaryRestrictions"),
				v.literal("earlyStarts"),
				v.literal("restBreaks"),
				v.literal("none")
			)
		),
		specialNeedsNote: v.optional(v.string()),
		onboardingCompletedAt: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_owner", ["ownerId"]),
	chatThreads: defineTable({
		ownerId: v.string(),
		threadId: v.string(),
		mode: v.union(v.literal("chat"), v.literal("plan"), v.literal("trip")),
		tripId: v.optional(v.id("trips")),
		title: v.string(),
		preview: v.optional(v.string()),
		messageCount: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_owner_updatedAt", ["ownerId", "updatedAt"])
		.index("by_owner_thread", ["ownerId", "threadId"])
		.index("by_thread", ["threadId"]),
	chatQuestionPrompts: defineTable({
		ownerId: v.string(),
		threadId: v.string(),
		promptMessageId: v.string(),
		assistantMessageId: v.string(),
		mode: v.union(v.literal("chat"), v.literal("plan"), v.literal("trip")),
		question: v.string(),
		stepLabel: v.optional(v.string()),
		options: v.array(
			v.object({
				id: v.string(),
				label: v.string(),
				value: v.string(),
			})
		),
		status: v.union(
			v.literal("pending"),
			v.literal("answered"),
			v.literal("dismissed")
		),
		answerText: v.optional(v.string()),
		answeredAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_owner_thread_status_updatedAt", [
			"ownerId",
			"threadId",
			"status",
			"updatedAt",
		])
		.index("by_thread_status", ["threadId", "status"]),
	trips: defineTable({
		ownerId: v.string(),
		title: v.string(),
		destination: v.string(),
		startDate: v.string(),
		endDate: v.string(),
		arrivalTime: v.optional(v.string()),
		departureTime: v.optional(v.string()),
		budgetAmount: v.optional(v.number()),
		budgetCurrency: v.optional(v.string()),
		travelStyle: v.string(),
		pace: v.string(),
		groupType: v.string(),
		status: v.string(),
		readinessScore: v.number(),
		coverImageUrl: v.optional(v.string()),
		summary: v.string(),
		isDemo: v.boolean(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_owner", ["ownerId"])
		.index("by_owner_status", ["ownerId", "status"])
		.index("by_status", ["status"]),
	itineraryDays: defineTable({
		tripId: v.id("trips"),
		date: v.string(),
		dayNumber: v.number(),
		title: v.string(),
		summary: v.string(),
		theme: v.string(),
		estimatedCost: v.number(),
		pace: v.string(),
		weatherNote: v.string(),
	}).index("by_trip", ["tripId"]),
	itineraryItems: defineTable({
		tripId: v.id("trips"),
		dayId: v.id("itineraryDays"),
		title: v.string(),
		description: v.string(),
		category: v.string(),
		locationName: v.string(),
		address: v.string(),
		latitude: v.optional(v.number()),
		longitude: v.optional(v.number()),
		startTime: v.string(),
		endTime: v.string(),
		durationMinutes: v.number(),
		estimatedCost: v.number(),
		bookingId: v.optional(v.string()),
		priority: v.string(),
		status: v.string(),
		aiReason: v.string(),
	}).index("by_trip", ["tripId"]),
	readinessItems: defineTable({
		tripId: v.id("trips"),
		category: v.string(),
		title: v.string(),
		description: v.string(),
		status: v.string(),
		priority: v.string(),
		dueDate: v.string(),
		assignedToMemberId: v.optional(v.string()),
		aiReason: v.string(),
		source: v.string(),
	}).index("by_trip", ["tripId"]),
	risks: defineTable({
		tripId: v.id("trips"),
		type: v.string(),
		severity: v.string(),
		title: v.string(),
		message: v.string(),
		suggestedAction: v.string(),
		relatedEntityType: v.optional(v.string()),
		relatedEntityId: v.optional(v.string()),
		status: v.string(),
		aiReason: v.string(),
		createdAt: v.number(),
	}).index("by_trip", ["tripId"]),
	moments: defineTable({
		tripId: v.id("trips"),
		dayId: v.optional(v.string()),
		title: v.string(),
		caption: v.string(),
		note: v.string(),
		photoUrl: v.optional(v.string()),
		locationName: v.string(),
		isHighlight: v.boolean(),
		createdAt: v.number(),
	}).index("by_trip", ["tripId"]),
	vaultItems: defineTable({
		ownerId: v.string(),
		tripId: v.optional(v.id("trips")),
		storageId: v.id("_storage"),
		kind: v.string(),
		fileName: v.string(),
		mimeType: v.string(),
		fileSize: v.number(),
		title: v.string(),
		note: v.optional(v.string()),
		status: v.string(),
		linkedEntityType: v.optional(v.string()),
		linkedEntityId: v.optional(v.string()),
		extractedSummary: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_owner", ["ownerId"])
		.index("by_trip", ["tripId"])
		.index("by_owner_trip", ["ownerId", "tripId"]),
	travelDocuments: defineTable({
		tripId: v.id("trips"),
		vaultItemId: v.optional(v.id("vaultItems")),
		type: v.string(),
		title: v.string(),
		status: v.string(),
		expiryDate: v.optional(v.string()),
		notes: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_trip", ["tripId"]),
	bookings: defineTable({
		tripId: v.id("trips"),
		vaultItemId: v.optional(v.id("vaultItems")),
		type: v.string(),
		title: v.string(),
		provider: v.optional(v.string()),
		confirmationCode: v.optional(v.string()),
		startDateTime: v.optional(v.string()),
		endDateTime: v.optional(v.string()),
		locationName: v.optional(v.string()),
		address: v.optional(v.string()),
		cost: v.optional(v.number()),
		currency: v.optional(v.string()),
		status: v.string(),
		notes: v.optional(v.string()),
		extractedFrom: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_trip", ["tripId"]),
});
