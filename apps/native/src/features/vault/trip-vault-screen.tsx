import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	Label,
	Spinner,
	Surface,
	Text,
	TextField,
} from "heroui-native";
import type { ReactNode } from "react";
import { useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { TripModuleScreenFrame } from "@/src/features/trips/trip-module-floating-bar";
import { TripModuleManualEntryCard } from "@/src/features/trips/trip-module-manual-entry-card";
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

type VaultListItem = Doc<"vaultItems"> & {
	url?: string | null;
};

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

function VaultPill({ children }: { children: ReactNode }) {
	return (
		<View className="rounded-full bg-surface-secondary px-3 py-1.5">
			<Text color="muted" type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
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
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				KIND
			</Text>
			<View className="flex-row flex-wrap gap-2">
				{vaultKindOptions.map((kind) => (
					<Button
						key={kind}
						onPress={() => onChange(kind)}
						size="sm"
						variant={value === kind ? "primary" : "secondary"}
					>
						<Button.Label>{formatVaultKindLabel(kind)}</Button.Label>
					</Button>
				))}
			</View>
		</View>
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
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["78%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>Edit vault item</BottomSheet.Title>
								<BottomSheet.Description>
									Update the label used across trip modules.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close vault edit form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>
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
						<View className="gap-2">
							<Label>
								<Label.Text>Linked trip item</Label.Text>
							</Label>
							{linkOptions.length === 0 ? (
								<Text color="muted" type="body-sm">
									Add bookings, documents, moments, or checklist tasks before
									linking this file.
								</Text>
							) : (
								<ScrollView
									contentContainerStyle={{ gap: 8 }}
									showsVerticalScrollIndicator={false}
									style={{ maxHeight: 220 }}
								>
									<Button
										onPress={() => {
											onUpdateForm("relatedEntityKey", "");
										}}
										size="sm"
										variant={form.relatedEntityKey ? "secondary" : "primary"}
									>
										<Button.Label>No linked item</Button.Label>
									</Button>
									{linkOptions.map((option) => {
										const isSelected = form.relatedEntityKey === option.key;

										return (
											<Button
												key={option.key}
												onPress={() => {
													onUpdateForm("relatedEntityKey", option.key);
												}}
												size="sm"
												variant={isSelected ? "primary" : "secondary"}
											>
												<Button.Label>
													{option.label} · {option.detail}
												</Button.Label>
											</Button>
										);
									})}
								</ScrollView>
							)}
						</View>
						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>Save item</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function LatestVaultFileSummary({
	handleOpenVaultFile,
	isUploading,
	latestFile,
	latestFileRelatedHref,
	openEditSheet,
	onUploadFirstFile,
}: {
	handleOpenVaultFile: (url?: string | null) => Promise<void>;
	isUploading: boolean;
	latestFile: VaultListItem | null;
	latestFileRelatedHref: Href | null;
	openEditSheet: (item: VaultListItem) => void;
	onUploadFirstFile: () => void;
}) {
	return (
		<View className="gap-3 rounded-[24px] bg-surface p-4">
			<View className="flex-row items-center gap-3">
				<View
					className="h-9 w-9 items-center justify-center rounded-full"
					style={{ backgroundColor: "rgba(90, 200, 250, 0.16)" }}
				>
					<Ionicons color="#5AC8FA" name="document-attach-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						LATEST FILE
					</Text>
					<Text numberOfLines={1} type="body-sm" weight="bold">
						{latestFile?.title ?? "No file synced yet"}
					</Text>
				</View>
			</View>
			<Text color="muted" numberOfLines={2} type="body-sm">
				{latestFile
					? `${formatVaultKindLabel(latestFile.kind)} · ${
							latestFile.linkedEntityType
								? "Linked to trip context"
								: "Ready to link"
						}`
					: "Upload a booking, document, receipt, or screenshot to start the vault."}
			</Text>
			{latestFile ? (
				<View className="flex-row flex-wrap gap-2">
					<Button
						className="flex-1"
						onPress={() => {
							handleOpenVaultFile(latestFile.url).catch(() => undefined);
						}}
						size="sm"
					>
						<Ionicons color="#FFFFFF" name="open-outline" size={16} />
						<Button.Label>Open latest file</Button.Label>
					</Button>
					<Button
						className="flex-1"
						onPress={() => openEditSheet(latestFile)}
						size="sm"
						variant="secondary"
					>
						<Ionicons color="#0A84FF" name="create-outline" size={16} />
						<Button.Label>Edit latest file</Button.Label>
					</Button>
					{latestFileRelatedHref ? (
						<Link asChild href={latestFileRelatedHref}>
							<Button className="w-full" size="sm" variant="secondary">
								<Ionicons color="#0A84FF" name="git-branch-outline" size={16} />
								<Button.Label>Open latest link</Button.Label>
							</Button>
						</Link>
					) : null}
				</View>
			) : (
				<Button isDisabled={isUploading} onPress={onUploadFirstFile} size="sm">
					{isUploading ? <Spinner size="sm" /> : null}
					<Ionicons color="#FFFFFF" name="cloud-upload-outline" size={16} />
					<Button.Label>
						{isUploading ? "Uploading..." : "Upload first file"}
					</Button.Label>
				</Button>
			)}
		</View>
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
	const [didSync, setDidSync] = useState(false);
	const [vaultErrorMessage, setVaultErrorMessage] = useState<string | null>(
		null
	);
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
		return <ScreenLoadingState />;
	}

	const handleUpload = async (kind: "booking" | "document" | "receipt") => {
		setVaultErrorMessage(null);
		const review = await pickDocument({ kind, tripId });
		if (review) {
			setPendingReview(review);
			setDidSync(false);
		}
	};

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
	const linkedFileCount = vaultItems.filter(
		(item) => item.linkedEntityId && item.linkedEntityType
	).length;
	const receiptCount = vaultItems.filter(
		(item) => item.kind === "receipt"
	).length;
	const documentCount = vaultItems.filter(
		(item) => item.kind === "document" || item.kind === "booking"
	).length;
	const latestFile = vaultItems.at(0) ?? null;
	const latestFileRelatedHref = latestFile
		? getVaultRelatedHref({
				relatedEntityType: latestFile.linkedEntityType,
				tripId,
			})
		: null;
	const linkTargetLabel =
		workspace === undefined
			? "Loading links"
			: `${linkOptions.length} link targets`;

	const savedFilesContent = (() => {
		if (vaultItems.length === 0) {
			return (
				<EmptyState
					action={{
						label: isUploading ? "Uploading..." : "Upload file",
						onPress: () => {
							handleUpload("document").catch(() => undefined);
						},
					}}
					description="Upload confirmations, travel documents, receipts, or useful screenshots."
					icon="folder-open-outline"
					title="No synced files"
				/>
			);
		}

		return (
			<View className="gap-3">
				{vaultItems.map((item) => (
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
							handleDeleteVaultItem(item._id).catch(() => undefined);
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
			header={
				<RouteHeader
					eyebrow="Sync"
					icon="cloud-upload-outline"
					subtitle="Upload, label, link, and review files before they update trip records."
					title="TripSync Vault"
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
						description="Upload confirmations, IDs, receipts, screenshots, and photos, then link each file to the right trip item."
						isPrimaryDisabled={isUploading}
						isSecondaryDisabled={isUploading}
						moduleLabel="documents"
						onPrimaryPress={() => {
							handleUpload("document").catch(() => undefined);
						}}
						onSecondaryPress={() => {
							handlePhotoUpload().catch(() => undefined);
						}}
						primaryActionIcon="cloud-upload-outline"
						primaryActionLabel={isUploading ? "Uploading..." : "Upload file"}
						secondaryActionIcon="images-outline"
						secondaryActionLabel="Add photo"
					/>

					<Surface className="gap-4 rounded-[30px] bg-surface-secondary p-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="min-w-0 flex-1 gap-1">
								<Text.Heading type="h5" weight="semibold">
									Document inbox
								</Text.Heading>
								<Text color="muted" type="body-sm">
									Upload once, review extraction, then link files to the trip.
								</Text>
							</View>
							<View
								className="h-11 w-11 items-center justify-center rounded-full"
								style={{ backgroundColor: "rgba(90, 200, 250, 0.14)" }}
							>
								<Ionicons
									color="#5AC8FA"
									name="folder-open-outline"
									size={20}
								/>
							</View>
						</View>
						<View className="flex-row flex-wrap gap-2">
							<VaultPill>{vaultItems.length} files</VaultPill>
							<VaultPill>{linkedFileCount} linked</VaultPill>
							<VaultPill>{documentCount} docs</VaultPill>
							<VaultPill>{receiptCount} receipts</VaultPill>
							<VaultPill>{linkTargetLabel}</VaultPill>
							<VaultPill>Review before save</VaultPill>
						</View>
						<LatestVaultFileSummary
							handleOpenVaultFile={handleOpenVaultFile}
							isUploading={isUploading}
							latestFile={latestFile}
							latestFileRelatedHref={latestFileRelatedHref}
							onUploadFirstFile={() => {
								handleUpload("document").catch(() => undefined);
							}}
							openEditSheet={openEditSheet}
						/>
						<View className="flex-row flex-wrap gap-2">
							<Button
								className="flex-1"
								isDisabled={isUploading}
								onPress={() => {
									handleUpload("booking").catch(() => undefined);
								}}
								size="sm"
							>
								<Ionicons color="#FFFFFF" name="ticket-outline" size={16} />
								<Button.Label>Booking</Button.Label>
							</Button>
							<Button
								className="flex-1"
								isDisabled={isUploading}
								onPress={() => {
									handleUpload("document").catch(() => undefined);
								}}
								size="sm"
								variant="secondary"
							>
								<Ionicons color="#0A84FF" name="document-outline" size={16} />
								<Button.Label>Document</Button.Label>
							</Button>
							<Button
								className="flex-1"
								isDisabled={isUploading}
								onPress={() => {
									handleUpload("receipt").catch(() => undefined);
								}}
								size="sm"
								variant="secondary"
							>
								<Ionicons color="#0A84FF" name="receipt-outline" size={16} />
								<Button.Label>Receipt</Button.Label>
							</Button>
							<Button
								className="w-full"
								isDisabled={isUploading}
								onPress={() => {
									handlePhotoUpload().catch(() => undefined);
								}}
								size="sm"
								variant="tertiary"
							>
								<Ionicons color="#6B7280" name="camera-outline" size={16} />
								<Button.Label>Photo or screenshot</Button.Label>
							</Button>
						</View>
						{isUploading ? (
							<View className="flex-row items-center gap-2">
								<Spinner size="sm" />
								<Text color="muted" type="body-sm">
									Uploading and extracting...
								</Text>
							</View>
						) : null}
						{uploadErrorMessage ? (
							<Text className="text-danger" type="body-sm">
								{uploadErrorMessage}
							</Text>
						) : null}
						{vaultErrorMessage ? (
							<Text className="text-danger" type="body-sm">
								{vaultErrorMessage}
							</Text>
						) : null}
						{openFileErrorMessage ? (
							<Text className="text-danger" type="body-sm">
								{openFileErrorMessage}
							</Text>
						) : null}
						{didSync ? (
							<Link asChild href={VIYA_ROUTES.tripReadiness(tripId)}>
								<Button size="sm" variant="secondary">
									<Button.Label>Review readiness impact</Button.Label>
								</Button>
							</Link>
						) : null}
					</Surface>

					<View className="gap-3">
						<Text.Heading type="h5" weight="semibold">
							Saved files
						</Text.Heading>
						{savedFilesContent}
					</View>
				</View>

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
			</Container>
		</TripModuleScreenFrame>
	);
}
