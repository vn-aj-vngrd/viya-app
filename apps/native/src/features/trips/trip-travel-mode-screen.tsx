import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getBudgetWalletSummary } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { type Href, Link } from "expo-router";
import {
	Button,
	Chip,
	Input,
	Label,
	Spinner,
	Surface,
	Text,
	TextArea,
	TextField,
	useToast,
} from "heroui-native";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Linking, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";

import { formatMoney } from "./trip-dashboard-utils";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import { TripModuleManualEntryCard } from "./trip-module-manual-entry-card";
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
}: {
	actionHref?: Href;
	actionIcon?: ComponentProps<typeof Ionicons>["name"];
	actionLabel?: string;
	detail?: string;
	icon: ComponentProps<typeof Ionicons>["name"];
	label: string;
	onAction?: () => void;
}) {
	const canShowAction = Boolean(actionLabel && (actionHref || onAction));
	const actionButton = (
		<Button
			className="self-start"
			onPress={onAction}
			size="sm"
			variant="secondary"
		>
			<Ionicons color="#0A84FF" name={actionIcon ?? "open-outline"} size={16} />
			<Button.Label>{actionLabel}</Button.Label>
		</Button>
	);
	const actionContent = actionHref ? (
		<Link asChild href={actionHref}>
			{actionButton}
		</Link>
	) : (
		actionButton
	);

	return (
		<Surface className="gap-3 rounded-[24px] border border-border bg-surface p-4">
			<View className="flex-row items-start gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name={icon} size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text type="body-sm" weight="bold">
						{label}
					</Text>
					{detail ? (
						<Text.Paragraph color="muted" type="body-sm">
							{detail}
						</Text.Paragraph>
					) : null}
				</View>
			</View>
			{canShowAction ? actionContent : null}
		</Surface>
	);
}

function TravelMetric({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-[47%] flex-1 gap-1 rounded-[20px] bg-surface p-3">
			<Text color="muted" type="body-xs" weight="semibold">
				{label.toUpperCase()}
			</Text>
			<Text numberOfLines={1} type="body-sm" weight="bold">
				{value}
			</Text>
		</View>
	);
}

function TravelTimelineRow({
	detail,
	icon,
	label,
}: {
	detail: string;
	icon: ComponentProps<typeof Ionicons>["name"];
	label: string;
}) {
	return (
		<View className="flex-row items-start gap-3 rounded-[22px] bg-surface p-4">
			<View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
				<Ionicons color="#0A84FF" name={icon} size={17} />
			</View>
			<View className="min-w-0 flex-1 gap-1">
				<Text numberOfLines={1} type="body-sm" weight="bold">
					{label}
				</Text>
				<Text color="muted" numberOfLines={2} type="body-sm">
					{detail}
				</Text>
			</View>
		</View>
	);
}

