import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getBudgetWalletSummary } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { type Href, Link, useRouter } from "expo-router";
import { Input, Label, TextArea, TextField } from "heroui-native";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Linking, View } from "react-native";
import {
	ActionPill,
	GroupLabel,
	IconBadge,
	InlineError,
	MetaTag,
	ModuleLoading,
	ModuleMissing,
	ModuleScroll,
	Reveal,
	type Tone,
} from "@/src/components/itinerary/trip-module-ui";
import {
	AppText,
	Card,
	haptic,
	type IconName,
	ListGroup,
	ListRow,
	metrics,
	PrimaryButton,
	radius,
	SecondaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";

import { formatMoney } from "./trip-dashboard-utils";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import {
	getTripRelatedEntityLabel,
	getTripRelatedEntityLabelByKey,
} from "./trip-related-entities";
import { useTripIdParam } from "./use-trip-id-param";

const dateMs = 86_400_000;

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

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const getTripBudgetDayCount = (startDate: string, endDate: string) => {
	const start = new Date(`${startDate}T00:00:00.000Z`);
	const end = new Date(`${endDate}T00:00:00.000Z`);
	const today = new Date(`${todayIsoDate()}T00:00:00.000Z`);

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return 1;
	}

	const tripDayCount = Math.max(
		1,
		Math.ceil((end.getTime() - start.getTime()) / dateMs) + 1
	);

	if (today.getTime() < start.getTime()) {
		return tripDayCount;
	}

	return Math.max(1, Math.ceil((end.getTime() - today.getTime()) / dateMs) + 1);
};

const getTimeRange = (item: Doc<"itineraryItems">) =>
	item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime;

const getTravelCurrentStatus = (
	entry: { item: Doc<"itineraryItems"> } | null
) => {
	if (!entry) {
		return "Unset";
	}

	if (entry.item.status === "completed") {
		return "Done";
	}

	return "Active";
};

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
	const categoryLabel = `${category.slice(0, 1).toUpperCase()}${category.slice(
		1
	)} spend`;

	return {
		bookingId,
		bookingLabel:
			bookings.find((booking) => booking._id === bookingId)?.title ?? null,
		category,
		categoryLabel,
	};
};

const getRiskTravelDetail = (
	risk: Doc<"risks">,
	relatedEntityLabelByKey: Map<string, string>
) => {
	const relatedEntityLabel = getTripRelatedEntityLabel(
		{
			relatedEntityId: risk.relatedEntityId,
			relatedEntityType: risk.relatedEntityType,
		},
		relatedEntityLabelByKey
	);

	return [relatedEntityLabel, risk.suggestedAction].filter(Boolean).join(" - ");
};

const getNowAndNext = ({
	days,
	items,
}: {
	days: Doc<"itineraryDays">[];
	items: Doc<"itineraryItems">[];
}) => {
	const dayById = new Map(days.map((day) => [day._id, day]));
	const nowKey = new Date().toISOString().slice(0, 16);
	const scheduledItems: TravelTimelineEntry[] = items
		.map((item) => {
			const day = dayById.get(item.dayId);

			return {
				day,
				item,
				sortKey: `${day?.date ?? ""}T${item.startTime || "00:00"}`,
			};
		})
		.sort((left, right) => left.sortKey.localeCompare(right.sortKey));
	const nextIndex = scheduledItems.findIndex(
		(entry) => entry.sortKey >= nowKey
	);

	if (nextIndex === -1) {
		return {
			next: null,
			now: scheduledItems.at(-1) ?? null,
		};
	}

	return {
		next: scheduledItems[nextIndex + 1] ?? null,
		now: scheduledItems[nextIndex] ?? null,
	};
};

