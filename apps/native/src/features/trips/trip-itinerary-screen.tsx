import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import type { ItineraryItemCategory } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import {
	BottomSheet,
	Button,
	Chip,
	CloseButton,
	Input,
	Label,
	Spinner,
	Surface,
	Text,
	TextArea,
	TextField,
} from "heroui-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";

import { TripModuleViyaAssistCard } from "./trip-module-viya-assist-card";
import { useTripIdParam } from "./use-trip-id-param";

const formatCost = (amount: number, currency = "PHP") =>
	new Intl.NumberFormat("en-PH", {
		currency,
		maximumFractionDigits: 0,
		style: "currency",
	}).format(amount);

const addDays = (date: string, days: number) => {
	const value = new Date(`${date}T00:00:00.000Z`);
	value.setUTCDate(value.getUTCDate() + days);

	return value.toISOString().slice(0, 10);
};

const getDurationMinutes = (startTime: string, endTime: string) => {
	const [startHour = "0", startMinute = "0"] = startTime.split(":");
	const [endHour = "0", endMinute = "0"] = endTime.split(":");
	const startTotal = Number(startHour) * 60 + Number(startMinute);
	const endTotal = Number(endHour) * 60 + Number(endMinute);
	const duration = endTotal - startTotal;

	return Number.isFinite(duration) && duration > 0 ? duration : 60;
};

