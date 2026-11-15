import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { addDaysToKey, getVaultCounts } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	AppSheet,
	Chip,
	EmptyState,
	Icon,
	type IconName,
	ListGroup,
	ListRow,
	ScreenShell,
	SheetHeader,
	spacing,
	useFeedback,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	ChoiceRow,
	FieldGroup,
	FieldRow,
	FormError,
	RecordSheet,
	StatusLabel,
} from "@/src/features/bookings/module-kit";
import {
	getLinkedEntityMutationFields,
	getRelatedEntityKey,
	getTripRelatedEntityLabel,
	getTripRelatedEntityLabelByKey,
	getTripRelatedEntityOptions,
	type TripRelatedEntityOption,
} from "@/src/features/trips/trip-related-entities";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";
import { formatCount, formatDay, formatEnumLabel } from "@/src/lib/format";
import { TripSyncReviewSheet } from "./tripsync-review-sheet";
import type { PendingTripSyncReview } from "./tripsync-types";
import { useVaultUpload } from "./use-vault-upload";
import { VaultPreviewCard, vaultKindLabels } from "./vault-preview-card";

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
	{ id: "all", label: "All" },
	{ id: "booking", label: "Bookings" },
	{ id: "document", label: "Documents" },
	{ id: "receipt", label: "Receipts" },
	{ id: "photo", label: "Photos" },
] as const satisfies readonly { id: VaultGroup; label: string }[];

const vaultKinds = new Set<string>(vaultKindOptions);

const vaultSectionLabels: Record<VaultKind, string> = {
	booking: "Bookings",
	document: "Documents",
	momentPhoto: "Photos",
	noteAttachment: "Attachments",
	other: "Other",
	receipt: "Receipts",
};

const getVaultKind = (value: string): VaultKind => {
	const kind = value.trim();

	return vaultKinds.has(kind) ? (kind as VaultKind) : "other";
};

const getVaultGroupKind = (group: VaultGroup): VaultKind | null => {
	switch (group) {
		case "booking":
			return "booking";
		case "document":
			return "document";
		case "receipt":
			return "receipt";
		case "photo":
			return "momentPhoto";
		default:
			return null;
	}
};

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
	isSelected,
	label,
	onPress,
}: {
	isSelected: boolean;
	label: string;
	onPress: () => void;
}) {
	return <Chip label={label} onPress={onPress} selected={isSelected} />;
}

function VaultEditSheet({
	errorMessage,
	form,
	isOpen,
	isSaving,
	item,
	linkOptions,
	onDelete,
	onOpenChange,
	onOpenFile,
	onOpenLinked,
	onSubmit,
	onUpdateForm,
}: {
	errorMessage: string | null;
	form: VaultForm;
	isOpen: boolean;
	isSaving: boolean;
	item: { url?: string | null } | null;
	linkOptions: TripRelatedEntityOption[];
	onDelete: () => void;
	onOpenChange: (isOpen: boolean) => void;
	onOpenFile: () => void;
	onOpenLinked: (() => void) | null;
	onSubmit: () => void;
	onUpdateForm: (key: keyof VaultForm, value: string) => void;
}) {
	const linkLabels = new Map(linkOptions.map((o) => [o.key, o.label]));

	return (
		<RecordSheet
			errorMessage={errorMessage}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={onOpenChange}
			onSave={onSubmit}
			title="File details"
		>
			<FieldGroup>
				<FieldRow
					label="Title"
					onChangeText={(value) => onUpdateForm("title", value)}
					placeholder="Hotel confirmation"
					value={form.title}
				/>
				<FieldRow
					label="Note"
					multiline={true}
					onChangeText={(value) => onUpdateForm("note", value)}
					placeholder="Optional"
					value={form.note}
				/>
				<ChoiceRow
					format={(value) => vaultKindLabels[value] ?? "File"}
					label="Kind"
					onChange={(value) => onUpdateForm("kind", value)}
					options={vaultKindOptions}
					value={form.kind}
				/>
			</FieldGroup>
			{linkOptions.length > 0 ? (
				<FieldGroup footer="Linked files show up in that part of your trip.">
					<ChoiceRow
						format={(value) => linkLabels.get(value) ?? "None"}
						label="Linked to"
						onChange={(value) => onUpdateForm("relatedEntityKey", value)}
						options={["", ...linkOptions.map((option) => option.key)]}
						value={form.relatedEntityKey}
					/>
				</FieldGroup>
			) : null}
			<ListGroup>
				{item?.url ? (
					<ListRow
						leading={<Icon name="open-outline" size={20} tone="secondary" />}
						onPress={onOpenFile}
						title="Open file"
					/>
				) : null}
				{onOpenLinked ? (
					<ListRow
						leading={<Icon name="link-outline" size={20} tone="secondary" />}
						onPress={onOpenLinked}
						title="Open linked item"
					/>
				) : null}
				<ListRow destructive={true} onPress={onDelete} title="Delete file" />
			</ListGroup>
		</RecordSheet>
	);
}

