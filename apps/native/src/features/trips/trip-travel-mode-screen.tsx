import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getBudgetWalletSummary } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { Link } from "expo-router";
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
} from "heroui-native";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";

import { formatMoney } from "./trip-dashboard-utils";
import { TripModuleViyaAssistCard } from "./trip-module-viya-assist-card";
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

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const getRemainingTripDays = (endDate: string) => {
	const end = new Date(`${endDate}T00:00:00.000Z`);
	const today = new Date(`${todayIsoDate()}T00:00:00.000Z`);

	if (Number.isNaN(end.getTime())) {
		return 1;
	}

	return Math.max(1, Math.ceil((end.getTime() - today.getTime()) / dateMs) + 1);
};

const getTimeRange = (item: Doc<"itineraryItems">) =>
	item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime;

const getNowAndNext = ({
	days,
	items,
}: {
	days: Doc<"itineraryDays">[];
	items: Doc<"itineraryItems">[];
}) => {
	const dayById = new Map(days.map((day) => [day._id, day]));
	const nowKey = new Date().toISOString().slice(0, 16);
	const scheduledItems = items
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
	detail,
	icon,
	label,
}: {
	detail?: string;
	icon: ComponentProps<typeof Ionicons>["name"];
	label: string;
}) {
	return (
		<Surface className="gap-2 rounded-[24px] border border-border bg-surface p-4">
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
		</Surface>
	);
}

function QuickExpensePanel({
	error,
	form,
	isSaving,
	onSubmit,
	setForm,
	tripId,
}: {
	error: string | null;
	form: QuickExpenseForm;
	isSaving: boolean;
	onSubmit: () => void;
	setForm: Dispatch<SetStateAction<QuickExpenseForm>>;
	tripId: Id<"trips">;
}) {
	return (
		<Surface className="gap-3 rounded-[26px] border border-border bg-surface p-5">
			<Text.Heading type="h5" weight="semibold">
				Quick expense
			</Text.Heading>
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
		</Surface>
	);
}

function QuickNotePanel({
	error,
	form,
	isSaving,
	noteCount,
	onSubmit,
	setForm,
	tripId,
}: {
	error: string | null;
	form: QuickNoteForm;
	isSaving: boolean;
	noteCount: number;
	onSubmit: () => void;
	setForm: Dispatch<SetStateAction<QuickNoteForm>>;
	tripId: Id<"trips">;
}) {
	return (
		<Surface className="gap-3 rounded-[26px] border border-border bg-surface p-5">
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
		</Surface>
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
	const [expenseError, setExpenseError] = useState<string | null>(null);
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
			remainingTripDays: getRemainingTripDays(workspace.trip.endDate),
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
	const activeDocuments = [
		...workspace.documents
			.filter((document) => document.status !== "missing")
			.map((document) => ({
				key: `document:${document._id}`,
				title: document.title,
			})),
		...workspace.vaultItems
			.filter((item) => item.kind === "booking" || item.kind === "document")
			.map((item) => ({ key: `vault:${item._id}`, title: item.title })),
	].slice(0, 5);
	const openRisks = workspace.risks.filter((risk) => risk.status === "open");

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
				category: "other",
				currency,
				spentAt: todayIsoDate(),
				title,
				tripId,
			});
			setExpenseForm({ amount: "", title: "" });
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
				title,
				tripId,
			});
			setNoteForm({ body: "", title: "" });
		} finally {
			setIsSavingNote(false);
		}
	};

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Travel"
					icon="navigate-outline"
					subtitle="Today-first view for itinerary, documents, risks, and spend."
					title="Travel Mode"
				/>
				<TripModuleViyaAssistCard
					agentModule="travel"
					description="Ask for day-of help, generate backup moves, or explain what to do next."
					moduleLabel="Travel Mode"
					tripId={tripId}
				/>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>{workspace.trip.destination}</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{formatMoney(wallet.dailySafeSpend, currency)} daily safe spend
							</Chip.Label>
						</Chip>
					</View>
					<TravelInfoRow
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
					{now ? (
						<Button
							onPress={() => {
								updateItineraryItem({
									itemId: now.item._id,
									status:
										now.item.status === "completed" ? "planned" : "completed",
								}).catch(() => undefined);
							}}
							size="sm"
							variant="secondary"
						>
							<Button.Label>
								{now.item.status === "completed"
									? "Mark current planned"
									: "Complete current item"}
							</Button.Label>
						</Button>
					) : null}
					<TravelInfoRow
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
				</Surface>

				<QuickExpensePanel
					error={expenseError}
					form={expenseForm}
					isSaving={isSavingExpense}
					onSubmit={() => {
						handleQuickExpense().catch(() => undefined);
					}}
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
					setForm={setNoteForm}
					tripId={tripId}
				/>

				<View className="gap-3">
					<Text className="px-1" color="muted" type="body-xs" weight="semibold">
						TICKETS AND CONFIRMATIONS
					</Text>
					{activeBookings.length === 0 ? (
						<TravelInfoRow
							detail="Upload confirmations or mark booking targets confirmed."
							icon="ticket-outline"
							label="No confirmed bookings"
						/>
					) : (
						activeBookings
							.slice(0, 5)
							.map((booking) => (
								<TravelInfoRow
									detail={`${booking.provider ?? "Provider TBD"} · ${
										booking.confirmationCode ?? "No code"
									}`}
									icon="ticket-outline"
									key={booking._id}
									label={booking.title}
								/>
							))
					)}
				</View>

				<View className="gap-3">
					<Text className="px-1" color="muted" type="body-xs" weight="semibold">
						IMPORTANT DOCUMENTS
					</Text>
					{activeDocuments.length === 0 ? (
						<TravelInfoRow
							detail="Upload IDs, tickets, vouchers, and insurance before travel."
							icon="documents-outline"
							label="No documents uploaded"
						/>
					) : (
						activeDocuments.map((document) => (
							<TravelInfoRow
								icon="document-outline"
								key={document.key}
								label={document.title}
							/>
						))
					)}
				</View>

				<View className="gap-3">
					<Text className="px-1" color="muted" type="body-xs" weight="semibold">
						OPEN RISKS
					</Text>
					{openRisks.length === 0 ? (
						<TravelInfoRow
							detail="Travel Mode will surface watch-outs here."
							icon="checkmark-circle-outline"
							label="No open risks"
						/>
					) : (
						openRisks
							.slice(0, 4)
							.map((risk) => (
								<TravelInfoRow
									detail={risk.suggestedAction}
									icon="warning-outline"
									key={risk._id}
									label={risk.title}
								/>
							))
					)}
				</View>
			</View>
		</Container>
	);
}
