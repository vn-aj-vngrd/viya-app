import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import {
	BottomSheet,
	Button,
	Chip,
	CloseButton,
	Input,
	Label,
	Menu,
	Spinner,
	Surface,
	Text,
	TextArea,
	TextField,
} from "heroui-native";
import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import { TripModuleManualEntryCard } from "./trip-module-manual-entry-card";
import { useTripIdParam } from "./use-trip-id-param";

interface MomentForm {
	caption: string;
	dayId: string;
	locationName: string;
	note: string;
	title: string;
}

const initialMomentForm: MomentForm = {
	caption: "",
	dayId: "",
	locationName: "",
	note: "",
	title: "",
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

const getDayLabel = (days: Doc<"itineraryDays">[], dayId?: string) => {
	const day = days.find((itineraryDay) => itineraryDay._id === dayId);

	if (!day) {
		return "No day";
	}

	return `Day ${day.dayNumber}`;
};

function MomentDayPicker({
	days,
	onChange,
	value,
}: {
	days: Doc<"itineraryDays">[];
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				ITINERARY DAY
			</Text>
			<View className="flex-row flex-wrap gap-2">
				<Button
					onPress={() => onChange("")}
					size="sm"
					variant={value ? "secondary" : "primary"}
				>
					<Button.Label>No day</Button.Label>
				</Button>
				{days.map((day) => (
					<Button
						key={day._id}
						onPress={() => onChange(day._id)}
						size="sm"
						variant={value === day._id ? "primary" : "secondary"}
					>
						<Button.Label>{`Day ${day.dayNumber}`}</Button.Label>
					</Button>
				))}
			</View>
		</View>
	);
}

function MomentSheet({
	days,
	errorMessage,
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	days: Doc<"itineraryDays">[];
	errorMessage: string | null;
	form: MomentForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof MomentForm, value: string) => void;
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
								<BottomSheet.Title>
									{mode === "edit" ? "Edit moment" : "Add moment"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Capture highlights that power the recap.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close moment form"
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
								placeholder="Sunset dinner"
								value={form.title}
							/>
							<SheetField
								label="Location"
								onChangeText={(value) => onUpdateForm("locationName", value)}
								placeholder="Place or area"
								value={form.locationName}
							/>
							<MomentDayPicker
								days={days}
								onChange={(value) => onUpdateForm("dayId", value)}
								value={form.dayId}
							/>
							<SheetField
								label="Caption"
								onChangeText={(value) => onUpdateForm("caption", value)}
								placeholder="Short recap caption"
								value={form.caption}
							/>
							<SheetTextArea
								label="Notes"
								onChangeText={(value) => onUpdateForm("note", value)}
								placeholder="What happened?"
								value={form.note}
							/>
						</ScrollView>
						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>Save moment</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function SpotlightMomentSummary({
	dayLabel,
	onCreateSpotlight,
	onOpenMaps,
	onReview,
	spotlightItineraryHref,
	spotlightMoment,
}: {
	dayLabel: string;
	onCreateSpotlight: () => void;
	onOpenMaps: () => void;
	onReview: () => void;
	spotlightItineraryHref: Href | null;
	spotlightMoment: Doc<"moments"> | null;
}) {
	const canOpenMaps = Boolean(
		spotlightMoment &&
			hasTripMapSearchTarget({
				label: spotlightMoment.title,
				locationName: spotlightMoment.locationName,
			})
	);

	return (
		<View className="gap-3 rounded-[24px] bg-surface p-4">
			<View className="flex-row items-center gap-3">
				<View className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary">
					<Ionicons
						color="#BF5AF2"
						name={
							spotlightMoment?.isHighlight ? "star-outline" : "image-outline"
						}
						size={18}
					/>
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						SPOTLIGHT
					</Text>
					<Text numberOfLines={1} type="body-sm" weight="bold">
						{spotlightMoment?.title ?? "No spotlight yet"}
					</Text>
				</View>
			</View>
			<Text.Paragraph color="muted" type="body-sm">
				{spotlightMoment
					? spotlightMoment.note ||
						spotlightMoment.caption ||
						spotlightMoment.locationName ||
						"Add a caption or note to give this memory context."
					: "Add the first moment, then mark the best ones as highlights for the recap."}
			</Text.Paragraph>
			{spotlightMoment?.locationName ? (
				<Text color="muted" numberOfLines={1} type="body-xs">
					{`${dayLabel} · ${spotlightMoment.locationName}`}
				</Text>
			) : null}
			{spotlightMoment ? (
				<View className="flex-row flex-wrap gap-2">
					<Button
						className="flex-1"
						onPress={onReview}
						size="sm"
						variant="secondary"
					>
						<Ionicons color="#0A84FF" name="create-outline" size={15} />
						<Button.Label>Review spotlight</Button.Label>
					</Button>
					{canOpenMaps ? (
						<Button
							className="flex-1"
							onPress={onOpenMaps}
							size="sm"
							variant="secondary"
						>
							<Ionicons color="#0A84FF" name="map-outline" size={15} />
							<Button.Label>Open spotlight Maps</Button.Label>
						</Button>
					) : null}
					{spotlightItineraryHref ? (
						<Link asChild href={spotlightItineraryHref}>
							<Button className="w-full" size="sm" variant="secondary">
								<Ionicons color="#0A84FF" name="calendar-outline" size={15} />
								<Button.Label>Open spotlight day</Button.Label>
							</Button>
						</Link>
					) : null}
				</View>
			) : (
				<Button
					className="self-start"
					onPress={onCreateSpotlight}
					size="sm"
					variant="secondary"
				>
					<Ionicons color="#0A84FF" name="add-outline" size={15} />
					<Button.Label>Add first moment</Button.Label>
				</Button>
			)}
		</View>
	);
}

export function TripMomentsScreen() {
	const tripId = useTripIdParam();
	const moments = useQuery(
		api.moments.listTripMoments,
		tripId ? { tripId } : "skip"
	);
	const itinerary = useQuery(
		api.itinerary.listTripItinerary,
		tripId ? { tripId } : "skip"
	);
	const createMoment = useMutation(api.moments.createMoment);
	const deleteMoment = useMutation(api.moments.deleteMoment);
	const toggleMomentHighlight = useMutation(api.moments.toggleMomentHighlight);
	const updateMoment = useMutation(api.moments.updateMoment);
	const [form, setForm] = useState<MomentForm>(initialMomentForm);
	const [editingMomentId, setEditingMomentId] = useState<Id<"moments"> | null>(
		null
	);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [pendingMomentId, setPendingMomentId] = useState<Id<"moments"> | null>(
		null
	);
	const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);
	const [momentErrorMessage, setMomentErrorMessage] = useState<string | null>(
		null
	);

	const updateForm = (key: keyof MomentForm, value: string) => {
		setMapErrorMessage(null);
		setMomentErrorMessage(null);
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setMapErrorMessage(null);
		setMomentErrorMessage(null);
		setEditingMomentId(null);
		setForm(initialMomentForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (moment: Doc<"moments">) => {
		setMapErrorMessage(null);
		setMomentErrorMessage(null);
		setEditingMomentId(moment._id);
		setForm({
			caption: moment.caption,
			dayId: moment.dayId ?? "",
			locationName: moment.locationName,
			note: moment.note,
			title: moment.title,
		});
		setIsSheetOpen(true);
	};

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before saving moments."
					icon="images-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	const handleSaveMoment = async () => {
		const title = form.title.trim();
		if (!title) {
			setMomentErrorMessage("Add a moment title.");
			return;
		}

		setMomentErrorMessage(null);
		setIsSaving(true);
		try {
			const momentPatch = {
				caption: form.caption.trim() || title,
				dayId: form.dayId.trim() || undefined,
				locationName: form.locationName.trim(),
				note: form.note.trim(),
				title,
			};

			if (editingMomentId) {
				await updateMoment({
					...momentPatch,
					momentId: editingMomentId,
				});
			} else {
				await createMoment({
					...momentPatch,
					tripId,
				});
			}
			setForm(initialMomentForm);
			setEditingMomentId(null);
			setIsSheetOpen(false);
		} catch {
			setMomentErrorMessage("Could not save moment.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleOpenMaps = async (moment: Doc<"moments">) => {
		if (
			!hasTripMapSearchTarget({
				label: moment.title,
				locationName: moment.locationName,
			})
		) {
			setMapErrorMessage("Location is not available yet.");
			return;
		}

		setMapErrorMessage(null);
		try {
			await Linking.openURL(
				getTripMapSearchUrl({
					label: moment.title,
					locationName: moment.locationName,
				})
			);
		} catch {
			setMapErrorMessage("Could not open Maps for this moment.");
		}
	};

	const runMomentAction = async (
		momentId: Id<"moments">,
		action: () => Promise<unknown>
	) => {
		setMapErrorMessage(null);
		setPendingMomentId(momentId);
		try {
			await action();
		} catch {
			setMomentErrorMessage("Could not update moment.");
		} finally {
			setPendingMomentId(null);
		}
	};

	if (moments === undefined || itinerary === undefined) {
		return <ScreenLoadingState />;
	}

	const highlightCount = moments.filter((moment) => moment.isHighlight).length;
	const dayLinkedCount = moments.filter((moment) => moment.dayId).length;
	const locationCount = new Set(
		moments
			.map((moment) => moment.locationName.trim())
			.filter((locationName) => locationName.length > 0)
	).size;
	const spotlightMoment =
		moments.find((moment) => moment.isHighlight) ?? moments.at(0) ?? null;
	const spotlightItineraryHref = spotlightMoment?.dayId
		? VIYA_ROUTES.tripItinerary(tripId)
		: null;
	const spotlightDayLabel = getDayLabel(itinerary.days, spotlightMoment?.dayId);

	return (
		<TripModuleScreenFrame
			activeTab="memories"
			headerAction={
				<NavigationIconButton
					accessibilityLabel="Add moment"
					icon="add"
					onPress={openCreateSheet}
				/>
			}
			tripId={tripId}
		>
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<TripModuleManualEntryCard
						description="Capture highlights, captions, places, and recap notes while they are fresh."
						moduleLabel="moments"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="images-outline"
						primaryActionLabel="Add moment"
					/>
					{momentErrorMessage ? (
						<Text className="text-danger" type="body-sm">
							{momentErrorMessage}
						</Text>
					) : null}
					{mapErrorMessage ? (
						<Text className="text-danger" type="body-sm">
							{mapErrorMessage}
						</Text>
					) : null}

					<View className="gap-4 rounded-[30px] bg-surface-secondary p-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="min-w-0 flex-1 gap-1">
								<Text.Heading type="h5" weight="semibold">
									Recap board
								</Text.Heading>
								<Text color="muted" type="body-sm">
									Choose the moments that should shape the trip story.
								</Text>
							</View>
							<View className="h-11 w-11 items-center justify-center rounded-full bg-surface-secondary">
								<Ionicons color="#BF5AF2" name="images-outline" size={20} />
							</View>
						</View>
						<View className="flex-row flex-wrap gap-2">
							<Chip size="sm" variant="secondary">
								<Chip.Label>{moments.length} moments</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{highlightCount} highlights</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{dayLinkedCount} day-linked</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{locationCount} places</Chip.Label>
							</Chip>
						</View>
						<SpotlightMomentSummary
							dayLabel={spotlightDayLabel}
							onCreateSpotlight={openCreateSheet}
							onOpenMaps={() => {
								if (spotlightMoment) {
									handleOpenMaps(spotlightMoment).catch(() => undefined);
								}
							}}
							onReview={() => {
								if (spotlightMoment) {
									openEditSheet(spotlightMoment);
								}
							}}
							spotlightItineraryHref={spotlightItineraryHref}
							spotlightMoment={spotlightMoment}
						/>
					</View>

					{moments.length === 0 ? (
						<EmptyState
							action={{
								label: "Add moment",
								onPress: openCreateSheet,
							}}
							description="Add notes and highlights during or after the trip."
							icon="images-outline"
							title="No moments yet"
						/>
					) : (
						<View className="gap-3">
							{moments.map((moment) => (
								<MomentCard
									dayLabel={getDayLabel(itinerary.days, moment.dayId)}
									isPending={pendingMomentId === moment._id}
									itineraryHref={
										moment.dayId ? VIYA_ROUTES.tripItinerary(tripId) : null
									}
									key={moment._id}
									moment={moment}
									onDelete={() => {
										runMomentAction(moment._id, () =>
											deleteMoment({ momentId: moment._id })
										).catch(() => undefined);
									}}
									onEdit={() => openEditSheet(moment)}
									onOpenMaps={() => {
										handleOpenMaps(moment).catch(() => undefined);
									}}
									onToggleHighlight={() => {
										runMomentAction(moment._id, () =>
											toggleMomentHighlight({ momentId: moment._id })
										).catch(() => undefined);
									}}
								/>
							))}
						</View>
					)}
				</View>
				<MomentSheet
					days={itinerary.days}
					errorMessage={momentErrorMessage}
					form={form}
					isOpen={isSheetOpen}
					isSaving={isSaving}
					mode={editingMomentId ? "edit" : "create"}
					onOpenChange={(isOpen) => {
						setIsSheetOpen(isOpen);
						if (!isOpen) {
							setEditingMomentId(null);
							setMomentErrorMessage(null);
							setForm(initialMomentForm);
						}
					}}
					onSubmit={handleSaveMoment}
					onUpdateForm={updateForm}
				/>
			</Container>
		</TripModuleScreenFrame>
	);
}

function MomentCard({
	dayLabel,
	itineraryHref,
	isPending,
	moment,
	onDelete,
	onEdit,
	onOpenMaps,
	onToggleHighlight,
}: {
	dayLabel: string;
	itineraryHref: Href | null;
	isPending: boolean;
	moment: Doc<"moments">;
	onDelete: () => void;
	onEdit: () => void;
	onOpenMaps: () => void;
	onToggleHighlight: () => void;
}) {
	const canOpenMaps = hasTripMapSearchTarget({
		label: moment.title,
		locationName: moment.locationName,
	});

	return (
		<Surface className="gap-4 rounded-[28px] border border-border bg-surface p-5">
			<View className="flex-row items-start gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
					<Ionicons color="#BF5AF2" name="image-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-2">
					<View className="flex-row flex-wrap gap-2">
						{moment.isHighlight ? (
							<Chip size="sm" variant="secondary">
								<Chip.Label>Highlight</Chip.Label>
							</Chip>
						) : null}
						{moment.locationName ? (
							<Chip size="sm" variant="secondary">
								<Chip.Label>{moment.locationName}</Chip.Label>
							</Chip>
						) : null}
						<Chip size="sm" variant="secondary">
							<Chip.Label>{dayLabel}</Chip.Label>
						</Chip>
					</View>
					<Text type="body" weight="bold">
						{moment.title}
					</Text>
					<Text.Paragraph color="muted" type="body-sm">
						{moment.note || moment.caption}
					</Text.Paragraph>
				</View>
				<Menu>
					<Menu.Trigger asChild={true}>
						<Pressable
							accessibilityLabel="Moment options"
							accessibilityRole="button"
							className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary"
							style={({ pressed }) => ({
								transform: [{ scale: pressed ? 0.94 : 1 }],
							})}
						>
							<Ionicons color="#71717A" name="ellipsis-horizontal" size={17} />
						</Pressable>
					</Menu.Trigger>
					<Menu.Portal>
						<Menu.Overlay />
						<Menu.Content
							align="end"
							className="rounded-[24px] border border-border bg-surface p-2"
							offset={8}
							placement="bottom"
							presentation="popover"
							width={220}
						>
							<Menu.Item
								accessibilityLabel={
									moment.isHighlight ? "Remove highlight" : "Mark as highlight"
								}
								className="flex-row items-center gap-3 rounded-[18px] p-2.5"
								isAnimatedStyleActive={false}
								isDisabled={isPending}
								onPress={onToggleHighlight}
							>
								<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
									<Ionicons
										color="#BF5AF2"
										name={moment.isHighlight ? "star-outline" : "star-outline"}
										size={16}
									/>
								</View>
								<Menu.ItemTitle className="font-semibold text-sm">
									{moment.isHighlight
										? "Remove highlight"
										: "Mark as highlight"}
								</Menu.ItemTitle>
							</Menu.Item>
							{canOpenMaps ? (
								<Menu.Item
									accessibilityLabel="Open in Maps"
									className="flex-row items-center gap-3 rounded-[18px] p-2.5"
									isAnimatedStyleActive={false}
									isDisabled={isPending}
									onPress={onOpenMaps}
								>
									<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
										<Ionicons color="#0A84FF" name="map-outline" size={16} />
									</View>
									<Menu.ItemTitle className="font-semibold text-sm">
										Open in Maps
									</Menu.ItemTitle>
								</Menu.Item>
							) : null}
							{itineraryHref ? (
								<Link asChild href={itineraryHref}>
									<Menu.Item
										accessibilityLabel="Open itinerary"
										className="flex-row items-center gap-3 rounded-[18px] p-2.5"
										isAnimatedStyleActive={false}
										isDisabled={isPending}
									>
										<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
											<Ionicons
												color="#0A84FF"
												name="calendar-outline"
												size={16}
											/>
										</View>
										<Menu.ItemTitle className="font-semibold text-sm">
											Open itinerary
										</Menu.ItemTitle>
									</Menu.Item>
								</Link>
							) : null}
							<Menu.Item
								accessibilityLabel="Edit moment"
								className="flex-row items-center gap-3 rounded-[18px] p-2.5"
								isAnimatedStyleActive={false}
								isDisabled={isPending}
								onPress={onEdit}
							>
								<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
									<Ionicons color="#0A84FF" name="create-outline" size={16} />
								</View>
								<Menu.ItemTitle className="font-semibold text-sm">
									Edit moment
								</Menu.ItemTitle>
							</Menu.Item>
							<View className="mx-2 my-1 h-px bg-border" />
							<Menu.Item
								accessibilityLabel="Delete moment"
								className="flex-row items-center gap-3 rounded-[18px] p-2.5"
								isAnimatedStyleActive={false}
								isDisabled={isPending}
								onPress={onDelete}
							>
								<View className="h-8 w-8 items-center justify-center rounded-full bg-danger/10">
									<Ionicons color="#FF3B30" name="trash-outline" size={16} />
								</View>
								<Menu.ItemTitle className="font-semibold text-danger text-sm">
									Delete moment
								</Menu.ItemTitle>
							</Menu.Item>
						</Menu.Content>
					</Menu.Portal>
				</Menu>
			</View>
		</Surface>
	);
}
