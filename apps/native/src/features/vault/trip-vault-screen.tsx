import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { BottomSheet } from "heroui-native";
import { useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import {
	AppText,
	Chip,
	EmptyState,
	LoadingState,
	PressableScale,
	SecondaryButton,
	SheetHeader,
	spacing,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { TripModuleScreenFrame } from "@/src/features/trips/trip-module-floating-bar";
import {
	ChoiceChips,
	FieldLabel,
	FormSheet,
	InlineMessage,
	SheetField,
} from "@/src/features/trips/trip-module-form-kit";
import {
	getLinkedEntityMutationFields,
	getRelatedEntityKey,
	getTripRelatedEntityLabel,
	getTripRelatedEntityLabelByKey,
	getTripRelatedEntityOptions,
	type TripRelatedEntityOption,
} from "@/src/features/trips/trip-related-entities";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";
import { TripSyncReviewSheet } from "./tripsync-review-sheet";
import type { PendingTripSyncReview } from "./tripsync-types";
import { useVaultUpload } from "./use-vault-upload";
import { VaultPreviewCard } from "./vault-preview-card";

interface VaultForm {
	kind: string;
	note: string;
	relatedEntityKey: string;
	title: string;
}

type VaultKind =
	| "booking"
	| "document"
	| "momentPhoto"
	| "receipt"
	| "noteAttachment"
	| "other";

const vaultKindOptions = [
	"booking",
	"document",
	"momentPhoto",
	"receipt",
	"noteAttachment",
	"other",
] as const;

type VaultGroup = "all" | "booking" | "document" | "receipt" | "photo";

const vaultGroupOptions = [
	{ id: "all", label: "All files" },
	{ id: "booking", label: "Bookings" },
	{ id: "document", label: "Documents" },
	{ id: "receipt", label: "Receipts" },
	{ id: "photo", label: "Photos" },
] as const satisfies readonly { id: VaultGroup; label: string }[];

const vaultKinds = new Set<string>(vaultKindOptions);

const getVaultKind = (value: string): VaultKind => {
	const kind = value.trim();

	return vaultKinds.has(kind) ? (kind as VaultKind) : "other";
};

const formatVaultKindLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.replaceAll(/([a-z])([A-Z])/g, "$1 $2")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

const getVaultRelatedHref = ({
	relatedEntityType,
	tripId,
}: {
	relatedEntityType?: string;
	tripId: Id<"trips">;
}): Href | null => {
	switch (relatedEntityType) {
		case "booking":
			return VIYA_ROUTES.tripBookings(tripId);
		case "companion":
			return VIYA_ROUTES.tripCompanions(tripId);
		case "expense":
			return VIYA_ROUTES.tripBudget(tripId);
		case "itineraryDay":
		case "itineraryItem":
			return VIYA_ROUTES.tripItinerary(tripId);
		case "moment":
			return VIYA_ROUTES.tripMoments(tripId);
		case "readinessItem":
			return VIYA_ROUTES.tripReadiness(tripId);
		case "risk":
			return VIYA_ROUTES.tripRisks(tripId);
		case "savedPlace":
			return VIYA_ROUTES.tripPlaces(tripId);
		case "travelDocument":
		case "vaultItem":
			return VIYA_ROUTES.tripVault(tripId);
		case "tripNote":
			return VIYA_ROUTES.tripNotes(tripId);
		default:
			return null;
	}
};

function VaultGroupChip({
	count,
	isSelected,
	label,
	onPress,
}: {
	count: number;
	isSelected: boolean;
	label: string;
	onPress: () => void;
}) {
	return (
		<Chip label={`${label} ${count}`} onPress={onPress} selected={isSelected} />
	);
}

function VaultKindPicker({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<ChoiceChips label="Kind">
			{vaultKindOptions.map((kind) => (
				<Chip
					key={kind}
					label={formatVaultKindLabel(kind)}
					onPress={() => onChange(kind)}
					selected={value === kind}
				/>
			))}
		</ChoiceChips>
	);
}

function VaultEditSheet({
	errorMessage,
	form,
	isOpen,
	isSaving,
	linkOptions,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	errorMessage: string | null;
	form: VaultForm;
	isOpen: boolean;
	isSaving: boolean;
	linkOptions: TripRelatedEntityOption[];
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof VaultForm, value: string) => void;
}) {
	return (
		<FormSheet
			description="Update the label used across trip modules."
			errorMessage={errorMessage}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			saveLabel="Save item"
			snapPoint="78%"
			title="Edit vault item"
		>
			<SheetField
				label="Title"
				onChangeText={(value) => onUpdateForm("title", value)}
				placeholder="Hotel confirmation"
				value={form.title}
			/>
			<VaultKindPicker
				onChange={(value) => onUpdateForm("kind", value)}
				value={form.kind}
			/>
			<SheetField
				label="Note"
				onChangeText={(value) => onUpdateForm("note", value)}
				placeholder="Optional note"
				value={form.note}
			/>
			<View style={{ gap: spacing.sm }}>
				<FieldLabel>Linked trip item</FieldLabel>
				{linkOptions.length === 0 ? (
					<AppText tone="secondary" variant="subhead">
						Add bookings, documents, moments, or checklist tasks before linking
						this file.
					</AppText>
				) : (
					<ScrollView
						contentContainerStyle={{ gap: spacing.sm }}
						nestedScrollEnabled={true}
						showsVerticalScrollIndicator={false}
						style={{ maxHeight: 220 }}
					>
						<Chip
							label="No linked item"
							onPress={() => onUpdateForm("relatedEntityKey", "")}
							selected={!form.relatedEntityKey}
						/>
						{linkOptions.map((option) => (
							<Chip
								key={option.key}
								label={`${option.label} · ${option.detail}`}
								onPress={() => onUpdateForm("relatedEntityKey", option.key)}
								selected={form.relatedEntityKey === option.key}
							/>
						))}
					</ScrollView>
				)}
			</View>
		</FormSheet>
	);
}

const uploadActionMeta = [
	{
		description: "PDFs, IDs, tickets, or travel forms",
		icon: "document-outline",
		label: "Document",
	},
	{
		description: "Flights, stays, tours, and confirmations",
		icon: "ticket-outline",
		label: "Booking",
	},
	{
		description: "Payments, refunds, and expense proof",
		icon: "receipt-outline",
		label: "Receipt",
	},
	{
		description: "Camera roll photos or screenshots",
		icon: "images-outline",
		label: "Photo or screenshot",
	},
] as const;

function VaultAddSheet({
	isOpen,
	isUploading,
	onOpenChange,
	onPickBooking,
	onPickDocument,
	onPickPhoto,
	onPickReceipt,
}: {
	isOpen: boolean;
	isUploading: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onPickBooking: () => void;
	onPickDocument: () => void;
	onPickPhoto: () => void;
	onPickReceipt: () => void;
}) {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();
	const handlers = [onPickDocument, onPickBooking, onPickReceipt, onPickPhoto];

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[32px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["52%"]}
				>
					<SheetHeader
						onClose={() => onOpenChange(false)}
						subtitle="Choose what kind of file Viya should extract and link."
						title="Add to vault"
					/>
					<View
						style={{
							gap: spacing.sm,
							paddingBottom: Math.max(insets.bottom, spacing.lg),
							paddingHorizontal: spacing.screen,
							paddingTop: spacing.sm,
						}}
					>
						{uploadActionMeta.map((action, index) => (
							<PressableScale
								accessibilityLabel={action.label}
								disabled={isUploading}
								haptic="selection"
								key={action.label}
								onPress={handlers[index]}
								scaleTo={0.98}
								style={{
									alignItems: "center",
									backgroundColor: palette.surface,
									borderRadius: 16,
									flexDirection: "row",
									gap: spacing.md,
									minHeight: 64,
									opacity: isUploading ? 0.5 : 1,
									paddingHorizontal: spacing.lg,
									paddingVertical: spacing.md,
								}}
							>
								<Ionicons color={palette.accent} name={action.icon} size={22} />
								<View style={{ flex: 1, gap: 2 }}>
									<AppText variant="headline">{action.label}</AppText>
									<AppText
										numberOfLines={1}
										tone="secondary"
										variant="footnote"
									>
										{action.description}
									</AppText>
								</View>
								<Ionicons
									color={palette.inkTertiary}
									name="chevron-forward"
									size={16}
								/>
							</PressableScale>
						))}
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function TripVaultScreen() {
	const tripId = useTripIdParam();
	const vaultItems = useQuery(
		api.vault.listTripVaultItems,
		tripId ? { tripId } : "skip"
	);
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const confirmTripSyncReview = useMutation(api.vault.confirmTripSyncReview);
	const deleteVaultItem = useMutation(api.vault.deleteVaultItem);
	const updateVaultItem = useMutation(api.vault.updateVaultItem);
	const {
		errorMessage: uploadErrorMessage,
		isUploading,
		pickDocument,
		pickPhoto,
	} = useVaultUpload();
	const [editingItemId, setEditingItemId] = useState<Id<"vaultItems"> | null>(
		null
	);
	const [editForm, setEditForm] = useState<VaultForm>({
		kind: "document",
		note: "",
		relatedEntityKey: "",
		title: "",
	});
	const [pendingReview, setPendingReview] =
		useState<PendingTripSyncReview | null>(null);
	const [isConfirming, setIsConfirming] = useState(false);
	const [isSavingEdit, setIsSavingEdit] = useState(false);
	const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
	const [selectedVaultGroup, setSelectedVaultGroup] =
		useState<VaultGroup>("all");
	const [didSync, setDidSync] = useState(false);
	const [vaultErrorMessage, setVaultErrorMessage] = useState<string | null>(
		null
	);
	const { confirm, showToast } = useFeedback();
	const [openFileErrorMessage, setOpenFileErrorMessage] = useState<
		string | null
	>(null);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before syncing trip files."
					icon="folder-open-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (vaultItems === undefined) {
		return <LoadingState title="Loading vault" />;
	}

	const handlePhotoUpload = async () => {
		setVaultErrorMessage(null);
		const review = await pickPhoto({ tripId });
		if (review) {
			setPendingReview(review);
			setDidSync(false);
		}
	};

	const handleConfirm = async () => {
		if (!pendingReview) {
			return;
		}

		setVaultErrorMessage(null);
		setIsConfirming(true);
		try {
			await confirmTripSyncReview({
				extraction: pendingReview.extraction,
				fileName: pendingReview.upload.fileName,
				fileSize: pendingReview.upload.fileSize,
				kind: pendingReview.upload.kind,
				mimeType: pendingReview.upload.mimeType,
				storageId: pendingReview.upload.storageId,
				tripId,
			});
			setPendingReview(null);
			setDidSync(true);
			showToast({ message: "TripSync saved", tone: "success" });
		} catch {
			setVaultErrorMessage("Could not save TripSync review.");
		} finally {
			setIsConfirming(false);
		}
	};

	const openEditSheet = (item: Doc<"vaultItems">) => {
		setVaultErrorMessage(null);
		setEditingItemId(item._id);
		setEditForm({
			kind: item.kind,
			note: item.note ?? "",
			relatedEntityKey: getRelatedEntityKey({
				id: item.linkedEntityId,
				type: item.linkedEntityType,
			}),
			title: item.title,
		});
	};

	const handleSaveEdit = async () => {
		if (!editingItemId) {
			return;
		}

		const title = editForm.title.trim();
		if (!title) {
			setVaultErrorMessage("Add a file title.");
			return;
		}

		setVaultErrorMessage(null);
		setIsSavingEdit(true);
		try {
			const linkedEntityFields = getLinkedEntityMutationFields({
				relatedEntityKey: editForm.relatedEntityKey,
				shouldClear: true,
			});
			await updateVaultItem({
				kind: getVaultKind(editForm.kind),
				...linkedEntityFields,
				note: editForm.note.trim() || undefined,
				title,
				vaultItemId: editingItemId,
			});
			setEditingItemId(null);
		} catch {
			setVaultErrorMessage("Could not save vault item.");
		} finally {
			setIsSavingEdit(false);
		}
	};
	const handleDeleteVaultItem = async (vaultItemId: Id<"vaultItems">) => {
		setVaultErrorMessage(null);
		try {
			await deleteVaultItem({ vaultItemId });
		} catch {
			setVaultErrorMessage("Could not delete vault item.");
		}
	};
	const confirmDeleteVaultItem = async (
		vaultItemId: Id<"vaultItems">,
		itemTitle: string
	) => {
		const confirmed = await confirm({
			confirmLabel: "Delete",
			destructive: true,
			message: "This removes the file from the trip vault.",
			title: `Delete ${itemTitle}?`,
		});
		if (confirmed) {
			await handleDeleteVaultItem(vaultItemId);
		}
	};
	const handleOpenVaultFile = async (url?: string | null) => {
		if (!url) {
			setOpenFileErrorMessage("File preview is not available yet.");
			return;
		}

		setOpenFileErrorMessage(null);
		try {
			await Linking.openURL(url);
		} catch {
			setOpenFileErrorMessage("Could not open this file.");
		}
	};

	const linkOptions = workspace
		? getTripRelatedEntityOptions(workspace, {
				expenseLimit: 8,
				includeNotes: true,
				includeRisks: true,
				includeVaultItems: false,
				itineraryItemLimit: 8,
				noteLimit: 8,
				riskLimit: 8,
			})
		: [];
	const linkLabelByKey = workspace
		? getTripRelatedEntityLabelByKey(workspace)
		: new Map<string, string>();
	const receiptCount = vaultItems.filter(
		(item) => item.kind === "receipt"
	).length;
	const getVaultGroupCount = (group: VaultGroup) => {
		switch (group) {
			case "booking":
				return vaultItems.filter((item) => item.kind === "booking").length;
			case "document":
				return vaultItems.filter((item) => item.kind === "document").length;
			case "receipt":
				return receiptCount;
			case "photo":
				return vaultItems.filter((item) => item.kind === "momentPhoto").length;
			default:
				return vaultItems.length;
		}
	};
	const filteredVaultItems = vaultItems.filter((item) => {
		switch (selectedVaultGroup) {
			case "booking":
				return item.kind === "booking";
			case "document":
				return item.kind === "document";
			case "receipt":
				return item.kind === "receipt";
			case "photo":
				return item.kind === "momentPhoto";
			default:
				return true;
		}
	});
	const selectedVaultGroupLabel =
		vaultGroupOptions.find((option) => option.id === selectedVaultGroup)
			?.label ?? "Files";

	const handleSheetUpload = async (
		upload: () => Promise<PendingTripSyncReview | null>
	) => {
		setIsAddSheetOpen(false);
		const review = await upload();
		if (review) {
			setPendingReview(review);
			setDidSync(false);
		}
	};

	const savedFilesContent = (() => {
		if (vaultItems.length === 0) {
			return (
				<EmptyState
					action={{
						label: isUploading ? "Uploading..." : "Add file",
						onPress: () => {
							setIsAddSheetOpen(true);
						},
					}}
					description="Upload confirmations, travel documents, receipts, or useful screenshots."
					icon="folder-open-outline"
					title="No synced files"
				/>
			);
		}

		if (filteredVaultItems.length === 0) {
			return (
				<EmptyState
					description="Add one from the plus button."
					icon="folder-open-outline"
					title={`No ${selectedVaultGroupLabel.toLowerCase()} yet`}
				/>
			);
		}

		return (
			<View style={{ gap: spacing.md }}>
				{filteredVaultItems.map((item) => (
					<VaultPreviewCard
						createdAt={item.createdAt}
						fileName={item.fileName}
						key={item._id}
						kind={item.kind}
						linkedEntityHref={getVaultRelatedHref({
							relatedEntityType: item.linkedEntityType,
							tripId,
						})}
						linkedEntityLabel={
							item.linkedEntityType && item.linkedEntityId
								? (getTripRelatedEntityLabel(
										{
											relatedEntityId: item.linkedEntityId,
											relatedEntityType: item.linkedEntityType,
										},
										linkLabelByKey
									) ?? item.linkedEntityType)
								: undefined
						}
						onDelete={() => {
							confirmDeleteVaultItem(item._id, item.title).catch(
								() => undefined
							);
						}}
						onEdit={() => openEditSheet(item)}
						onOpenFile={() => {
							handleOpenVaultFile(item.url).catch(() => undefined);
						}}
						title={item.title}
						url={item.url}
					/>
				))}
			</View>
		);
	})();

	return (
		<TripModuleScreenFrame
			activeTab="documents"
			headerAction={
				<NavigationIconButton
					accessibilityLabel="Add file to vault"
					icon="add"
					onPress={() => setIsAddSheetOpen(true)}
				/>
			}
			tripId={tripId}
		>
			<Container includeBottomInset={false} isScrollable={false}>
				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						gap: spacing.md,
						paddingBottom: 112,
						paddingHorizontal: spacing.lg,
					}}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<ScrollView
						contentContainerStyle={{
							gap: spacing.sm,
							paddingRight: spacing.lg,
						}}
						horizontal={true}
						showsHorizontalScrollIndicator={false}
					>
						{vaultGroupOptions.map((option) => (
							<VaultGroupChip
								count={getVaultGroupCount(option.id)}
								isSelected={selectedVaultGroup === option.id}
								key={option.id}
								label={option.label}
								onPress={() => setSelectedVaultGroup(option.id)}
							/>
						))}
					</ScrollView>
					{isUploading ||
					uploadErrorMessage ||
					vaultErrorMessage ||
					openFileErrorMessage ||
					didSync ? (
						<Animated.View
							entering={FadeIn.duration(180)}
							style={{ gap: spacing.sm }}
						>
							{isUploading ? (
								<LoadingState
									delay={0}
									message="Viya is reading the file and linking it to your trip."
									title="Uploading and extracting..."
								/>
							) : null}
							<InlineMessage message={uploadErrorMessage ?? null} />
							<InlineMessage message={vaultErrorMessage} />
							<InlineMessage message={openFileErrorMessage} />
							{didSync ? (
								<Link asChild href={VIYA_ROUTES.tripReadiness(tripId)}>
									<SecondaryButton
										icon="checkmark-circle-outline"
										label="Review readiness impact"
										onPress={() => undefined}
									/>
								</Link>
							) : null}
						</Animated.View>
					) : null}
					{savedFilesContent}
				</ScrollView>

				<TripSyncReviewSheet
					isConfirming={isConfirming}
					isOpen={Boolean(pendingReview)}
					onConfirm={() => {
						handleConfirm().catch(() => undefined);
					}}
					onDiscard={() => setPendingReview(null)}
					onOpenChange={(isOpen) => {
						if (!(isOpen || isConfirming)) {
							setPendingReview(null);
						}
					}}
					review={pendingReview}
				/>
				<VaultEditSheet
					errorMessage={vaultErrorMessage}
					form={editForm}
					isOpen={Boolean(editingItemId)}
					isSaving={isSavingEdit}
					linkOptions={linkOptions}
					onOpenChange={(isOpen) => {
						if (!isOpen) {
							setEditingItemId(null);
							setVaultErrorMessage(null);
						}
					}}
					onSubmit={() => {
						handleSaveEdit().catch(() => undefined);
					}}
					onUpdateForm={(key, value) => {
						setVaultErrorMessage(null);
						setEditForm((currentForm) => ({ ...currentForm, [key]: value }));
					}}
				/>
				<VaultAddSheet
					isOpen={isAddSheetOpen}
					isUploading={isUploading}
					onOpenChange={setIsAddSheetOpen}
					onPickBooking={() => {
						handleSheetUpload(() =>
							pickDocument({ kind: "booking", tripId })
						).catch(() => undefined);
					}}
					onPickDocument={() => {
						handleSheetUpload(() =>
							pickDocument({ kind: "document", tripId })
						).catch(() => undefined);
					}}
					onPickPhoto={() => {
						setIsAddSheetOpen(false);
						handlePhotoUpload().catch(() => undefined);
					}}
					onPickReceipt={() => {
						handleSheetUpload(() =>
							pickDocument({ kind: "receipt", tripId })
						).catch(() => undefined);
					}}
				/>
			</Container>
		</TripModuleScreenFrame>
	);
}