function TravelInfoRow({
	actionHref,
	actionIcon,
	actionLabel,
	detail,
	icon,
	label,
	onAction,
	tone = "accent",
}: {
	actionHref?: Href;
	actionIcon?: IconName;
	actionLabel?: string;
	detail?: string;
	icon: IconName;
	label: string;
	onAction?: () => void;
	tone?: Tone;
}) {
	const canShowAction = Boolean(actionLabel && (actionHref || onAction));
	const actionButton = (
		<ActionPill
			icon={actionIcon ?? "open-outline"}
			label={actionLabel ?? ""}
			onPress={onAction}
		/>
	);
	const actionContent = actionHref ? (
		<Link asChild href={actionHref}>
			{actionButton}
		</Link>
	) : (
		actionButton
	);

	return (
		<Card padding="md">
			<View style={{ gap: spacing.md }}>
				<View
					style={{
						alignItems: "flex-start",
						flexDirection: "row",
						gap: spacing.md,
					}}
				>
					<IconBadge icon={icon} tone={tone} />
					<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
						<AppText variant="headline">{label}</AppText>
						{detail ? (
							<AppText tone="secondary" variant="subhead">
								{detail}
							</AppText>
						) : null}
					</View>
				</View>
				{canShowAction ? (
					<View style={{ alignSelf: "flex-start" }}>{actionContent}</View>
				) : null}
			</View>
		</Card>
	);
}

function TravelMetric({ label, value }: { label: string; value: string }) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.tile,
				flexBasis: "47%",
				flexGrow: 1,
				gap: 2,
				padding: spacing.md,
			}}
		>
			<AppText tone="secondary" variant="eyebrow">
				{label}
			</AppText>
			<AppText numberOfLines={1} variant="headline">
				{value}
			</AppText>
		</View>
	);
}

function TravelTimelineRow({
	detail,
	icon,
	label,
}: {
	detail: string;
	icon: IconName;
	label: string;
}) {
	return (
		<View
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.md,
			}}
		>
			<IconBadge icon={icon} />
			<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
				<AppText numberOfLines={1} variant="headline">
					{label}
				</AppText>
				<AppText numberOfLines={2} tone="secondary" variant="subhead">
					{detail}
				</AppText>
			</View>
		</View>
	);
}

function TravelStopMapButton({
	item,
	label,
	onOpenMaps,
	variant = "secondary",
}: {
	item?: Doc<"itineraryItems">;
	label: string;
	onOpenMaps: (item: Doc<"itineraryItems">) => void;
	variant?: "primary" | "secondary";
}) {
	if (
		!(
			item &&
			hasTripMapSearchTarget({
				address: item.address,
				latitude: item.latitude,
				locationName: item.locationName,
				longitude: item.longitude,
			})
		)
	) {
		return null;
	}

	return (
		<ActionPill
			icon="map-outline"
			label={label}
			onPress={() => onOpenMaps(item)}
			variant={variant}
		/>
	);
}

function TravelCurrentActions({
	currentItemActionLabel,
	entry,
	isUpdatingCurrentItem,
	onOpenMaps,
	onToggleCurrentItem,
}: {
	currentItemActionLabel: string;
	entry: TravelTimelineEntry | null;
	isUpdatingCurrentItem: boolean;
	onOpenMaps: (item: Doc<"itineraryItems">) => void;
	onToggleCurrentItem: () => void;
}) {
	if (!entry) {
		return null;
	}

	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
			<TravelStopMapButton
				item={entry.item}
				label="Open Maps"
				onOpenMaps={onOpenMaps}
				variant="primary"
			/>
			<ActionPill
				disabled={isUpdatingCurrentItem}
				icon="checkmark-circle-outline"
				label={currentItemActionLabel}
				onPress={onToggleCurrentItem}
			/>
		</View>
	);
}

