import { Feather, Ionicons } from "@expo/vector-icons";
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
	Text,
	TextField,
	useThemeColor,
	useToast,
} from "heroui-native";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { TripModuleScreenFrame } from "@/src/features/trips/trip-module-floating-bar";
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
type VaultGroupIconName = ComponentProps<typeof Feather>["name"];

const vaultGroupOptions = [
	{ icon: "folder", id: "all", label: "All files" },
	{ icon: "bookmark", id: "booking", label: "Bookings" },
	{ icon: "file-text", id: "document", label: "Documents" },
	{ icon: "credit-card", id: "receipt", label: "Receipts" },
	{ icon: "image", id: "photo", label: "Photos" },
] as const satisfies readonly {
	icon: VaultGroupIconName;
	id: VaultGroup;
	label: string;
}[];

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

function VaultGroupChip({
	count,
	icon,
	isSelected,
	label,
	onPress,
}: {
	count: number;
	icon: VaultGroupIconName;
	isSelected: boolean;
	label: string;
	onPress: () => void;
}) {
	const foregroundColor = useThemeColor("foreground");
	const selectedColor = "#0A84FF";
	const contentColor = isSelected ? selectedColor : foregroundColor;

	return (
		<Pressable
			accessibilityLabel={`Filter vault by ${label}`}
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			className="h-11 flex-row items-center gap-1.5 rounded-full border px-3"
			onPress={onPress}
			style={({ pressed }) => ({
				backgroundColor: isSelected ? "rgba(10, 132, 255, 0.13)" : "#FFFFFF",
				borderColor: isSelected
					? "rgba(10, 132, 255, 0.24)"
					: "rgba(24, 24, 27, 0.08)",
				transform: [{ scale: pressed ? 0.98 : 1 }],
			})}
		>
			<Feather color={contentColor} name={icon} size={15} />
			<Text style={{ color: contentColor }} type="body-sm" weight="semibold">
				{label} {count}
			</Text>
		</Pressable>
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
	const uploadActions = [
		{
			accent: "#0A84FF",
			description: "PDFs, IDs, tickets, or travel forms",
			icon: "document-outline",
			label: "Document",
			onPress: onPickDocument,
		},
		{
			accent: "#FF9F0A",
			description: "Flights, stays, tours, and confirmations",
			icon: "ticket-outline",
			label: "Booking",
			onPress: onPickBooking,
		},
		{
			accent: "#34C759",
			description: "Payments, refunds, and expense proof",
			icon: "receipt-outline",
			label: "Receipt",
			onPress: onPickReceipt,
		},
		{
			accent: "#AF52DE",
			description: "Camera roll photos or screenshots",
			icon: "images-outline",
			label: "Photo or screenshot",
			onPress: onPickPhoto,
		},
	] as const;

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["52%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>Add to vault</BottomSheet.Title>
								<BottomSheet.Description>
									Choose what kind of file Viya should extract and link.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close add file options"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<View className="gap-2">
							{uploadActions.map((action) => (
								<Button
									className="h-16 justify-start rounded-3xl bg-surface px-4"
									isDisabled={isUploading}
									key={action.label}
									onPress={action.onPress}
									size="lg"
									variant="secondary"
								>
									<View
										className="h-10 w-10 items-center justify-center rounded-full"
										style={{ backgroundColor: `${action.accent}1F` }}
									>
										<Ionicons
											color={action.accent}
											name={action.icon}
											size={19}
										/>
									</View>
									<View className="min-w-0 flex-1 items-start">
										<Text type="body-sm" weight="semibold">
											{action.label}
										</Text>
										<Text color="muted" numberOfLines={1} type="body-xs">
											{action.description}
										</Text>
									</View>
								</Button>
							))}
						</View>
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
	const { isUploading, pickDocument, pickPhoto } = useVaultUpload();
	const { toast } = useToast();
	const showVaultSuccessToast = (message: string) => {
		toast.show({
			description: message,
			duration: 3600,
			label: "Vault updated",
			variant: "success",
		});
	};
	const showVaultErrorToast = (message: string) => {
		toast.show({
			description: message,
			duration: 4200,
			label: "Vault needs attention",
			variant: "danger",
		});
	};
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

	const handlePhotoUpload = async () => {
		try {
			const review = await pickPhoto({ tripId });
			if (review) {
				setPendingReview(review);
				setDidSync(false);
				showVaultSuccessToast(
					"Photo uploaded. Review the TripSync extraction before saving."
				);
			}
		} catch (error) {
			showVaultErrorToast(
				error instanceof Error ? error.message : "Could not upload photo."
			);
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
			showVaultSuccessToast(
				"TripSync review saved. Viya can use this evidence across the workspace."
			);
		} catch (error) {
			showVaultErrorToast(
				error instanceof Error
					? error.message
					: "Could not save TripSync review."
			);
		} finally {
			setIsConfirming(false);
		}
	};

	const openEditSheet = (item: Doc<"vaultItems">) => {
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
			showVaultErrorToast("Add a file title.");
			return;
		}

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
			showVaultSuccessToast("Vault item saved.");
		} catch (error) {
			showVaultErrorToast(
				error instanceof Error ? error.message : "Could not save vault item."
			);
		} finally {
			setIsSavingEdit(false);
		}
	};
	const handleDeleteVaultItem = async (vaultItemId: Id<"vaultItems">) => {
		try {
			await deleteVaultItem({ vaultItemId });
			showVaultSuccessToast("Vault item deleted.");
		} catch (error) {
			showVaultErrorToast(
				error instanceof Error ? error.message : "Could not delete vault item."
			);
		}
	};
	const handleOpenVaultFile = async (url?: string | null) => {
		if (!url) {
			showVaultErrorToast("File preview is not available yet.");
			return;
		}

		try {
			await Linking.openURL(url);
		} catch (error) {
			showVaultErrorToast(
				error instanceof Error ? error.message : "Could not open this file."
			);
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
		try {
			const review = await upload();
			if (review) {
				setPendingReview(review);
				setDidSync(false);
				showVaultSuccessToast(
					"File uploaded. Review the TripSync extraction before saving."
				);
			}
		} catch (error) {
			showVaultErrorToast(
				error instanceof Error ? error.message : "Could not upload file."
			);
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
			<View className="gap-3">
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
						gap: 14,
						paddingBottom: 112,
						paddingHorizontal: 16,
					}}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View className="gap-3">
						<ScrollView
							contentContainerStyle={{ gap: 8, paddingRight: 16 }}
							horizontal={true}
							showsHorizontalScrollIndicator={false}
						>
							{vaultGroupOptions.map((option) => (
								<VaultGroupChip
									count={getVaultGroupCount(option.id)}
									icon={option.icon}
									isSelected={selectedVaultGroup === option.id}
									key={option.id}
									label={option.label}
									onPress={() => setSelectedVaultGroup(option.id)}
								/>
							))}
						</ScrollView>
						{isUploading || didSync ? (
							<View className="gap-2">
								{isUploading ? (
									<View className="flex-row items-center gap-2">
										<Spinner size="sm" />
										<Text color="muted" type="body-sm">
											Uploading and extracting...
										</Text>
									</View>
								) : null}
								{didSync ? (
									<Link asChild href={VIYA_ROUTES.tripReadiness(tripId)}>
										<Button size="sm" variant="secondary">
											<Button.Label>Review readiness impact</Button.Label>
										</Button>
									</Link>
								) : null}
							</View>
						) : null}
						{savedFilesContent}
					</View>
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