const uploadActions: readonly {
	icon: IconName;
	label: string;
	subtitle: string;
}[] = [
	{ icon: "document-outline", label: "Document", subtitle: "PDFs, IDs, forms" },
	{
		icon: "ticket-outline",
		label: "Booking",
		subtitle: "Flights, stays, tours",
	},
	{
		icon: "receipt-outline",
		label: "Receipt",
		subtitle: "Payments and refunds",
	},
	{
		icon: "images-outline",
		label: "Photo or screenshot",
		subtitle: "From your library",
	},
];

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
	const handlers = [onPickDocument, onPickBooking, onPickReceipt, onPickPhoto];

	return (
		<AppSheet isOpen={isOpen} onOpenChange={onOpenChange} snapPoints={["46%"]}>
			<SheetHeader onClose={() => onOpenChange(false)} title="Add to vault" />
			<View
				style={{
					gap: spacing.md,
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.md,
				}}
			>
				<ListGroup footer="Viya reads the file and links it to your plan.">
					{uploadActions.map((action, index) => (
						<ListRow
							key={action.label}
							leading={<Icon name={action.icon} size={22} tone="secondary" />}
							onPress={isUploading ? undefined : handlers[index]}
							subtitle={action.subtitle}
							title={action.label}
						/>
					))}
				</ListGroup>
			</View>
		</AppSheet>
	);
}

function VaultStatusRows({
	didSync,
	isUploading,
	onReview,
}: {
	didSync: boolean;
	isUploading: boolean;
	onReview: () => void;
}) {
	if (!(isUploading || didSync)) {
		return null;
	}

	return (
		<ListGroup>
			{isUploading ? (
				<ListRow
					leading={<ActivityIndicator />}
					subtitle="Viya is reading it and linking it to your trip."
					title="Uploading file"
				/>
			) : null}
			{didSync ? (
				<ListRow
					leading={
						<Icon name="checkmark-circle-outline" size={22} tone="success" />
					}
					onPress={onReview}
					subtitle="See what this file changed"
					title="Review readiness impact"
				/>
			) : null}
		</ListGroup>
	);
}

function getVaultSummary(
	vaultItems: readonly Doc<"vaultItems">[],
	documents: readonly Doc<"travelDocuments">[]
) {
	const counts = getVaultCounts(vaultItems, documents);

	if (vaultItems.length === 0 && counts.missingDocuments === 0) {
		return;
	}

	return [
		formatCount(counts.files, "file"),
		counts.linked > 0 ? `${counts.linked} linked` : null,
		counts.missingDocuments > 0
			? `${counts.missingDocuments} documents missing`
			: null,
	]
		.filter(Boolean)
		.join(" · ");
}

function TravelDocumentStatus({
	document,
	expiryCutoff,
}: {
	document: Doc<"travelDocuments">;
	expiryCutoff: string | null;
}) {
	if (document.status === "missing") {
		return (
			<StatusLabel icon="alert-circle-outline" label="Missing" tone="danger" />
		);
	}

	if (document.expiryDate) {
		return (
			<StatusLabel
				icon="time-outline"
				label={`Expires ${formatDay(document.expiryDate, { year: "always" })}`}
				tone={
					expiryCutoff && document.expiryDate < expiryCutoff
						? "warning"
						: "secondary"
				}
			/>
		);
	}

	return (
		<StatusLabel icon="checkmark-circle-outline" label="Saved" tone="success" />
	);
}

function TravelDocumentsGroup({
	documents,
	expiryCutoff,
	onPress,
}: {
	documents: readonly Doc<"travelDocuments">[];
	expiryCutoff: string | null;
	onPress: (document: Doc<"travelDocuments">) => void;
}) {
	if (documents.length === 0) {
		return null;
	}

	return (
		<ListGroup header="Travel documents">
			{documents.map((document) => (
				<ListRow
					key={document._id}
					onPress={() => onPress(document)}
					showChevron={false}
					subtitle={formatEnumLabel(document.type)}
					title={document.title}
					trailing={
						<TravelDocumentStatus
							document={document}
							expiryCutoff={expiryCutoff}
						/>
					}
				/>
			))}
		</ListGroup>
	);
}