/** Plain field for in-page forms (not inside a bottom sheet). */
function QuickField({
	keyboardType,
	label,
	multiline,
	onChangeText,
	placeholder,
	value,
}: {
	keyboardType?: "default" | "numeric";
	label: string;
	multiline?: boolean;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { palette } = useUITheme();
	const fieldStyle = {
		backgroundColor: palette.fill,
		borderRadius: radius.field,
		borderWidth: 0,
	} as const;

	return (
		<TextField className="gap-1.5">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			{multiline ? (
				<TextArea
					className="px-4 py-3"
					onChangeText={onChangeText}
					placeholder={placeholder}
					style={{ ...fieldStyle, minHeight: 96 }}
					value={value}
					variant="secondary"
				/>
			) : (
				<Input
					className="px-4"
					keyboardType={keyboardType}
					onChangeText={onChangeText}
					placeholder={placeholder}
					style={{ ...fieldStyle, height: metrics.actionHeight }}
					value={value}
					variant="secondary"
				/>
			)}
		</TextField>
	);
}

function QuickExpensePanel({
	error,
	form,
	linkedBookingLabel,
	plannedCategoryLabel,
	isSaving,
	onSubmit,
	setForm,
	tripId,
}: {
	error: string | null;
	form: QuickExpenseForm;
	linkedBookingLabel: string | null;
	plannedCategoryLabel: string;
	isSaving: boolean;
	onSubmit: () => void;
	setForm: Dispatch<SetStateAction<QuickExpenseForm>>;
	tripId: Id<"trips">;
}) {
	const router = useRouter();

	return (
		<Card>
			<View style={{ gap: spacing.md }}>
				<AppText accessibilityRole="header" variant="heading">
					Quick expense
				</AppText>
				<View
					style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}
				>
					<MetaTag icon="pricetag-outline" label={plannedCategoryLabel} />
					{linkedBookingLabel ? (
						<MetaTag
							icon="ticket-outline"
							label={`Links to ${linkedBookingLabel}`}
						/>
					) : null}
				</View>
				<QuickField
					label="Title"
					onChangeText={(title) =>
						setForm((current) => ({ ...current, title }))
					}
					placeholder="Taxi, snack, ticket"
					value={form.title}
				/>
				<QuickField
					keyboardType="numeric"
					label="Amount"
					onChangeText={(amount) =>
						setForm((current) => ({ ...current, amount }))
					}
					placeholder="500"
					value={form.amount}
				/>
				<InlineError message={error} />
				<PrimaryButton
					isPending={isSaving}
					label="Log expense"
					onPress={() => {
						onSubmit();
					}}
				/>
				<SecondaryButton
					label="Open budget"
					onPress={() => router.push(VIYA_ROUTES.tripBudget(tripId))}
					variant="plain"
				/>
			</View>
		</Card>
	);
}

