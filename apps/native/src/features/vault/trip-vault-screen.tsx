import { api } from "@viya-app/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Link } from "expo-router";
import { Button, Chip, Spinner, Surface, Text } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";
import { TripSyncReviewSheet } from "./tripsync-review-sheet";
import type { PendingTripSyncReview } from "./tripsync-types";
import { useVaultUpload } from "./use-vault-upload";
import { VaultPreviewCard } from "./vault-preview-card";

export function TripVaultScreen() {
	const tripId = useTripIdParam();
	const vaultItems = useQuery(
		api.vault.listTripVaultItems,
		tripId ? { tripId } : "skip"
	);
	const confirmTripSyncReview = useMutation(api.vault.confirmTripSyncReview);
	const { errorMessage, isUploading, pickDocument, pickPhoto } =
		useVaultUpload();
	const [pendingReview, setPendingReview] =
		useState<PendingTripSyncReview | null>(null);
	const [isConfirming, setIsConfirming] = useState(false);
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
						<Chip size="sm" variant="secondary">
							<Chip.Label>{vaultItems?.length ?? 0} files</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>Review before save</Chip.Label>
						</Chip>
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
							variant="ghost"
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
		</Container>
	);
}