export function TripVaultScreen() {
	const router = useRouter();
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
			<ScreenShell
				state={{
					description: "Open a saved trip to see its files.",
					icon: "folder-open-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Vault"
			/>
		);
	}

	if (vaultItems === undefined) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading vault" }}
				title="Vault"
			/>
		);
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
			showToast({ message: "Trip updated from file", tone: "success" });
		} catch {
			setVaultErrorMessage("Could not apply the changes. Try again.");
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
			setVaultErrorMessage("Add a title for this file.");
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
			setVaultErrorMessage("Could not save this file. Try again.");
		} finally {
			setIsSavingEdit(false);
		}
	};
	const handleDeleteVaultItem = async (vaultItemId: Id<"vaultItems">) => {
		setVaultErrorMessage(null);
		try {
			await deleteVaultItem({ vaultItemId });
		} catch {
			setVaultErrorMessage("Could not delete this file. Try again.");
		}
	};
	const confirmDeleteVaultItem = async (
		vaultItemId: Id<"vaultItems">,
		itemTitle: string
	) => {
		const confirmed = await confirm({
			confirmLabel: "Delete file",
			destructive: true,
			message: `${itemTitle} will be removed from this trip.`,
			title: "Delete file?",
		});
		if (confirmed) {
			setEditingItemId(null);
			await handleDeleteVaultItem(vaultItemId);
		}
	};
	const handleOpenVaultFile = async (url?: string | null) => {
		if (!url) {
			setOpenFileErrorMessage("This file has no preview yet.");
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
	const availableGroups = vaultGroupOptions.filter((option) => {
		const kind = getVaultGroupKind(option.id);
		return kind === null || vaultItems.some((item) => item.kind === kind);
	});
	const activeGroup = availableGroups.some(
		(option) => option.id === selectedVaultGroup
	)
		? selectedVaultGroup
		: "all";
	const activeKind = getVaultGroupKind(activeGroup);
	const filteredVaultItems = vaultItems.filter(
		(item) => activeKind === null || item.kind === activeKind
	);
	const sections = vaultKindOptions
		.map((kind) => ({
			items: filteredVaultItems.filter(
				(item) => getVaultKind(item.kind) === kind
			),
			kind,
		}))
		.filter((section) => section.items.length > 0);
	const editingItem =
		vaultItems.find((item) => item._id === editingItemId) ?? null;
	const editingHref = editingItem
		? getVaultRelatedHref({
				relatedEntityType: editingItem.linkedEntityType,
				tripId,
			})
		: null;

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
						label: isUploading ? "Uploading" : "Add file",
						onPress: () => {
							setIsAddSheetOpen(true);
						},
					}}
					description="Add a ticket, booking confirmation, ID or receipt. Viya reads it and suggests bookings and expenses for you to review."
					icon="folder-open-outline"
					title="No files for this trip"
				/>
			);
		}

		return sections.map((section) => (
			<ListGroup header={vaultSectionLabels[section.kind]} key={section.kind}>
				{section.items.map((item) => (
					<VaultPreviewCard
						createdAt={item.createdAt}
						fileName={item.fileName}
						fileSize={item.fileSize}
						key={item._id}
						kind={item.kind}
						linkedEntityLabel={
							item.linkedEntityType && item.linkedEntityId
								? (getTripRelatedEntityLabel(
										{
											relatedEntityId: item.linkedEntityId,
											relatedEntityType: item.linkedEntityType,
										},
										linkLabelByKey
									) ?? undefined)
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
			</ListGroup>
		));
	})();

	const documents = workspace?.documents ?? [];
	const summary = getVaultSummary(vaultItems, documents);
	const expiryCutoff = workspace?.trip.endDate
		? addDaysToKey(workspace.trip.endDate, 180)
		: null;
	const handleDocumentPress = (document: Doc<"travelDocuments">) => {
		const linkedFile = document.vaultItemId
			? vaultItems.find((item) => item._id === document.vaultItemId)
			: undefined;

		if (linkedFile) {
			handleOpenVaultFile(linkedFile.url).catch(() => undefined);
			return;
		}

		setIsAddSheetOpen(true);
	};
	const documentsContent = (
		<TravelDocumentsGroup
			documents={documents}
			expiryCutoff={expiryCutoff}
			onPress={handleDocumentPress}
		/>
	);

	return (
		<>
			<ScreenShell
				actions={
					vaultItems.length > 0
						? [
								{
									icon: "add",
									key: "add",
									label: "Add file to vault",
									onPress: () => setIsAddSheetOpen(true),
									type: "button",
								},
							]
						: []
				}
				summary={summary}
				title="Vault"
			>
				{availableGroups.length > 2 ? (
					<ScrollView
						contentContainerStyle={{ gap: spacing.sm }}
						horizontal={true}
						showsHorizontalScrollIndicator={false}
					>
						{availableGroups.map((option) => (
							<VaultGroupChip
								isSelected={activeGroup === option.id}
								key={option.id}
								label={option.label}
								onPress={() => setSelectedVaultGroup(option.id)}
							/>
						))}
					</ScrollView>
				) : null}
				<VaultStatusRows
					didSync={didSync}
					isUploading={isUploading}
					onReview={() => router.push(VIYA_ROUTES.tripReadiness(tripId))}
				/>
				<FormError message={uploadErrorMessage ?? null} />
				<FormError message={vaultErrorMessage} />
				<FormError message={openFileErrorMessage} />
				{documentsContent}
				{savedFilesContent}
			</ScreenShell>

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
				item={editingItem}
				linkOptions={linkOptions}
				onDelete={() => {
					if (editingItem) {
						confirmDeleteVaultItem(editingItem._id, editingItem.title).catch(
							() => undefined
						);
					}
				}}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setEditingItemId(null);
						setVaultErrorMessage(null);
					}
				}}
				onOpenFile={() => {
					handleOpenVaultFile(editingItem?.url).catch(() => undefined);
				}}
				onOpenLinked={
					editingHref
						? () => {
								setEditingItemId(null);
								router.push(editingHref);
							}
						: null
				}
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
		</>
	);
}
