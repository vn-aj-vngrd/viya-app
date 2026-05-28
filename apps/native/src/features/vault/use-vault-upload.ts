import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { getDocumentAsync } from "expo-document-picker";
import { launchImageLibraryAsync } from "expo-image-picker";
import { useState } from "react";

import type { PendingTripSyncReview } from "./tripsync-types";

type TripSyncUploadKind = "booking" | "document" | "receipt" | "other";

interface VaultUploadInput {
	fileName: string;
	fileSize: number;
	kind: TripSyncUploadKind;
	mimeType: string;
	tripId?: Id<"trips">;
	uri: string;
}

interface ConvexUploadResponse {
	storageId: Id<"_storage">;
}

const uploadToStorage = async (uploadUrl: string, input: VaultUploadInput) => {
	const blob = await fetch(input.uri).then((response) => response.blob());
	const response = await fetch(uploadUrl, {
		body: blob,
		headers: {
			"Content-Type": input.mimeType,
		},
		method: "POST",
	});

	if (!response.ok) {
		throw new Error("Vault upload failed.");
	}

	return (await response.json()) as ConvexUploadResponse;
};

export function useVaultUpload() {
	const [isUploading, setIsUploading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const generateUploadUrl = useMutation(api.vault.generateUploadUrl);
	const extractVaultItemDraft = useAction(
		api.ai.features.extractVaultItemDraft
	);

	const uploadFile = async (
		input: VaultUploadInput
	): Promise<PendingTripSyncReview> => {
		setIsUploading(true);
		setErrorMessage(null);

		try {
			const uploadUrl = await generateUploadUrl();
			const { storageId } = await uploadToStorage(uploadUrl, input);
			const extraction = await extractVaultItemDraft({
				fileName: input.fileName,
				fileSize: input.fileSize,
				kind: input.kind,
				mimeType: input.mimeType,
				storageId,
				title: input.fileName,
				tripId: input.tripId,
			});

			return {
				extraction,
				upload: {
					fileName: input.fileName,
					fileSize: input.fileSize,
					kind: input.kind,
					mimeType: input.mimeType,
					storageId,
				},
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Vault upload failed.";
			setErrorMessage(message);
			throw new Error(message);
		} finally {
			setIsUploading(false);
		}
	};

	const pickDocument = async ({
		kind = "document",
		tripId,
	}: {
		kind?: TripSyncUploadKind;
		tripId?: Id<"trips">;
	} = {}) => {
		const result = await getDocumentAsync({
			copyToCacheDirectory: true,
			multiple: false,
		});

		if (result.canceled || !result.assets[0]) {
			return null;
		}

		const asset = result.assets[0];

		return uploadFile({
			fileName: asset.name,
			fileSize: asset.size ?? 0,
			kind,
			mimeType: asset.mimeType ?? "application/octet-stream",
			tripId,
			uri: asset.uri,
		});
	};

	const pickPhoto = async ({ tripId }: { tripId?: Id<"trips"> } = {}) => {
		const result = await launchImageLibraryAsync({
			allowsMultipleSelection: false,
			mediaTypes: ["images"],
			quality: 0.85,
		});

		if (result.canceled || !result.assets[0]) {
			return null;
		}

		const asset = result.assets[0];

		return uploadFile({
			fileName: asset.fileName ?? "trip-file.jpg",
			fileSize: asset.fileSize ?? 0,
			kind: "other",
			mimeType: asset.mimeType ?? "image/jpeg",
			tripId,
			uri: asset.uri,
		});
	};

	return {
		errorMessage,
		isUploading,
		pickDocument,
		pickPhoto,
		uploadFile,
	};
}
