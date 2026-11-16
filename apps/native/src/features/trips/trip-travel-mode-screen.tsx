import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	getBookingCounts,
	getBudgetDayCount,
	getBudgetWalletSummary,
	getItineraryNowNext,
	getTripCountdown,
	getTripTodayKey,
	isBookingSecured,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, View } from "react-native";
import {
	EmptyPrimary,
	FieldRow,
	FormGroup,
	FormSheet,
	InlineError,
	NotesRow,
} from "@/src/components/itinerary/trip-module-ui";
import {
	AppText,
	haptic,
	Icon,
	ListGroup,
	ListRow,
	PrimaryButton,
	ScreenShell,
	SecondaryButton,
	spacing,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { vaultKindLabels } from "@/src/features/vault/vault-preview-card";

import {
	formatCount,
	formatDay,
	formatEnumLabel,
	formatFileSize,
	formatMoney,
	formatShortDate,
	formatTime,
	formatTimeRange,
	formatTripCountdown,
	toLocalTimeKey,
} from "@/src/lib/format";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";
import { useTripIdParam } from "./use-trip-id-param";

const MAX_UPCOMING_STOPS = 4;
const MAX_REFERENCES = 5;

interface QuickExpenseForm {
	amount: string;
	title: string;
}

interface QuickNoteForm {
	body: string;
	title: string;
}

interface QuickNoteRelatedContext {
	id: Id<"itineraryItems">;
	label: string;
	type: "itineraryItem";
}

interface QuickExpenseContext {
	bookingId?: Id<"bookings">;
	bookingLabel: string | null;
	category: QuickExpenseCategory;
	categoryLabel: string;
}

type QuickExpenseCategory =
	| "activity"
	| "food"
	| "hotel"
	| "shopping"
	| "transport"
	| "documents"
	| "other";

interface TravelTimelineEntry {
	day?: Doc<"itineraryDays">;
	item: Doc<"itineraryItems">;
	sortKey: string;
}

interface TravelDocumentReference {
	detail?: string;
	key: string;
	title: string;
	url?: string | null;
}

interface TravelBookingReference {
	booking: Doc<"bookings">;
	detail: string;
	proofUrl?: string | null;
}

const quickExpenseCategoryByItineraryCategory: Partial<
	Record<string, QuickExpenseCategory>
> = {
	activity: "activity",
	flight: "transport",
	food: "food",
	hotel: "hotel",
	shopping: "shopping",
	transport: "transport",
};

const getTimeRange = (item: Doc<"itineraryItems">) =>
	formatTimeRange(item.startTime, item.endTime || undefined) || item.startTime;

const getQuickNoteRelatedContext = (
	entry: { item: Doc<"itineraryItems"> } | null
): QuickNoteRelatedContext | null => {
	if (!entry) {
		return null;
	}

	return {
		id: entry.item._id,
		label: entry.item.title,
		type: "itineraryItem",
	};
};

const getQuickExpenseCategory = (
	entry: { item: Doc<"itineraryItems"> } | null
): QuickExpenseCategory =>
	entry
		? (quickExpenseCategoryByItineraryCategory[entry.item.category] ?? "other")
		: "other";

const getQuickExpenseBookingId = (
	entry: { item: Doc<"itineraryItems"> } | null,
	bookings: Doc<"bookings">[]
): Id<"bookings"> | undefined => {
	const bookingId = entry?.item.bookingId;

	if (!bookingId) {
		return;
	}

	return bookings.find((booking) => booking._id === bookingId)?._id;
};

const getQuickExpenseContext = (
	entry: { item: Doc<"itineraryItems"> } | null,
	bookings: Doc<"bookings">[]
): QuickExpenseContext => {
	const bookingId = getQuickExpenseBookingId(entry, bookings);
	const category = getQuickExpenseCategory(entry);
	const categoryLabel = formatEnumLabel(category);

	return {
		bookingId,
		bookingLabel:
			bookings.find((booking) => booking._id === bookingId)?.title ?? null,
		category,
		categoryLabel,
	};
};

const getNowAndNext = ({
	days,
	items,
}: {
	days: Doc<"itineraryDays">[];
	items: Doc<"itineraryItems">[];
}) => {
	const dayById = new Map(days.map((day) => [day._id, day]));
	const entryByItemId = new Map<string, TravelTimelineEntry>(
		items.map((item) => {
			const day = dayById.get(item.dayId);

			return [
				item._id,
				{
					day,
					item,
					sortKey: `${day?.date ?? ""}T${item.startTime || "00:00"}`,
				},
			];
		})
	);
	const result = getItineraryNowNext({
		days: days.map((day) => ({ date: day.date, id: day._id })),
		items,
		maxUpcoming: MAX_UPCOMING_STOPS,
		nowTime: toLocalTimeKey(),
		todayKey: getTripTodayKey(),
	});
	const toEntry = (item: Doc<"itineraryItems"> | null) =>
		item ? (entryByItemId.get(item._id) ?? null) : null;
	const nowEntry = toEntry(result.now);
	const nextEntry = toEntry(result.next);
	const upcomingEntries = result.upcoming.flatMap((item) => {
		const entry = toEntry(item);

		return entry ? [entry] : [];
	});

	if (nowEntry) {
		return {
			hero: nowEntry,
			heroKind: "now" as const,
			upcoming: (nextEntry ? [nextEntry, ...upcomingEntries] : []).slice(
				0,
				MAX_UPCOMING_STOPS
			),
		};
	}

	return {
		hero: nextEntry,
		heroKind: "next" as const,
		upcoming: upcomingEntries,
	};
};

const getHeroEyebrow = ({
	entry,
	heroKind,
	today,
}: {
	entry: TravelTimelineEntry;
	heroKind: "next" | "now";
	today: string;
}) => {
	const { item } = entry;

	if (item.status === "completed") {
		return `Done · ${getTimeRange(item)}`;
	}

	if (heroKind === "now") {
		return item.endTime ? `Now · until ${formatTime(item.endTime)}` : "Now";
	}

	return entry.day && entry.day.date !== today
		? `Next · ${formatDay(entry.day.date)}, ${formatTime(item.startTime)}`
		: `Next · ${formatTime(item.startTime)} today`;
};

interface TravelEmptyState {
	actionLabel: string;
	description: string;
	onPress: () => void;
	title: string;
}

function QuickExpenseSheet({
	error,
	form,
	isOpen,
	isSaving,
	linkedBookingLabel,
	onOpenChange,
	onSubmit,
	plannedCategoryLabel,
	setForm,
}: {
	error: string | null;
	form: QuickExpenseForm;
	isOpen: boolean;
	isSaving: boolean;
	linkedBookingLabel: string | null;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	plannedCategoryLabel: string;
	setForm: (updater: (current: QuickExpenseForm) => QuickExpenseForm) => void;
}) {
	return (
		<FormSheet
			errorMessage={error}
			isOpen={isOpen}
			isPending={isSaving}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			size="medium"
			submitLabel="Log"
			title="Log expense"
		>
			<FormGroup
				footer={
					linkedBookingLabel
						? `Counted as ${plannedCategoryLabel.toLowerCase()}, linked to ${linkedBookingLabel}.`
						: `Counted as ${plannedCategoryLabel.toLowerCase()}.`
				}
			>
				<FieldRow
					label="Title"
					onChangeText={(title) =>
						setForm((current) => ({ ...current, title }))
					}
					placeholder="Taxi, snack, ticket"
					value={form.title}
				/>
				<FieldRow
					keyboardType="numeric"
					label="Amount"
					onChangeText={(amount) =>
						setForm((current) => ({ ...current, amount }))
					}
					placeholder="500"
					value={form.amount}
				/>
			</FormGroup>
		</FormSheet>
	);
}

function QuickNoteSheet({
	error,
	form,
	isOpen,
	isSaving,
	onOpenChange,
	onSubmit,
	relatedLabel,
	setForm,
}: {
	error: string | null;
	form: QuickNoteForm;
	isOpen: boolean;
	isSaving: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	relatedLabel: string | null;
	setForm: (updater: (current: QuickNoteForm) => QuickNoteForm) => void;
}) {
	return (
		<FormSheet
			errorMessage={error}
			isOpen={isOpen}
			isPending={isSaving}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			size="medium"
			submitLabel="Save"
			title="Add note"
		>
			<FormGroup
				footer={relatedLabel ? `Linked to ${relatedLabel}.` : undefined}
			>
				<FieldRow
					label="Title"
					onChangeText={(title) =>
						setForm((current) => ({ ...current, title }))
					}
					placeholder="Gate changed"
					value={form.title}
				/>
				<NotesRow
					label="Note"
					onChangeText={(body) => setForm((current) => ({ ...current, body }))}
					placeholder="What should you remember from today?"
					value={form.body}
				/>
			</FormGroup>
		</FormSheet>
	);
}

function NowSection({
	canOpenMaps,
	empty,
	entry,
	eyebrow,
	isUpdating,
	onOpenBooking,
	onOpenMaps,
	onToggle,
}: {
	canOpenMaps: boolean;
	empty: TravelEmptyState;
	entry: TravelTimelineEntry | null;
	eyebrow: string;
	isUpdating: boolean;
	onOpenBooking: () => void;
	onOpenMaps: (item: Doc<"itineraryItems">) => void;
	onToggle: () => void;
}) {
	if (!entry) {
		return (
			<EmptyPrimary
				actionLabel={empty.actionLabel}
				description={empty.description}
				onPress={empty.onPress}
				title={empty.title}
			/>
		);
	}

	const { item } = entry;
	const isCompleted = item.status === "completed";
	const toggleLabel = isCompleted ? "Mark as planned" : "Mark done";

	return (
		<View style={{ gap: spacing.md }}>
			<View style={{ gap: spacing.xs }}>
				<AppText tone="secondary" variant="eyebrow">
					{eyebrow}
				</AppText>
				<AppText accessibilityRole="header" variant="title">
					{item.title}
				</AppText>
				<AppText tone="secondary" variant="callout">
					{[getTimeRange(item), item.locationName].filter(Boolean).join(" · ")}
				</AppText>
			</View>
			{canOpenMaps ? (
				<>
					<PrimaryButton
						icon="navigate-outline"
						label="Directions"
						onPress={() => onOpenMaps(item)}
					/>
					<SecondaryButton
						icon="checkmark-circle-outline"
						isPending={isUpdating}
						label={toggleLabel}
						onPress={onToggle}
					/>
				</>
			) : (
				<PrimaryButton
					icon="checkmark-circle-outline"
					isPending={isUpdating}
					label={toggleLabel}
					onPress={onToggle}
				/>
			)}
			{item.bookingId ? (
				<SecondaryButton
					label="Open booking"
					onPress={onOpenBooking}
					variant="plain"
				/>
			) : null}
		</View>
	);
}

export function TripTravelModeScreen() {
	const router = useRouter();
	const tripId = useTripIdParam();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const addTripExpense = useMutation(api.trips.addTripExpense);
	const createTripNote = useMutation(api.notes.createTripNote);
	const updateItineraryItem = useMutation(api.itinerary.updateItineraryItem);
	const [expenseForm, setExpenseForm] = useState<QuickExpenseForm>({
		amount: "",
		title: "",
	});
	const [noteForm, setNoteForm] = useState<QuickNoteForm>({
		body: "",
		title: "",
	});
	const [isExpenseOpen, setIsExpenseOpen] = useState(false);
	const [isNoteOpen, setIsNoteOpen] = useState(false);
	const [isSavingExpense, setIsSavingExpense] = useState(false);
	const [isSavingNote, setIsSavingNote] = useState(false);
	const [isUpdatingCurrentItem, setIsUpdatingCurrentItem] = useState(false);
	const [currentItemError, setCurrentItemError] = useState<string | null>(null);
	const [documentOpenError, setDocumentOpenError] = useState<string | null>(
		null
	);
	const [expenseError, setExpenseError] = useState<string | null>(null);
	const [mapError, setMapError] = useState<string | null>(null);
	const [noteError, setNoteError] = useState<string | null>(null);

	const wallet = useMemo(() => {
		if (!workspace) {
			return null;
		}

		return getBudgetWalletSummary({
			bookings: workspace.bookings,
			budgetAmount: workspace.trip.budgetAmount,
			budgetCurrency: workspace.trip.budgetCurrency,
			expenses: workspace.expenses,
			itineraryItems: workspace.itineraryItems,
			remainingTripDays: getBudgetDayCount(workspace.trip, getTripTodayKey()),
		});
	}, [workspace]);

	if (!tripId) {
		return (
			<ScreenShell
				leading="close"
				state={{
					description: "Open a saved trip before using Travel Mode.",
					icon: "navigate-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Today"
			/>
		);
	}

	if (workspace === null) {
		return (
			<ScreenShell
				leading="close"
				state={{
					description: "This trip was deleted or is no longer available.",
					icon: "navigate-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Today"
			/>
		);
	}

	if (workspace === undefined || !wallet) {
		return (
			<ScreenShell
				leading="close"
				state={{ kind: "loading", title: "Loading Travel Mode" }}
				title="Today"
			/>
		);
	}

	const currency = workspace.trip.budgetCurrency ?? "PHP";
	const today = getTripTodayKey();
	const {
		hero: now,
		heroKind,
		upcoming,
	} = getNowAndNext({
		days: workspace.itineraryDays,
		items: workspace.itineraryItems,
	});
	const budgetDays = getBudgetDayCount(workspace.trip, today);
	const countdown = getTripCountdown(workspace.trip, today);
	const bookingCounts = getBookingCounts(workspace.bookings, currency);
	const activeBookings = workspace.bookings.filter((booking) =>
		isBookingSecured(booking.status)
	);
	const openItinerary = () => router.push(VIYA_ROUTES.tripItinerary(tripId));
	const heroEmpty = ((): TravelEmptyState => {
		if (countdown.phase === "upcoming") {
			// `upcoming` starts after the next stop, so the hero is the first stop.
			const firstStop = now?.item ?? upcoming.at(0)?.item;

			return {
				actionLabel: "Open itinerary",
				description: `Day 1 is ${formatDay(workspace.trip.startDate ?? "")}.${
					firstStop
						? ` First stop: ${firstStop.title} at ${formatTime(firstStop.startTime)}.`
						: ""
				}`,
				onPress: openItinerary,
				title: `Trip starts ${formatTripCountdown(countdown).toLowerCase()}`,
			};
		}
		if (countdown.phase === "ended" || countdown.phase === "completed") {
			return {
				actionLabel: "Open recap",
				description: "See what you did and spent.",
				onPress: () => router.push(VIYA_ROUTES.tripWrapped(tripId)),
				title: workspace.trip.endDate
					? `This trip ended ${formatShortDate(workspace.trip.endDate)}`
					: "This trip has ended",
			};
		}

		return {
			actionLabel: "Open itinerary",
			description: "Add stops with times to see them here.",
			onPress: openItinerary,
			title:
				workspace.itineraryItems.length === 0
					? "No stops planned"
					: "Nothing more planned",
		};
	})();
	const showHero =
		Boolean(now) &&
		countdown.phase !== "upcoming" &&
		countdown.phase !== "ended" &&
		countdown.phase !== "completed";
	const heroEntry = showHero ? now : null;
	const upcomingStops = showHero ? upcoming : [];
	const vaultItemById = new Map(
		workspace.vaultItems.map((item) => [item._id, item])
	);
	const activeBookingReferences: TravelBookingReference[] = activeBookings.map(
		(booking) => {
			const proofItem = booking.vaultItemId
				? vaultItemById.get(booking.vaultItemId)
				: null;

			return {
				booking,
				detail: [
					booking.startDateTime
						? [
								formatDay(booking.startDateTime.slice(0, 10)),
								formatTime(booking.startDateTime.slice(11, 16)),
							]
								.filter(Boolean)
								.join(", ")
						: null,
					booking.provider,
					booking.confirmationCode ? `Ref ${booking.confirmationCode}` : null,
				]
					.filter(Boolean)
					.join(" · "),
				proofUrl: proofItem?.url,
			};
		}
	);
	const allDocuments: TravelDocumentReference[] = [
		...workspace.documents
			.filter((document) => document.status !== "missing")
			.map((document) => ({
				detail: document.expiryDate
					? `Expires ${formatDay(document.expiryDate, { year: "always" })}`
					: formatEnumLabel(document.type),
				key: `document:${document._id}`,
				title: document.title,
			})),
		...workspace.vaultItems
			.filter((item) => item.kind === "booking" || item.kind === "document")
			.map((item) => ({
				detail: [vaultKindLabels[item.kind], formatFileSize(item.fileSize)]
					.filter(Boolean)
					.join(" · "),
				key: `vault:${item._id}`,
				title: item.title,
				url: item.url,
			})),
	];
	const activeDocuments = allDocuments.slice(0, MAX_REFERENCES);
	const openRisks = workspace.risks.filter((risk) => risk.status === "open");
	const urgentRisks = openRisks.filter(
		(risk) => risk.severity === "high" || risk.severity === "critical"
	);
	const quickNoteRelatedContext = getQuickNoteRelatedContext(heroEntry);
	const quickExpenseContext = getQuickExpenseContext(
		heroEntry,
		workspace.bookings
	);
	const canOpenNowInMaps = Boolean(
		heroEntry &&
			hasTripMapSearchTarget({
				address: heroEntry.item.address,
				latitude: heroEntry.item.latitude,
				locationName: heroEntry.item.locationName,
				longitude: heroEntry.item.longitude,
			})
	);
	const isNowCompleted = heroEntry?.item.status === "completed";

	const handleQuickExpense = async () => {
		const amount = Number(expenseForm.amount.replaceAll(",", ""));
		const title = expenseForm.title.trim();

		if (!title) {
			setExpenseError("Add a short title.");
			return;
		}

		if (!(Number.isFinite(amount) && amount > 0)) {
			setExpenseError("Enter an amount above zero.");
			return;
		}

		setIsSavingExpense(true);
		setExpenseError(null);
		try {
			await addTripExpense({
				amount,
				...(quickExpenseContext.bookingId
					? { bookingId: quickExpenseContext.bookingId }
					: {}),
				category: quickExpenseContext.category,
				currency,
				spentAt: getTripTodayKey(),
				title,
				tripId,
			});
			setExpenseForm({ amount: "", title: "" });
			setIsExpenseOpen(false);
			haptic("success");
		} catch (error) {
			haptic("error");
			setExpenseError(
				error instanceof Error ? error.message : "Could not log the expense."
			);
		} finally {
			setIsSavingExpense(false);
		}
	};

	const handleQuickNote = async () => {
		const body = noteForm.body.trim();
		const title =
			noteForm.title.trim() || `Note · ${formatDay(getTripTodayKey())}`;

		if (!body) {
			setNoteError("Write the note first.");
			return;
		}

		setIsSavingNote(true);
		setNoteError(null);
		try {
			await createTripNote({
				body,
				category: "travel",
				relatedEntityId: quickNoteRelatedContext?.id,
				relatedEntityType: quickNoteRelatedContext?.type,
				title,
				tripId,
			});
			setNoteForm({ body: "", title: "" });
			setIsNoteOpen(false);
			haptic("success");
		} catch (error) {
			haptic("error");
			setNoteError(
				error instanceof Error ? error.message : "Could not save the note."
			);
		} finally {
			setIsSavingNote(false);
		}
	};

	const handleToggleCurrentItem = async () => {
		if (!heroEntry) {
			return;
		}

		setIsUpdatingCurrentItem(true);
		setCurrentItemError(null);
		try {
			await updateItineraryItem({
				itemId: heroEntry.item._id,
				status: isNowCompleted ? "planned" : "completed",
			});
			haptic(isNowCompleted ? "selection" : "success");
		} catch (error) {
			setCurrentItemError(
				error instanceof Error ? error.message : "Could not update this stop."
			);
		} finally {
			setIsUpdatingCurrentItem(false);
		}
	};
	const handleOpenMaps = async (item: Doc<"itineraryItems">) => {
		setMapError(null);
		try {
			await Linking.openURL(
				getTripMapSearchUrl({
					address: item.address,
					label: item.title,
					latitude: item.latitude,
					locationName: item.locationName,
					longitude: item.longitude,
				})
			);
		} catch {
			setMapError("Could not open Maps for this stop.");
		}
	};
	const handleOpenTravelDocument = async (url: string) => {
		setDocumentOpenError(null);
		try {
			await Linking.openURL(url);
		} catch {
			setDocumentOpenError("Could not open this document.");
		}
	};

	return (
		<>
			<ScreenShell leading="close" summary={workspace.trip.title} title="Today">
				<InlineError message={currentItemError} />
				<InlineError message={mapError} />
				<InlineError message={documentOpenError} />

				<NowSection
					canOpenMaps={canOpenNowInMaps}
					empty={heroEmpty}
					entry={heroEntry}
					eyebrow={
						heroEntry
							? getHeroEyebrow({ entry: heroEntry, heroKind, today })
							: ""
					}
					isUpdating={isUpdatingCurrentItem}
					onOpenBooking={() => router.push(VIYA_ROUTES.tripBookings(tripId))}
					onOpenMaps={(item) => {
						handleOpenMaps(item).catch(() => undefined);
					}}
					onToggle={() => {
						handleToggleCurrentItem().catch(() => undefined);
					}}
				/>

				{urgentRisks.length > 0 ? (
					<ListGroup>
						<ListRow
							leading={<Icon name="warning-outline" size={20} tone="warning" />}
							onPress={() => router.push(VIYA_ROUTES.tripRisks(tripId))}
							subtitle={urgentRisks[0]?.title}
							title={formatCount(urgentRisks.length, "urgent risk")}
						/>
					</ListGroup>
				) : null}

				{upcomingStops.length > 0 ? (
					<ListGroup header="Up next">
						{upcomingStops.map((entry) => (
							<ListRow
								key={entry.item._id}
								onPress={() => router.push(VIYA_ROUTES.tripItinerary(tripId))}
								subtitle={
									[
										entry.item.locationName,
										entry.day && entry.day.date !== today
											? formatDay(entry.day.date)
											: null,
									]
										.filter(Boolean)
										.join(" · ") || undefined
								}
								title={entry.item.title}
								value={formatTime(entry.item.startTime)}
							/>
						))}
					</ListGroup>
				) : null}

				<ListGroup header="Add">
					<ListRow
						leading={<Icon name="wallet-outline" size={20} />}
						onPress={() => {
							setExpenseError(null);
							setIsExpenseOpen(true);
						}}
						showChevron={false}
						title="Log expense"
					/>
					<ListRow
						leading={<Icon name="create-outline" size={20} />}
						onPress={() => {
							setNoteError(null);
							setIsNoteOpen(true);
						}}
						showChevron={false}
						title="Add note"
					/>
					<ListRow
						leading={<Icon name="warning-outline" size={20} />}
						onPress={() => router.push(VIYA_ROUTES.tripRisks(tripId))}
						title="Add a risk"
					/>
				</ListGroup>

				{activeBookingReferences.length > 0 ? (
					<ListGroup header="Tickets">
						{activeBookingReferences
							.slice(0, MAX_REFERENCES)
							.map(({ booking, detail, proofUrl }) => (
								<ListRow
									key={booking._id}
									leading={<Icon name="ticket-outline" size={20} />}
									onPress={
										proofUrl
											? () => {
													handleOpenTravelDocument(proofUrl).catch(
														() => undefined
													);
												}
											: undefined
									}
									showChevron={false}
									subtitle={detail}
									title={booking.title}
									trailing={
										proofUrl ? (
											<Icon name="open-outline" size={18} tone="secondary" />
										) : undefined
									}
								/>
							))}
					</ListGroup>
				) : null}

				{activeDocuments.length > 0 ? (
					<ListGroup header="Documents">
						{activeDocuments.map((document) => {
							const documentUrl = document.url;

							return (
								<ListRow
									key={document.key}
									leading={<Icon name="document-outline" size={20} />}
									onPress={
										documentUrl
											? () => {
													handleOpenTravelDocument(documentUrl).catch(
														() => undefined
													);
												}
											: undefined
									}
									showChevron={false}
									subtitle={document.detail}
									title={document.title}
									trailing={
										documentUrl ? (
											<Icon name="open-outline" size={18} tone="secondary" />
										) : undefined
									}
								/>
							);
						})}
					</ListGroup>
				) : null}

				<ListGroup header="Trip">
					<ListRow
						onPress={() => router.push(VIYA_ROUTES.tripBookings(tripId))}
						title="Bookings"
						value={`${bookingCounts.booked} of ${bookingCounts.total} booked`}
					/>
					<ListRow
						onPress={() => router.push(VIYA_ROUTES.tripVault(tripId))}
						title="Documents"
						value={`${allDocuments.length} ready`}
					/>
					<ListRow
						onPress={() => router.push(VIYA_ROUTES.tripRisks(tripId))}
						title="Risks"
						value={`${openRisks.length} open`}
					/>
					<ListRow
						onPress={() => router.push(VIYA_ROUTES.tripNotes(tripId))}
						title="Notes"
						value={formatCount(workspace.notes.length, "note")}
					/>
					{workspace.trip.budgetAmount ? (
						<ListRow
							showChevron={false}
							subtitle={`${formatMoney(wallet.leftAmount, currency)} left for ${formatCount(budgetDays, "day")}`}
							title="Budget for today"
							value={
								wallet.overAmount > 0
									? `Over by ${formatMoney(wallet.overAmount, currency)}`
									: formatMoney(wallet.dailySafeSpend, currency)
							}
						/>
					) : null}
				</ListGroup>
			</ScreenShell>
			<QuickExpenseSheet
				error={expenseError}
				form={expenseForm}
				isOpen={isExpenseOpen}
				isSaving={isSavingExpense}
				linkedBookingLabel={quickExpenseContext.bookingLabel}
				onOpenChange={setIsExpenseOpen}
				onSubmit={() => {
					handleQuickExpense().catch(() => undefined);
				}}
				plannedCategoryLabel={quickExpenseContext.categoryLabel}
				setForm={setExpenseForm}
			/>
			<QuickNoteSheet
				error={noteError}
				form={noteForm}
				isOpen={isNoteOpen}
				isSaving={isSavingNote}
				onOpenChange={setIsNoteOpen}
				onSubmit={() => {
					handleQuickNote().catch(() => undefined);
				}}
				relatedLabel={quickNoteRelatedContext?.label ?? null}
				setForm={setNoteForm}
			/>
		</>
	);
}
