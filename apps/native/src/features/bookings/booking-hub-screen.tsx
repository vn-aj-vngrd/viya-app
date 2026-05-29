import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getBookingProgress, groupBookingsByType } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
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
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

import { BookingTargetCard } from "./booking-target-card";

type BookingType =
	| "flight"
	| "hotel"
	| "activity"
	| "transport"
	| "restaurant"
	| "insurance"
	| "other";

interface BookingForm {
	cost: string;
	locationName: string;
	notes: string;
	provider: string;
	startDateTime: string;
	title: string;
	type: string;
}

const initialBookingForm: BookingForm = {
	cost: "",
	locationName: "",
	notes: "",
	provider: "",
	startDateTime: "",
	title: "",
	type: "hotel",
};

const bookingTypes = new Set<string>([
	"flight",
	"hotel",
	"activity",
	"transport",
	"restaurant",
	"insurance",
	"other",
]);

const getBookingType = (value: string): BookingType => {
	const type = value.trim();

	return bookingTypes.has(type) ? (type as BookingType) : "other";
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

function BookingTargetSheet({
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	form: BookingForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof BookingForm, value: string) => void;
}) {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["84%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>
									{mode === "edit"
										? "Edit booking target"
										: "Add booking target"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Track what still needs to be reserved externally.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close booking target form"
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
								placeholder="Hotel in Shinjuku"
								value={form.title}
							/>
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Type"
										onChangeText={(value) => onUpdateForm("type", value)}
										placeholder="hotel"
										value={form.type}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Cost"
										onChangeText={(value) => onUpdateForm("cost", value)}
										placeholder="0"
										value={form.cost}
									/>
								</View>
							</View>
							<SheetField
								label="Provider"
								onChangeText={(value) => onUpdateForm("provider", value)}
								placeholder="Airline, hotel, app, or operator"
								value={form.provider}
							/>
							<SheetField
								label="Date / time"
								onChangeText={(value) => onUpdateForm("startDateTime", value)}
								placeholder="2026-06-01 or 2026-06-01 09:00"
								value={form.startDateTime}
							/>
							<SheetField
								label="Location"
								onChangeText={(value) => onUpdateForm("locationName", value)}
								placeholder="Airport, hotel area, or meeting point"
								value={form.locationName}
							/>
							<SheetTextArea
								label="Notes"
								onChangeText={(value) => onUpdateForm("notes", value)}
								placeholder="What needs to be checked before booking?"
								value={form.notes}
							/>
						</ScrollView>

						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>
								{mode === "edit" ? "Save target" : "Add target"}
							</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function BookingHubScreen() {
	const router = useRouter();
	const tripId = useTripIdParam();
	const bookings = useQuery(
		api.bookings.listTripBookings,
		tripId ? { tripId } : "skip"
	);
	const createBookingTarget = useMutation(api.bookings.createBookingTarget);
	const deleteBooking = useMutation(api.bookings.deleteBooking);
	const updateBooking = useMutation(api.bookings.updateBooking);
	const updateBookingStatus = useMutation(api.bookings.updateBookingStatus);
	const [bookingForm, setBookingForm] =
		useState<BookingForm>(initialBookingForm);
	const [editingBookingId, setEditingBookingId] =
		useState<Id<"bookings"> | null>(null);
	const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false);
	const [isCreatingBooking, setIsCreatingBooking] = useState(false);
	const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(
		null
	);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before reviewing booking targets."
					icon="calendar-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	const progress = getBookingProgress(bookings ?? []);
	const groupedBookings = groupBookingsByType(bookings ?? []);
	const updateBookingForm = (key: keyof BookingForm, value: string) => {
		setBookingForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setEditingBookingId(null);
		setBookingForm(initialBookingForm);
		setIsBookingSheetOpen(true);
	};
	const openEditSheet = (booking: Doc<"bookings">) => {
		setEditingBookingId(booking._id);
		setBookingForm({
			cost: booking.cost?.toString() ?? "",
			locationName: booking.locationName ?? "",
			notes: booking.notes ?? "",
			provider: booking.provider ?? "",
			startDateTime: booking.startDateTime ?? "",
			title: booking.title,
			type: booking.type,
		});
		setIsBookingSheetOpen(true);
	};
	const saveTarget = async () => {
		if (!tripId) {
			return;
		}

		const title = bookingForm.title.trim();
		if (!title) {
			return;
		}

		const cost = Number(bookingForm.cost.replaceAll(",", ""));
		setIsCreatingBooking(true);
		try {
			const bookingPatch = {
				cost: Number.isFinite(cost) && cost > 0 ? cost : undefined,
				currency: "PHP",
				locationName: bookingForm.locationName.trim() || undefined,
				notes: bookingForm.notes.trim() || undefined,
				provider: bookingForm.provider.trim() || undefined,
				startDateTime: bookingForm.startDateTime.trim() || undefined,
				title,
				type: getBookingType(bookingForm.type),
			};

			if (editingBookingId) {
				await updateBooking({
					...bookingPatch,
					bookingId: editingBookingId,
				});
			} else {
				await createBookingTarget({
					...bookingPatch,
					tripId,
				});
			}
			setBookingForm(initialBookingForm);
			setEditingBookingId(null);
			setIsBookingSheetOpen(false);
		} finally {
			setIsCreatingBooking(false);
		}
	};

	const updateStatus = async (
		booking: Doc<"bookings">,
		status: "bookedExternally" | "confirmed"
	) => {
		setUpdatingBookingId(booking._id);
		try {
			await updateBookingStatus({ bookingId: booking._id, status });
		} finally {
			setUpdatingBookingId(null);
		}
	};
	const removeBooking = async (bookingId: Id<"bookings">) => {
		setUpdatingBookingId(bookingId);
		try {
			await deleteBooking({ bookingId });
		} finally {
			setUpdatingBookingId(null);
		}
	};
	const bookingsContent = (() => {
		if (bookings === undefined) {
			return (
				<View className="items-center py-8">
					<Spinner />
				</View>
			);
		}

		if (bookings.length === 0) {
			return (
				<View className="gap-3">
					<EmptyState
						action={{
							label: "Open Viya",
							onPress: () => router.push(VIYA_ROUTES.viya),
						}}
						description="Create a Trip Blueprint to seed external booking targets."
						icon="ticket-outline"
						title="No booking targets"
					/>
					<Button onPress={openCreateSheet}>
						<Button.Label>Add booking target</Button.Label>
					</Button>
				</View>
			);
		}

		return (
			<View className="gap-5">
				{groupedBookings.map((group) => (
					<View className="gap-3" key={group.type}>
						<Text color="muted" type="body-xs" weight="semibold">
							{group.type.toUpperCase()}
						</Text>
						{group.items.map((booking) => (
							<BookingTargetCard
								booking={booking}
								isUpdating={updatingBookingId === booking._id}
								key={booking._id}
								onDelete={(item) => {
									removeBooking(item._id).catch(() => undefined);
								}}
								onEdit={openEditSheet}
								onMarkBooked={(item) => {
									updateStatus(item, "bookedExternally").catch(() => undefined);
								}}
								onMarkConfirmed={(item) => {
									updateStatus(item, "confirmed").catch(() => undefined);
								}}
								onUploadConfirmation={() =>
									router.push(VIYA_ROUTES.tripVault(tripId))
								}
							/>
						))}
					</View>
				))}
			</View>
		);
	})();

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Book"
					icon="ticket-outline"
					subtitle="Book through your preferred provider. Viya does not process payments in the MVP."
					title="Booking Hub"
				/>

				<Surface className="gap-3 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{progress.confirmed}/{progress.total} confirmed
							</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>{progress.remaining} remaining</Chip.Label>
						</Chip>
					</View>
					<Text.Paragraph color="muted" type="body-sm">
						Update booking status as you reserve externally, then upload
						confirmations through TripSync.
					</Text.Paragraph>
					<Button onPress={openCreateSheet}>
						<Button.Label>Add booking target</Button.Label>
					</Button>
				</Surface>

				{bookingsContent}
			</View>
			<BookingTargetSheet
				form={bookingForm}
				isOpen={isBookingSheetOpen}
				isSaving={isCreatingBooking}
				mode={editingBookingId ? "edit" : "create"}
				onOpenChange={(isOpen) => {
					setIsBookingSheetOpen(isOpen);
					if (!isOpen) {
						setEditingBookingId(null);
						setBookingForm(initialBookingForm);
					}
				}}
				onSubmit={saveTarget}
				onUpdateForm={updateBookingForm}
			/>
		</Container>
	);
}
