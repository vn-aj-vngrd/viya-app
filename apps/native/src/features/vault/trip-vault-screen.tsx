import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
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
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";
import { TripSyncReviewSheet } from "./tripsync-review-sheet";
import type { PendingTripSyncReview } from "./tripsync-types";
import { useVaultUpload } from "./use-vault-upload";
import { VaultPreviewCard } from "./vault-preview-card";

interface VaultForm {
	kind: string;
	linkedEntityId: string;
	linkedEntityType: string;
	note: string;
	title: string;
}

interface VaultLinkOption {
	detail: string;
	id: string;
	label: string;
	type: "booking" | "travelDocument" | "moment" | "readinessItem";
}

type VaultKind =
	| "booking"
	| "document"
	| "momentPhoto"
	| "receipt"
	| "noteAttachment"
	| "other";

const vaultKinds = new Set<string>([
	"booking",
	"document",
	"momentPhoto",
	"receipt",
	"noteAttachment",
	"other",
]);

const getVaultKind = (value: string): VaultKind => {
	const kind = value.trim();

	return vaultKinds.has(kind) ? (kind as VaultKind) : "other";
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

function VaultEditSheet({
	form,
	isOpen,
	isSaving,
	linkOptions,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	form: VaultForm;
	isOpen: boolean;
	isSaving: boolean;
	linkOptions: VaultLinkOption[];
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
						<SheetField
							label="Kind"
							onChangeText={(value) => onUpdateForm("kind", value)}
							placeholder="booking, document, receipt"
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
											onUpdateForm("linkedEntityId", "");
											onUpdateForm("linkedEntityType", "");
										}}
										size="sm"
										variant={form.linkedEntityId ? "secondary" : "primary"}
									>
										<Button.Label>No linked item</Button.Label>
									</Button>
									{linkOptions.map((option) => {
										const isSelected =
											form.linkedEntityId === option.id &&
											form.linkedEntityType === option.type;

										return (
											<Button
												key={`${option.type}:${option.id}`}
												onPress={() => {
													onUpdateForm("linkedEntityId", option.id);
													onUpdateForm("linkedEntityType", option.type);
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
	const { errorMessage, isUploading, pickDocument, pickPhoto } =
		useVaultUpload();
	const [editingItemId, setEditingItemId] = useState<Id<"vaultItems"> | null>(
		null
	);
	const [editForm, setEditForm] = useState<VaultForm>({
		kind: "document",
		linkedEntityId: "",
		linkedEntityType: "",
		note: "",
		title: "",
	});
	const [pendingReview, setPendingReview] =
		useState<PendingTripSyncReview | null>(null);
	const [isConfirming, setIsConfirming] = useState(false);
	const [isSavingEdit, setIsSavingEdit] = useState(false);
	const [didSync, setDidSync] = useState(false);

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

	const handleUpload = async (kind: "booking" | "document" | "receipt") => {
		const review = await pickDocument({ kind, tripId });
		if (review) {
			setPendingReview(review);
			setDidSync(false);
		}
	};

	const handlePhotoUpload = async () => {
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
		} finally {
			setIsConfirming(false);
		}
	};

	const openEditSheet = (item: Doc<"vaultItems">) => {
		setEditingItemId(item._id);
		setEditForm({
			kind: item.kind,
			linkedEntityId: item.linkedEntityId ?? "",
			linkedEntityType: item.linkedEntityType ?? "",
			note: item.note ?? "",
			title: item.title,
		});
	};

	const handleSaveEdit = async () => {
		if (!editingItemId) {
			return;
		}

		const title = editForm.title.trim();
		if (!title) {
			return;
		}

		setIsSavingEdit(true);
		try {
			await updateVaultItem({
				kind: getVaultKind(editForm.kind),
				linkedEntityId: editForm.linkedEntityId.trim() || undefined,
				linkedEntityType: editForm.linkedEntityType.trim() || undefined,
				note: editForm.note.trim() || undefined,
				title,
				vaultItemId: editingItemId,
			});
			setEditingItemId(null);
		} finally {
			setIsSavingEdit(false);
		}
	};

	const linkOptions: VaultLinkOption[] = workspace
		? [
				...workspace.bookings.map((booking) => ({
					detail: booking.type,
					id: booking._id,
					label: booking.title,
					type: "booking" as const,
				})),
				...workspace.documents.map((document) => ({
					detail: document.type,
					id: document._id,
					label: document.title,
					type: "travelDocument" as const,
				})),
				...workspace.moments.map((moment) => ({
					detail: moment.locationName || "Moment",
					id: moment._id,
					label: moment.title,
					type: "moment" as const,
				})),
				...workspace.readinessItems.map((item) => ({
					detail: item.category,
					id: item._id,
					label: item.title,
					type: "readinessItem" as const,
				})),
			]
		: [];
	const linkLabelByKey = new Map(
		linkOptions.map((option) => [
			`${option.type}:${option.id}`,
			`${option.label} · ${option.detail}`,
		])
	);

	const savedFilesContent = (() => {
		if (vaultItems === undefined) {
			return (
				<View className="items-center py-6">
					<Spinner />
				</View>
			);
		}

		if (vaultItems.length === 0) {
			return (
				<EmptyState
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
						linkedEntityLabel={
							item.linkedEntityType && item.linkedEntityId
								? (linkLabelByKey.get(
										`${item.linkedEntityType}:${item.linkedEntityId}`
									) ?? item.linkedEntityType)
								: undefined
						}
						onDelete={() => {
							deleteVaultItem({ vaultItemId: item._id }).catch(() => undefined);
						}}
						onEdit={() => openEditSheet(item)}
						title={item.title}
					/>
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
					eyebrow="Sync"
					icon="cloud-upload-outline"
					subtitle="Review extracted details before they update bookings, documents, and readiness."
					title="TripSync Vault"
				/>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row flex-wrap gap-2">
						<VaultPill>{vaultItems?.length ?? 0} files</VaultPill>
						<VaultPill>Review before save</VaultPill>
					</View>
					<View className="flex-row flex-wrap gap-2">
						<Button
							className="flex-1"
							isDisabled={isUploading}
							onPress={() => {
								handleUpload("booking").catch(() => undefined);
							}}
							size="sm"
						>
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
					{errorMessage ? (
						<Text className="text-danger" type="body-sm">
							{errorMessage}
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
				form={editForm}
				isOpen={Boolean(editingItemId)}
				isSaving={isSavingEdit}
				linkOptions={linkOptions}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setEditingItemId(null);
					}
				}}
				onSubmit={() => {
					handleSaveEdit().catch(() => undefined);
				}}
				onUpdateForm={(key, value) => {
					setEditForm((currentForm) => ({ ...currentForm, [key]: value }));
				}}
			/>
		</Container>
	);
}
