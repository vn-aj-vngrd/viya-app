import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Menu } from "heroui-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Container } from "@/components/container";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import {
	AppText,
	Card,
	Chip,
	EmptyState,
	LoadingState,
	PrimaryButton,
	radius,
	SecondaryButton,
	SectionHeader,
	spacing,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import {
	ChoiceChips,
	FormSheet,
	InlineMessage,
	MenuDivider,
	MenuIcon,
	MenuTrigger,
	menuContentClassName,
	menuItemClassName,
	SheetField,
	SheetTextArea,
	TagRow,
} from "./trip-module-form-kit";
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
		<ChoiceChips label="Itinerary day">
			<Chip label="No day" onPress={() => onChange("")} selected={!value} />
			{days.map((day) => (
				<Chip
					key={day._id}
					label={`Day ${day.dayNumber}`}
					onPress={() => onChange(day._id)}
					selected={value === day._id}
				/>
			))}
		</ChoiceChips>
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
	return (
		<FormSheet
			description="Capture highlights that power the recap."
			errorMessage={errorMessage}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			saveLabel="Save moment"
			title={mode === "edit" ? "Edit moment" : "Add moment"}
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
		</FormSheet>
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
	const { palette } = useUITheme();
	const canOpenMaps = Boolean(
		spotlightMoment &&
			hasTripMapSearchTarget({
				label: spotlightMoment.title,
				locationName: spotlightMoment.locationName,
			})
	);

	return (
		<View
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.group,
				gap: spacing.md,
				padding: spacing.lg,
			}}
		>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: spacing.md,
				}}
			>
				<Ionicons
					color={palette.accent}
					name={spotlightMoment?.isHighlight ? "star" : "image-outline"}
					size={20}
				/>
				<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
					<AppText tone="secondary" variant="eyebrow">
						Spotlight
					</AppText>
					<AppText numberOfLines={1} variant="headline">
						{spotlightMoment?.title ?? "No spotlight yet"}
					</AppText>
				</View>
			</View>
			<AppText tone="secondary" variant="subhead">
				{spotlightMoment
					? spotlightMoment.note ||
						spotlightMoment.caption ||
						spotlightMoment.locationName ||
						"Add a caption or note to give this memory context."
					: "Add the first moment, then mark the best ones as highlights for the recap."}
			</AppText>
			{spotlightMoment?.locationName ? (
				<AppText numberOfLines={1} tone="tertiary" variant="footnote">
					{`${dayLabel} · ${spotlightMoment.locationName}`}
				</AppText>
			) : null}
			{spotlightMoment ? (
				<View style={{ gap: spacing.sm }}>
					<SecondaryButton
						icon="create-outline"
						label="Review spotlight"
						onPress={onReview}
					/>
					{canOpenMaps ? (
						<SecondaryButton
							icon="map-outline"
							label="Open spotlight Maps"
							onPress={onOpenMaps}
							variant="plain"
						/>
					) : null}
					{spotlightItineraryHref ? (
						<Link asChild href={spotlightItineraryHref}>
							<SecondaryButton
								icon="calendar-outline"
								label="Open spotlight day"
								onPress={() => undefined}
								variant="plain"
							/>
						</Link>
					) : null}
				</View>
			) : (
				<PrimaryButton
					fullWidth={false}
					icon="add-outline"
					label="Add first moment"
					onPress={onCreateSpotlight}
				/>
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
	const { confirm } = useFeedback();
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
		return <LoadingState title="Loading moments" />;
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

	const confirmDeleteMoment = async (moment: Doc<"moments">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete",
			destructive: true,
			message: "This moment will be removed from the recap.",
			title: `Delete ${moment.title}?`,
		});
		if (confirmed) {
			await runMomentAction(moment._id, () =>
				deleteMoment({ momentId: moment._id })
			);
		}
	};

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
				<View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
					<TripModuleManualEntryCard
						description="Capture highlights, captions, places, and recap notes while they are fresh."
						moduleLabel="moments"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="images-outline"
						primaryActionLabel="Add moment"
					/>
					<InlineMessage message={momentErrorMessage} />
					<InlineMessage message={mapErrorMessage} />

					<Card>
						<View style={{ gap: spacing.lg }}>
							<SectionHeader eyebrow="Recap board" title="Trip story" />
							<AppText tone="secondary" variant="subhead">
								Choose the moments that should shape the trip story.
							</AppText>
							<TagRow
								labels={[
									`${moments.length} moments`,
									`${highlightCount} highlights`,
									`${dayLinkedCount} day-linked`,
									`${locationCount} places`,
								]}
							/>
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
					</Card>

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
						<View style={{ gap: spacing.md }}>
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
										confirmDeleteMoment(moment).catch(() => undefined);
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
	const tags = [
		...(moment.isHighlight ? ["Highlight"] : []),
		...(moment.locationName ? [moment.locationName] : []),
		dayLabel,
	];

	return (
		<Animated.View
			entering={FadeInDown.duration(220)}
			style={{ opacity: isPending ? 0.6 : 1 }}
		>
			<Card padding="md">
				<View
					style={{
						alignItems: "flex-start",
						flexDirection: "row",
						gap: spacing.md,
					}}
				>
					<View style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
						<TagRow labels={tags} />
						<AppText variant="headline">{moment.title}</AppText>
						{moment.note || moment.caption ? (
							<AppText tone="secondary" variant="subhead">
								{moment.note || moment.caption}
							</AppText>
						) : null}
					</View>
					<Menu>
						<Menu.Trigger asChild={true}>
							<MenuTrigger label="Moment options" />
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Overlay />
							<Menu.Content
								align="end"
								className={menuContentClassName}
								offset={8}
								placement="bottom"
								presentation="popover"
								width={220}
							>
								<Menu.Item
									accessibilityLabel={
										moment.isHighlight
											? "Remove highlight"
											: "Mark as highlight"
									}
									className={menuItemClassName}
									isAnimatedStyleActive={false}
									isDisabled={isPending}
									onPress={onToggleHighlight}
								>
									<MenuIcon
										name={moment.isHighlight ? "star" : "star-outline"}
									/>
									<Menu.ItemTitle className="text-base">
										{moment.isHighlight
											? "Remove highlight"
											: "Mark as highlight"}
									</Menu.ItemTitle>
								</Menu.Item>
								{canOpenMaps ? (
									<Menu.Item
										accessibilityLabel="Open in Maps"
										className={menuItemClassName}
										isAnimatedStyleActive={false}
										isDisabled={isPending}
										onPress={onOpenMaps}
									>
										<MenuIcon name="map-outline" />
										<Menu.ItemTitle className="text-base">
											Open in Maps
										</Menu.ItemTitle>
									</Menu.Item>
								) : null}
								{itineraryHref ? (
									<Link asChild href={itineraryHref}>
										<Menu.Item
											accessibilityLabel="Open itinerary"
											className={menuItemClassName}
											isAnimatedStyleActive={false}
											isDisabled={isPending}
										>
											<MenuIcon name="calendar-outline" />
											<Menu.ItemTitle className="text-base">
												Open itinerary
											</Menu.ItemTitle>
										</Menu.Item>
									</Link>
								) : null}
								<Menu.Item
									accessibilityLabel="Edit moment"
									className={menuItemClassName}
									isAnimatedStyleActive={false}
									isDisabled={isPending}
									onPress={onEdit}
								>
									<MenuIcon name="create-outline" />
									<Menu.ItemTitle className="text-base">
										Edit moment
									</Menu.ItemTitle>
								</Menu.Item>
								<MenuDivider />
								<Menu.Item
									accessibilityLabel="Delete moment"
									className={menuItemClassName}
									isAnimatedStyleActive={false}
									isDisabled={isPending}
									onPress={onDelete}
								>
									<MenuIcon destructive={true} name="trash-outline" />
									<Menu.ItemTitle className="text-base text-danger">
										Delete moment
									</Menu.ItemTitle>
								</Menu.Item>
							</Menu.Content>
						</Menu.Portal>
					</Menu>
				</View>
			</Card>
		</Animated.View>
	);
}
