import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import type { VaultExtraction } from "@viya-app/domain";

export interface PendingTripSyncUpload {
	fileName: string;
	fileSize: number;
	kind: "booking" | "document" | "receipt" | "other";
	mimeType: string;
	storageId: Id<"_storage">;
}

export interface PendingTripSyncReview {
	extraction: VaultExtraction;
	upload: PendingTripSyncUpload;
}