function SheetField({
	label,
	onChangeText,
	placeholder,
	value,
}: {
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<Input
				className="h-12 border border-border bg-surface px-4"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

function SheetTextArea({
	label,
	onChangeText,
	placeholder,
	value,
}: {
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<TextArea
				className="min-h-20 rounded-[18px] border border-border bg-surface px-4 py-3"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

interface ItineraryItemForm {
	category: string;
	description: string;
	endTime: string;
	estimatedCost: string;
	locationName: string;
	startTime: string;
	title: string;
}

interface ItineraryDayForm {
	date: string;
	estimatedCost: string;
	pace: string;
	summary: string;
	theme: string;
	title: string;
	weatherNote: string;
}

const initialItemForm: ItineraryItemForm = {
	category: "activity",
	description: "",
	endTime: "10:00",
	estimatedCost: "0",
	locationName: "",
	startTime: "09:00",
	title: "",
};

const initialDayForm: ItineraryDayForm = {
	date: "",
	estimatedCost: "0",
	pace: "balanced",
	summary: "",
	theme: "",
	title: "",
	weatherNote: "",
};

const itineraryItemCategories = new Set<string>([
	"activity",
	"food",
	"transport",
	"hotel",
	"rest",
	"shopping",
	"note",
	"flight",
	"emergency",
]);

const getItineraryItemCategory = (value: string): ItineraryItemCategory => {
	const category = value.trim();

	return itineraryItemCategories.has(category)
		? (category as ItineraryItemCategory)
		: "activity";
};

function ItineraryItemSheet({
	day,
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	day: Doc<"itineraryDays"> | null;
	form: ItineraryItemForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof ItineraryItemForm, value: string) => void;
}) {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["86%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>
									{mode === "edit"
										? "Edit itinerary item"
										: "Add itinerary item"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									{day ? `Day ${day.dayNumber} · ${day.date}` : "Select a day"}
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close itinerary item form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>

						<ScrollView
							contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 520 }}
						>
							<SheetField
								label="Title"
								onChangeText={(value) => onUpdateForm("title", value)}
								placeholder="Museum visit"
								value={form.title}
							/>
							<SheetField
								label="Location"
								onChangeText={(value) => onUpdateForm("locationName", value)}
								placeholder="Place or neighborhood"
								value={form.locationName}
							/>
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Start"
										onChangeText={(value) => onUpdateForm("startTime", value)}
										placeholder="09:00"
										value={form.startTime}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="End"
										onChangeText={(value) => onUpdateForm("endTime", value)}
										placeholder="10:00"
										value={form.endTime}
									/>
								</View>
							</View>
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Category"
										onChangeText={(value) => onUpdateForm("category", value)}
										placeholder="activity"
										value={form.category}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Cost"
										onChangeText={(value) =>
											onUpdateForm("estimatedCost", value)
										}
										placeholder="0"
										value={form.estimatedCost}
									/>
								</View>
							</View>
							<SheetTextArea
								label="Notes"
								onChangeText={(value) => onUpdateForm("description", value)}
								placeholder="Why it matters, tickets, buffers, or reminders"
								value={form.description}
							/>
						</ScrollView>

						<Button isDisabled={isSaving || !day} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>
								{mode === "edit" ? "Save item" : "Add item"}
							</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function ItineraryDaySheet({
	form,
	isOpen,
	isSaving,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	form: ItineraryDayForm;
	isOpen: boolean;
	isSaving: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof ItineraryDayForm, value: string) => void;
}) {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["82%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>Edit itinerary day</BottomSheet.Title>
								<BottomSheet.Description>
									Update the day title, date, pace, and planning notes.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close itinerary day form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>

						<ScrollView
							contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 500 }}
						>
							<SheetField
								label="Title"
								onChangeText={(value) => onUpdateForm("title", value)}
								placeholder="Day 1"
								value={form.title}
							/>
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Date"
										onChangeText={(value) => onUpdateForm("date", value)}
										placeholder="2026-07-10"
										value={form.date}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Pace"
										onChangeText={(value) => onUpdateForm("pace", value)}
										placeholder="balanced"
										value={form.pace}
									/>
								</View>
							</View>
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Theme"
										onChangeText={(value) => onUpdateForm("theme", value)}
										placeholder="Arrival"
										value={form.theme}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Cost"
										onChangeText={(value) =>
											onUpdateForm("estimatedCost", value)
										}
										placeholder="0"
										value={form.estimatedCost}
									/>
								</View>
							</View>
							<SheetTextArea
								label="Summary"
								onChangeText={(value) => onUpdateForm("summary", value)}
								placeholder="What should this day accomplish?"
								value={form.summary}
							/>
							<SheetTextArea
								label="Weather note"
								onChangeText={(value) => onUpdateForm("weatherNote", value)}
								placeholder="Backup or weather-sensitive notes"
								value={form.weatherNote}
							/>
						</ScrollView>

						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>Save day</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function TripItineraryScreen() {
	const tripId = useTripIdParam();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const createItineraryDay = useMutation(api.itinerary.createItineraryDay);
	const createItineraryItem = useMutation(api.itinerary.createItineraryItem);
	const deleteItineraryDay = useMutation(api.itinerary.deleteItineraryDay);
	const deleteItineraryItem = useMutation(api.itinerary.deleteItineraryItem);
	const updateItineraryDay = useMutation(api.itinerary.updateItineraryDay);
	const updateItineraryItem = useMutation(api.itinerary.updateItineraryItem);
	const [itemForm, setItemForm] = useState<ItineraryItemForm>(initialItemForm);
	const [dayForm, setDayForm] = useState<ItineraryDayForm>(initialDayForm);
	const [editingDayId, setEditingDayId] = useState<Id<"itineraryDays"> | null>(
		null
	);
	const [editingItemId, setEditingItemId] =
		useState<Id<"itineraryItems"> | null>(null);
	const [selectedDayId, setSelectedDayId] =
		useState<Id<"itineraryDays"> | null>(null);
	const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
	const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
	const [isSavingDay, setIsSavingDay] = useState(false);
	const [isSavingItem, setIsSavingItem] = useState(false);
	const [pendingItemId, setPendingItemId] =
		useState<Id<"itineraryItems"> | null>(null);

	const updateItemForm = (key: keyof ItineraryItemForm, value: string) => {
		setItemForm((currentForm) => ({
			...currentForm,
			[key]: value,
		}));
	};
	const updateDayForm = (key: keyof ItineraryDayForm, value: string) => {
		setDayForm((currentForm) => ({
			...currentForm,
			[key]: value,
		}));
	};

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before viewing its itinerary."
					icon="calendar-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined) {
		return <ScreenLoadingState />;
	}

	const { itineraryDays, itineraryItems, trip } = workspace;
	const selectedDay =
		itineraryDays.find((day) => day._id === selectedDayId) ??
		(isItemSheetOpen ? (itineraryDays[0] ?? null) : null);
	const editingDay =
		itineraryDays.find((day) => day._id === editingDayId) ?? null;
	const handleAddDay = async () => {
		if (!tripId || isSavingDay) {
			return;
		}

		const dayNumber = itineraryDays.length + 1;
		const date = trip.startDate
			? addDays(trip.startDate, itineraryDays.length)
			: "";
		setIsSavingDay(true);
		try {
			const createdDay = await createItineraryDay({
				date,
				dayNumber,
				estimatedCost: 0,
				pace: "balanced",
				summary: "Add places, meals, transfers, and buffers for this day.",
				theme: "Open planning",
				title: `Day ${dayNumber}`,
				tripId,
				weatherNote: "Check forecast closer to travel.",
			});
			if (createdDay) {
				setSelectedDayId(createdDay._id);
			}
		} finally {
			setIsSavingDay(false);
		}
	};
	const openItemSheet = (dayId: Id<"itineraryDays">) => {
		setSelectedDayId(dayId);
		setEditingItemId(null);
		setItemForm(initialItemForm);
		setIsItemSheetOpen(true);
	};
	const openEditDaySheet = (day: Doc<"itineraryDays">) => {
		setEditingDayId(day._id);
		setDayForm({
			date: day.date,
			estimatedCost: day.estimatedCost.toString(),
			pace: day.pace,
			summary: day.summary,
			theme: day.theme,
			title: day.title,
			weatherNote: day.weatherNote,
		});
		setIsDaySheetOpen(true);
	};
	const openEditItemSheet = (item: Doc<"itineraryItems">) => {
		setSelectedDayId(item.dayId);
		setEditingItemId(item._id);
		setItemForm({
			category: item.category,
			description: item.description,
			endTime: item.endTime,
			estimatedCost: item.estimatedCost.toString(),
			locationName: item.locationName,
			startTime: item.startTime,
			title: item.title,
		});
		setIsItemSheetOpen(true);
	};
	const handleSaveDay = async () => {
		if (!editingDay) {
			return;
		}

		const estimatedCost = Number(dayForm.estimatedCost.replaceAll(",", ""));
		const pace = dayForm.pace.trim();
		setIsSavingDay(true);
		try {
			await updateItineraryDay({
				date: dayForm.date.trim(),
				dayId: editingDay._id,
				estimatedCost: Number.isFinite(estimatedCost) ? estimatedCost : 0,
				pace:
					pace === "light" || pace === "balanced" || pace === "packed"
						? pace
						: "balanced",
				summary: dayForm.summary.trim() || editingDay.summary,
				theme: dayForm.theme.trim() || editingDay.theme,
				title: dayForm.title.trim() || editingDay.title,
				weatherNote: dayForm.weatherNote.trim(),
			});
			setIsDaySheetOpen(false);
			setEditingDayId(null);
			setDayForm(initialDayForm);
		} finally {
			setIsSavingDay(false);
		}
	};
	const handleSaveItem = async () => {
		if (!(tripId && selectedDay)) {
			return;
		}

		const title = itemForm.title.trim();
		const locationName = itemForm.locationName.trim();
		if (!(title && locationName)) {
			return;
		}

		const estimatedCost = Number(itemForm.estimatedCost.replaceAll(",", ""));
		setIsSavingItem(true);
		try {
			const itemPatch = {
				address: locationName,
				aiReason: "Added manually in the itinerary module.",
				category: getItineraryItemCategory(itemForm.category),
				dayId: selectedDay._id,
				description: itemForm.description.trim() || "Planned trip item.",
				durationMinutes: getDurationMinutes(
					itemForm.startTime,
					itemForm.endTime
				),
				endTime: itemForm.endTime,
				estimatedCost: Number.isFinite(estimatedCost) ? estimatedCost : 0,
				locationName,
				priority: "recommended",
				startTime: itemForm.startTime,
				status: "planned",
				title,
			} as const;

			if (editingItemId) {
				await updateItineraryItem({
					...itemPatch,
					itemId: editingItemId,
				});
			} else {
				await createItineraryItem({
					...itemPatch,
					tripId,
				});
			}
			setIsItemSheetOpen(false);
			setEditingItemId(null);
			setItemForm(initialItemForm);
		} finally {
			setIsSavingItem(false);
		}
	};
	const updateItemStatus = async (
		itemId: Id<"itineraryItems">,
		status: "planned" | "confirmed" | "skipped" | "completed"
	) => {
		setPendingItemId(itemId);
		try {
			await updateItineraryItem({ itemId, status });
		} finally {
			setPendingItemId(null);
		}
	};
	const handleDeleteItem = async (itemId: Id<"itineraryItems">) => {
		setPendingItemId(itemId);
		try {
			await deleteItineraryItem({ itemId });
		} finally {
			setPendingItemId(null);
		}
	};

	if (itineraryDays.length === 0 && itineraryItems.length === 0) {
		return (
			<Container className="px-4 pb-28">
				<View className="gap-4">
					<RouteHeader
						eyebrow="Plan"
						icon="calendar-outline"
						subtitle="Start with days, then add timed places, meals, transfers, and buffers."
						title="Itinerary"
					/>
					<TripModuleViyaAssistCard
						agentModule="itinerary"
						description="Generate a starter day plan, refine timing, or ask what to add next."
						moduleLabel="itinerary"
						tripId={tripId}
					/>
					<EmptyState
						description="Create your first day to start building the trip timeline."
						icon="calendar-outline"
						title="No itinerary yet"
					/>
					<Button isDisabled={isSavingDay} onPress={handleAddDay}>
						{isSavingDay ? <Spinner size="sm" /> : null}
						<Button.Label>Add first day</Button.Label>
					</Button>
				</View>
			</Container>
		);
	}

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Plan"
					icon="calendar-outline"
					subtitle="Route, timing, buffers, and Viya reasoning from the saved trip."
					title="Itinerary"
				/>
				<TripModuleViyaAssistCard
					agentModule="itinerary"
					description="Generate itinerary changes, rebalance days, or ask Viya to explain the route."
					moduleLabel="itinerary"
					tripId={tripId}
				/>

				<Surface className="gap-3 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>{itineraryDays.length} days</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>{itineraryItems.length} items</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{formatCost(
									itineraryItems.reduce(
										(total, item) => total + item.estimatedCost,
										0
									),
									trip.budgetCurrency
								)}
							</Chip.Label>
						</Chip>
					</View>
					<View className="flex-row gap-3">
						<Button
							className="flex-1"
							isDisabled={isSavingDay}
							onPress={handleAddDay}
							variant="secondary"
						>
							{isSavingDay ? <Spinner size="sm" /> : null}
							<Button.Label>Add day</Button.Label>
						</Button>
						{itineraryDays[0] ? (
							<Button
								className="flex-1"
								onPress={() => openItemSheet(itineraryDays[0]._id)}
							>
								<Button.Label>Add item</Button.Label>
							</Button>
						) : null}
					</View>
				</Surface>

				{itineraryDays.map((day) => {
					const dayItems = itineraryItems.filter(
						(item) => item.dayId === day._id
					);

					return (
						<Surface
							className="gap-4 rounded-[30px] border border-border bg-surface p-5"
							key={day._id}
						>
							<View className="flex-row items-start gap-3">
								<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
									<Ionicons color="#0A84FF" name="calendar" size={20} />
								</View>
								<View className="flex-1 gap-1">
									<Chip size="sm" variant="secondary">
										<Chip.Label>Day {day.dayNumber}</Chip.Label>
									</Chip>
									<Text type="body" weight="bold">
										{day.title}
									</Text>
									<Text color="muted" type="body-sm">
										{day.date} · {day.theme}
									</Text>
									<Text.Paragraph color="muted" type="body-sm">
										{day.summary}
									</Text.Paragraph>
								</View>
								<View className="gap-2">
									<Button
										onPress={() => openEditDaySheet(day)}
										size="sm"
										variant="secondary"
									>
										<Button.Label>Edit</Button.Label>
									</Button>
									<Button
										onPress={() => openItemSheet(day._id)}
										size="sm"
										variant="secondary"
									>
										<Button.Label>Add</Button.Label>
									</Button>
									<Button
										onPress={() => {
											deleteItineraryDay({ dayId: day._id }).catch(
												() => undefined
											);
										}}
										size="sm"
										variant="tertiary"
									>
										<Button.Label>Delete</Button.Label>
									</Button>
								</View>
							</View>

							{dayItems.length === 0 ? (
								<Text color="muted" type="body-sm">
									No scheduled items yet.
								</Text>
							) : (
								<View className="gap-3">
									{dayItems.map((item) => (
										<Surface
											className="gap-2 rounded-[24px] bg-surface-secondary p-4"
											key={item._id}
										>
											<View className="flex-row flex-wrap gap-2">
												<Chip size="sm" variant="secondary">
													<Chip.Label>{item.category}</Chip.Label>
												</Chip>
												<Chip size="sm" variant="secondary">
													<Chip.Label>{item.status}</Chip.Label>
												</Chip>
											</View>
											<Text type="body-sm" weight="bold">
												{item.startTime} - {item.endTime} · {item.title}
											</Text>
											<Text color="muted" type="body-xs">
												{item.locationName}
											</Text>
											<Text.Paragraph color="muted" type="body-sm">
												{item.description}
											</Text.Paragraph>
											<Text color="muted" type="body-xs">
												{formatCost(item.estimatedCost)}
												{item.bookingId ? ` · Booking ${item.bookingId}` : ""}
											</Text>
											<Text.Paragraph color="muted" type="body-xs">
												{item.aiReason}
											</Text.Paragraph>
											<View className="flex-row flex-wrap gap-2">
												<Button
													isDisabled={pendingItemId === item._id}
													onPress={() => openEditItemSheet(item)}
													size="sm"
													variant="secondary"
												>
													<Button.Label>Edit</Button.Label>
												</Button>
												<Button
													isDisabled={pendingItemId === item._id}
													onPress={() => {
														updateItemStatus(
															item._id,
															item.status === "completed"
																? "planned"
																: "completed"
														).catch(() => undefined);
													}}
													size="sm"
													variant="secondary"
												>
													<Button.Label>
														{item.status === "completed"
															? "Mark planned"
															: "Complete"}
													</Button.Label>
												</Button>
												<Button
													isDisabled={pendingItemId === item._id}
													onPress={() => {
														updateItemStatus(item._id, "skipped").catch(
															() => undefined
														);
													}}
													size="sm"
													variant="secondary"
												>
													<Button.Label>Skip</Button.Label>
												</Button>
												<Button
													isDisabled={pendingItemId === item._id}
													onPress={() => {
														handleDeleteItem(item._id).catch(() => undefined);
													}}
													size="sm"
													variant="tertiary"
												>
													<Button.Label>Delete</Button.Label>
												</Button>
											</View>
										</Surface>
									))}
								</View>
							)}
						</Surface>
					);
				})}
			</View>
			<ItineraryItemSheet
				day={selectedDay}
				form={itemForm}
				isOpen={isItemSheetOpen}
				isSaving={isSavingItem}
				mode={editingItemId ? "edit" : "create"}
				onOpenChange={setIsItemSheetOpen}
				onSubmit={handleSaveItem}
				onUpdateForm={updateItemForm}
			/>
			<ItineraryDaySheet
				form={dayForm}
				isOpen={isDaySheetOpen}
				isSaving={isSavingDay}
				onOpenChange={(isOpen) => {
					setIsDaySheetOpen(isOpen);
					if (!isOpen) {
						setEditingDayId(null);
						setDayForm(initialDayForm);
					}
				}}
				onSubmit={handleSaveDay}
				onUpdateForm={updateDayForm}
			/>
		</Container>
	);
}