function QuickNotePanel({
	error,
	form,
	isSaving,
	noteCount,
	onSubmit,
	relatedLabel,
	setForm,
	tripId,
}: {
	error: string | null;
	form: QuickNoteForm;
	isSaving: boolean;
	noteCount: number;
	onSubmit: () => void;
	relatedLabel: string | null;
	setForm: Dispatch<SetStateAction<QuickNoteForm>>;
	tripId: Id<"trips">;
}) {
	const router = useRouter();

	return (
		<Card>
			<View style={{ gap: spacing.md }}>
				<View
					style={{
						alignItems: "flex-start",
						flexDirection: "row",
						gap: spacing.md,
					}}
				>
					<View style={{ flex: 1, gap: 2 }}>
						<AppText accessibilityRole="header" variant="heading">
							Quick note
						</AppText>
						<AppText tone="secondary" variant="subhead">
							Capture travel-day decisions, reminders, and issues.
						</AppText>
					</View>
					<MetaTag label={`${noteCount} notes`} />
				</View>
				{relatedLabel ? (
					<MetaTag icon="link-outline" label={`Links to ${relatedLabel}`} />
				) : null}
				<QuickField
					label="Title"
					onChangeText={(title) =>
						setForm((current) => ({ ...current, title }))
					}
					placeholder="Gate changed, hotel request, reminder"
					value={form.title}
				/>
				<QuickField
					label="Note"
					multiline={true}
					onChangeText={(body) => setForm((current) => ({ ...current, body }))}
					placeholder="What should you remember from today?"
					value={form.body}
				/>
				<InlineError message={error} />
				<PrimaryButton
					isPending={isSaving}
					label="Save note"
					onPress={() => {
						onSubmit();
					}}
				/>
				<SecondaryButton
					label="Open notes"
					onPress={() => router.push(VIYA_ROUTES.tripNotes(tripId))}
					variant="plain"
				/>
			</View>
		</Card>
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
			remainingTripDays: getTripBudgetDayCount(
				workspace.trip.startDate,
				workspace.trip.endDate
			),
		});
	}, [workspace]);

	if (!tripId) {
		return (
			<ModuleMissing
				description="Open a saved trip before using Travel Mode."
				icon="navigate-outline"
			/>
		);
	}

	if (workspace === null) {
		return (
			<ModuleMissing
				description="This trip was deleted or is no longer available."
				icon="navigate-outline"
			/>
		);
	}

	if (workspace === undefined || !wallet) {
		return <ModuleLoading title="Loading Travel Mode" />;
	}

	const currency = workspace.trip.budgetCurrency ?? "PHP";
	const { next, now } = getNowAndNext({
		days: workspace.itineraryDays,
		items: workspace.itineraryItems,
	});
	const activeBookings = workspace.bookings.filter(
		(booking) => booking.status === "confirmed"
	);
	const relatedEntityLabelByKey = getTripRelatedEntityLabelByKey(workspace);
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
					booking.provider ?? "Provider TBD",
					booking.confirmationCode ?? "No code",
					proofItem?.fileName,
				]
					.filter(Boolean)
					.join(" · "),
				proofUrl: proofItem?.url,
			};
		}
	);
	const activeDocuments: TravelDocumentReference[] = [
		...workspace.documents
			.filter((document) => document.status !== "missing")
			.map((document) => ({
				detail: `${document.status} checklist item`,
				key: `document:${document._id}`,
				title: document.title,
			})),
		...workspace.vaultItems
			.filter((item) => item.kind === "booking" || item.kind === "document")
			.map((item) => ({
				detail: item.fileName,
				key: `vault:${item._id}`,
				title: item.title,
				url: item.url,
			})),
	].slice(0, 5);
	const openRisks = workspace.risks.filter((risk) => risk.status === "open");
	const currentStatus = getTravelCurrentStatus(now);
	const quickNoteRelatedContext = getQuickNoteRelatedContext(now);
	const quickExpenseContext = getQuickExpenseContext(now, workspace.bookings);

	const handleQuickExpense = async () => {
		const amount = Number(expenseForm.amount.replaceAll(",", ""));
		const title = expenseForm.title.trim();

		if (!title) {
			setExpenseError("Add a short expense title.");
			return;
		}

		if (!(Number.isFinite(amount) && amount > 0)) {
			setExpenseError("Amount must be positive.");
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
				spentAt: todayIsoDate(),
				title,
				tripId,
			});
			setExpenseForm({ amount: "", title: "" });
			haptic("success");
		} catch (error) {
			haptic("error");
			setExpenseError(
				error instanceof Error ? error.message : "Could not log expense."
			);
		} finally {
			setIsSavingExpense(false);
		}
	};

	const handleQuickNote = async () => {
		const body = noteForm.body.trim();
		const title = noteForm.title.trim() || `Travel note ${todayIsoDate()}`;

		if (!body) {
			setNoteError("Add the note details first.");
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
			haptic("success");
		} catch (error) {
			haptic("error");
			setNoteError(
				error instanceof Error ? error.message : "Could not save note."
			);
		} finally {
			setIsSavingNote(false);
		}
	};

	const handleToggleCurrentItem = async () => {
		if (!now) {
			return;
		}

		setIsUpdatingCurrentItem(true);
		setCurrentItemError(null);
		try {
			await updateItineraryItem({
				itemId: now.item._id,
				status: now.item.status === "completed" ? "planned" : "completed",
			});
			haptic(now.item.status === "completed" ? "selection" : "success");
		} catch (error) {
			setCurrentItemError(
				error instanceof Error
					? error.message
					: "Could not update the current item."
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
	const currentItemActionLabel = (() => {
		if (isUpdatingCurrentItem) {
			return "Updating...";
		}

		if (now?.item.status === "completed") {
			return "Mark current planned";
		}

		return "Complete current";
	})();

	return (
		<TripModuleScreenFrame activeTab="travel" tripId={tripId}>
			<ModuleScroll>
				<InlineError message={currentItemError} />
				<InlineError message={mapError} />
				<InlineError message={documentOpenError} />

				<Reveal>
					<Card>
						<View style={{ gap: spacing.lg }}>
							<View
								style={{
									alignItems: "center",
									flexDirection: "row",
									gap: spacing.md,
								}}
							>
								<IconBadge icon="navigate-outline" size={44} />
								<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
									<AppText accessibilityRole="header" variant="heading">
										Day command center
									</AppText>
									<AppText numberOfLines={1} tone="secondary" variant="subhead">
										{workspace.trip.destination}
									</AppText>
								</View>
								<MetaTag
									label={currentStatus}
									tone={currentStatus === "Active" ? "accent" : "neutral"}
								/>
							</View>
							<View
								style={{
									flexDirection: "row",
									flexWrap: "wrap",
									gap: spacing.sm,
								}}
							>
								<TravelMetric
									label="Daily safe"
									value={formatMoney(wallet.dailySafeSpend, currency)}
								/>
								<TravelMetric
									label="Bookings"
									value={`${activeBookings.length} confirmed`}
								/>
								<TravelMetric
									label="Documents"
									value={`${activeDocuments.length} ready`}
								/>
								<TravelMetric
									label="Risks"
									value={`${openRisks.length} open`}
								/>
							</View>
							<TravelTimelineRow
								detail={
									now
										? `${getTimeRange(now.item)} · ${
												now.item.locationName || "Location TBD"
											}`
										: "Add timed itinerary items to power Travel Mode."
								}
								icon="play-circle-outline"
								label={now?.item.title ?? "No current item"}
							/>
							<TravelCurrentActions
								currentItemActionLabel={currentItemActionLabel}
								entry={now}
								isUpdatingCurrentItem={isUpdatingCurrentItem}
								onOpenMaps={(item) => {
									handleOpenMaps(item).catch(() => undefined);
								}}
								onToggleCurrentItem={() => {
									handleToggleCurrentItem().catch(() => undefined);
								}}
							/>
							<TravelTimelineRow
								detail={
									next
										? `${getTimeRange(next.item)} · ${
												next.item.locationName || "Location TBD"
											}`
										: "No upcoming item found."
								}
								icon="play-forward-outline"
								label={next?.item.title ?? "No next item"}
							/>
							<View
								style={{
									flexDirection: "row",
									flexWrap: "wrap",
									gap: spacing.sm,
								}}
							>
								<TravelStopMapButton
									item={next?.item}
									label="Open Maps for next stop"
									onOpenMaps={(item) => {
										handleOpenMaps(item).catch(() => undefined);
									}}
								/>
								{next ? null : (
									<Link asChild href={VIYA_ROUTES.tripItinerary(tripId)}>
										<ActionPill
											icon="calendar-outline"
											label="Plan next stop"
										/>
									</Link>
								)}
							</View>
						</View>
					</Card>
				</Reveal>

				<ListGroup header="Jump to">
					<ListRow
						leading={<IconBadge icon="calendar-outline" size={30} />}
						onPress={() => router.push(VIYA_ROUTES.tripItinerary(tripId))}
						title="Itinerary"
					/>
					<ListRow
						leading={<IconBadge icon="documents-outline" size={30} />}
						onPress={() => router.push(VIYA_ROUTES.tripVault(tripId))}
						title="Documents"
					/>
					<ListRow
						leading={
							<IconBadge icon="warning-outline" size={30} tone="warning" />
						}
						onPress={() => router.push(VIYA_ROUTES.tripRisks(tripId))}
						title="Risks"
					/>
					<ListRow
						leading={<IconBadge icon="document-text-outline" size={30} />}
						onPress={() => router.push(VIYA_ROUTES.tripNotes(tripId))}
						title="Notes"
					/>
				</ListGroup>

				<QuickExpensePanel
					error={expenseError}
					form={expenseForm}
					isSaving={isSavingExpense}
					linkedBookingLabel={quickExpenseContext.bookingLabel}
					onSubmit={() => {
						handleQuickExpense().catch(() => undefined);
					}}
					plannedCategoryLabel={quickExpenseContext.categoryLabel}
					setForm={setExpenseForm}
					tripId={tripId}
				/>

				<QuickNotePanel
					error={noteError}
					form={noteForm}
					isSaving={isSavingNote}
					noteCount={workspace.notes.length}
					onSubmit={() => {
						handleQuickNote().catch(() => undefined);
					}}
					relatedLabel={quickNoteRelatedContext?.label ?? null}
					setForm={setNoteForm}
					tripId={tripId}
				/>

				<View style={{ gap: spacing.sm }}>
					<GroupLabel>TICKETS AND CONFIRMATIONS</GroupLabel>
					{activeBookings.length === 0 ? (
						<TravelInfoRow
							actionHref={VIYA_ROUTES.tripBookings(tripId)}
							actionIcon="ticket-outline"
							actionLabel="Review bookings"
							detail="Upload confirmations or mark booking targets confirmed."
							icon="ticket-outline"
							label="No confirmed bookings"
						/>
					) : (
						activeBookingReferences
							.slice(0, 5)
							.map(({ booking, detail, proofUrl }) => (
								<TravelInfoRow
									actionIcon="open-outline"
									actionLabel={proofUrl ? "Open proof" : undefined}
									detail={detail}
									icon="ticket-outline"
									key={booking._id}
									label={booking.title}
									onAction={
										proofUrl
											? () => {
													handleOpenTravelDocument(proofUrl).catch(
														() => undefined
													);
												}
											: undefined
									}
								/>
							))
					)}
				</View>

				<View style={{ gap: spacing.sm }}>
					<GroupLabel>IMPORTANT DOCUMENTS</GroupLabel>
					{activeDocuments.length === 0 ? (
						<TravelInfoRow
							actionHref={VIYA_ROUTES.tripVault(tripId)}
							actionIcon="cloud-upload-outline"
							actionLabel="Upload documents"
							detail="Upload IDs, tickets, vouchers, and insurance before travel."
							icon="documents-outline"
							label="No documents uploaded"
						/>
					) : (
						activeDocuments.map((document) => {
							const documentUrl = document.url;

							return (
								<TravelInfoRow
									actionIcon="open-outline"
									actionLabel={documentUrl ? "Open file" : undefined}
									detail={document.detail}
									icon="document-outline"
									key={document.key}
									label={document.title}
									onAction={
										documentUrl
											? () => {
													handleOpenTravelDocument(documentUrl).catch(
														() => undefined
													);
												}
											: undefined
									}
								/>
							);
						})
					)}
				</View>

				<View style={{ gap: spacing.sm }}>
					<GroupLabel>OPEN RISKS</GroupLabel>
					{openRisks.length === 0 ? (
						<TravelInfoRow
							actionHref={VIYA_ROUTES.tripRisks(tripId)}
							actionIcon="shield-checkmark-outline"
							actionLabel="Review risks"
							detail="Travel Mode will surface risk alerts here."
							icon="checkmark-circle-outline"
							label="No open risks"
							tone="success"
						/>
					) : (
						openRisks
							.slice(0, 4)
							.map((risk) => (
								<TravelInfoRow
									actionHref={VIYA_ROUTES.tripRisks(tripId)}
									actionIcon="warning-outline"
									actionLabel="Open risk"
									detail={getRiskTravelDetail(risk, relatedEntityLabelByKey)}
									icon="warning-outline"
									key={risk._id}
									label={risk.title}
									tone="warning"
								/>
							))
					)}
				</View>
			</ModuleScroll>
		</TripModuleScreenFrame>
	);
}