function TravelStopMapButton({
	className,
	item,
	label,
	onOpenMaps,
	variant = "secondary",
}: {
	className?: string;
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

	const iconColor = variant === "primary" ? "#FFFFFF" : "#0A84FF";

	return (
		<Button
			className={className}
			onPress={() => onOpenMaps(item)}
			size="sm"
			variant={variant}
		>
			<Ionicons color={iconColor} name="map-outline" size={16} />
			<Button.Label>{label}</Button.Label>
		</Button>
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
		<View className="flex-row flex-wrap gap-2">
			<TravelStopMapButton
				className="min-w-[47%] flex-1"
				item={entry.item}
				label="Open Maps"
				onOpenMaps={onOpenMaps}
				variant="primary"
			/>
			<Button
				className="min-w-[47%] flex-1"
				isDisabled={isUpdatingCurrentItem}
				onPress={onToggleCurrentItem}
				size="sm"
				variant="secondary"
			>
				{isUpdatingCurrentItem ? <Spinner size="sm" /> : null}
				<Button.Label>{currentItemActionLabel}</Button.Label>
			</Button>
		</View>
	);
}

function TravelActionLink({
	href,
	icon,
	label,
}: {
	href: Href;
	icon: ComponentProps<typeof Ionicons>["name"];
	label: string;
}) {
	return (
		<Link asChild href={href}>
			<Button className="min-w-[47%] flex-1" size="sm" variant="secondary">
				<Ionicons color="#0A84FF" name={icon} size={16} />
				<Button.Label>{label}</Button.Label>
			</Button>
		</Link>
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
	return (
		<View className="gap-3 rounded-[26px] border border-border bg-surface p-5">
			<Text.Heading type="h5" weight="semibold">
				Quick expense
			</Text.Heading>
			<View className="flex-row flex-wrap gap-2">
				<Chip size="sm" variant="secondary">
					<Chip.Label>{plannedCategoryLabel}</Chip.Label>
				</Chip>
				{linkedBookingLabel ? (
					<Chip size="sm" variant="secondary">
						<Chip.Label>Links to {linkedBookingLabel}</Chip.Label>
					</Chip>
				) : null}
			</View>
			<TextField className="gap-2">
				<Label>
					<Label.Text>Title</Label.Text>
				</Label>
				<Input
					className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
					onChangeText={(title) =>
						setForm((current) => ({ ...current, title }))
					}
					placeholder="Taxi, snack, ticket"
					value={form.title}
					variant="secondary"
				/>
			</TextField>
			<TextField className="gap-2">
				<Label>
					<Label.Text>Amount</Label.Text>
				</Label>
				<Input
					className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
					keyboardType="numeric"
					onChangeText={(amount) =>
						setForm((current) => ({ ...current, amount }))
					}
					placeholder="500"
					value={form.amount}
					variant="secondary"
				/>
			</TextField>
			{error ? (
				<Text className="text-danger" type="body-sm">
					{error}
				</Text>
			) : null}
			<Button
				isDisabled={isSaving}
				onPress={() => {
					onSubmit();
				}}
			>
				{isSaving ? <Spinner size="sm" /> : null}
				<Button.Label>Log expense</Button.Label>
			</Button>
			<Link asChild href={VIYA_ROUTES.tripBudget(tripId)}>
				<Button variant="secondary">
					<Button.Label>Open budget</Button.Label>
				</Button>
			</Link>
		</View>
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
	return (
		<View className="gap-3 rounded-[26px] border border-border bg-surface p-5">
			<View className="flex-row items-start justify-between gap-3">
				<View className="min-w-0 flex-1 gap-1">
					<Text.Heading type="h5" weight="semibold">
						Quick note
					</Text.Heading>
					<Text color="muted" type="body-sm">
						Capture travel-day decisions, reminders, and issues.
					</Text>
				</View>
				<Chip size="sm" variant="secondary">
					<Chip.Label>{noteCount} notes</Chip.Label>
				</Chip>
			</View>
			{relatedLabel ? (
				<View className="flex-row flex-wrap gap-2">
					<Chip size="sm" variant="secondary">
						<Chip.Label>Links to {relatedLabel}</Chip.Label>
					</Chip>
				</View>
			) : null}
			<TextField className="gap-2">
				<Label>
					<Label.Text>Title</Label.Text>
				</Label>
				<Input
					className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
					onChangeText={(title) =>
						setForm((current) => ({ ...current, title }))
					}
					placeholder="Gate changed, hotel request, reminder"
					value={form.title}
					variant="secondary"
				/>
			</TextField>
			<TextField className="gap-2">
				<Label>
					<Label.Text>Note</Label.Text>
				</Label>
				<TextArea
					className="min-h-24 rounded-[18px] border-0 bg-surface-secondary px-4 py-3"
					onChangeText={(body) => setForm((current) => ({ ...current, body }))}
					placeholder="What should you remember from today?"
					value={form.body}
					variant="secondary"
				/>
			</TextField>
			{error ? (
				<Text className="text-danger" type="body-sm">
					{error}
				</Text>
			) : null}
			<Button
				isDisabled={isSaving}
				onPress={() => {
					onSubmit();
				}}
			>
				{isSaving ? <Spinner size="sm" /> : null}
				<Button.Label>Save note</Button.Label>
			</Button>
			<Link asChild href={VIYA_ROUTES.tripNotes(tripId)}>
				<Button variant="secondary">
					<Button.Label>Open notes</Button.Label>
				</Button>
			</Link>
		</View>
	);
}

export function TripTravelModeScreen() {
	const tripId = useTripIdParam();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const addTripExpense = useMutation(api.trips.addTripExpense);
	const createTripNote = useMutation(api.notes.createTripNote);
	const updateItineraryItem = useMutation(api.itinerary.updateItineraryItem);
	const { toast } = useToast();
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
	const [expenseError, setExpenseError] = useState<string | null>(null);
	const [noteError, setNoteError] = useState<string | null>(null);

	const showTravelModeSuccessToast = (message: string) => {
		toast.show({
			description: message,
			duration: 3600,
			label: "Travel Mode updated",
			variant: "success",
		});
	};

	const showTravelModeErrorToast = (message: string) => {
		toast.show({
			description: message,
			duration: 4200,
			label: "Travel Mode needs attention",
			variant: "danger",
		});
	};

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
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before using Travel Mode."
					icon="navigate-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === null) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="This trip was deleted or is no longer available."
					icon="navigate-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined || !wallet) {
		return <ScreenLoadingState />;
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
			showTravelModeSuccessToast("Expense logged.");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Could not log expense.";
			setExpenseError(message);
			showTravelModeErrorToast(message);
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
			showTravelModeSuccessToast("Travel note saved.");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Could not save note.";
			setNoteError(message);
			showTravelModeErrorToast(message);
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
			showTravelModeSuccessToast(
				now.item.status === "completed"
					? "Current item reopened."
					: "Current item completed."
			);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Could not update the current item.";
			setCurrentItemError(message);
			showTravelModeErrorToast(message);
		} finally {
			setIsUpdatingCurrentItem(false);
		}
	};
	const handleOpenMaps = async (item: Doc<"itineraryItems">) => {
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
			showTravelModeErrorToast("Could not open Maps for this stop.");
		}
	};
	const handleOpenTravelDocument = async (url: string) => {
		try {
			await Linking.openURL(url);
		} catch {
			showTravelModeErrorToast("Could not open this document.");
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
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<TripModuleManualEntryCard
						description="Use this day-of view to complete the current item, log expenses, save notes, and review documents."
						isPrimaryDisabled={!now || isUpdatingCurrentItem}
						moduleLabel="Travel Mode"
						onPrimaryPress={() => {
							handleToggleCurrentItem().catch(() => undefined);
						}}
						primaryActionIcon="checkmark-circle-outline"
						primaryActionLabel={currentItemActionLabel}
					/>
					{currentItemError ? (
						<Text className="px-1 text-danger" type="body-sm">
							{currentItemError}
						</Text>
					) : null}

					<View className="gap-4 rounded-[30px] bg-surface-secondary p-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="min-w-0 flex-1 flex-row items-center gap-3">
								<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
									<Ionicons color="#0A84FF" name="navigate-outline" size={20} />
								</View>
								<View className="min-w-0 flex-1 gap-1">
									<Text.Heading type="h5" weight="semibold">
										Day command center
									</Text.Heading>
									<Text color="muted" numberOfLines={1} type="body-sm">
										{workspace.trip.destination}
									</Text>
								</View>
							</View>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{currentStatus}</Chip.Label>
							</Chip>
						</View>
						<View className="flex-row flex-wrap gap-3">
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
							<TravelMetric label="Risks" value={`${openRisks.length} open`} />
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
						<TravelStopMapButton
							item={next?.item}
							label="Open Maps for next stop"
							onOpenMaps={(item) => {
								handleOpenMaps(item).catch(() => undefined);
							}}
						/>
						{next ? null : (
							<Link asChild href={VIYA_ROUTES.tripItinerary(tripId)}>
								<Button size="sm" variant="secondary">
									<Ionicons color="#0A84FF" name="calendar-outline" size={16} />
									<Button.Label>Plan next stop</Button.Label>
								</Button>
							</Link>
						)}
						<View className="flex-row flex-wrap gap-2">
							<TravelActionLink
								href={VIYA_ROUTES.tripItinerary(tripId)}
								icon="calendar-outline"
								label="Itinerary"
							/>
							<TravelActionLink
								href={VIYA_ROUTES.tripVault(tripId)}
								icon="documents-outline"
								label="Documents"
							/>
							<TravelActionLink
								href={VIYA_ROUTES.tripRisks(tripId)}
								icon="warning-outline"
								label="Risks"
							/>
							<TravelActionLink
								href={VIYA_ROUTES.tripNotes(tripId)}
								icon="document-text-outline"
								label="Notes"
							/>
						</View>
					</View>

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

					<View className="gap-3">
						<Text
							className="px-1"
							color="muted"
							type="body-xs"
							weight="semibold"
						>
							TICKETS AND CONFIRMATIONS
						</Text>
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

					<View className="gap-3">
						<Text
							className="px-1"
							color="muted"
							type="body-xs"
							weight="semibold"
						>
							IMPORTANT DOCUMENTS
						</Text>
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

					<View className="gap-3">
						<Text
							className="px-1"
							color="muted"
							type="body-xs"
							weight="semibold"
						>
							OPEN RISKS
						</Text>
						{openRisks.length === 0 ? (
							<TravelInfoRow
								actionHref={VIYA_ROUTES.tripRisks(tripId)}
								actionIcon="shield-checkmark-outline"
								actionLabel="Review risks"
								detail="Travel Mode will surface risk alerts here."
								icon="checkmark-circle-outline"
								label="No open risks"
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
									/>
								))
						)}
					</View>
				</View>
			</Container>
		</TripModuleScreenFrame>
	);
}
