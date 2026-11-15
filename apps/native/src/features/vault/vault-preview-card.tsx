import type { IconName } from "@/src/components/ui";
import { Icon, ListRow } from "@/src/components/ui";
import { SwipeRow } from "@/src/features/bookings/module-kit";
import { formatFileSize, formatShortDate } from "@/src/lib/format";

interface VaultPreviewCardProps {
	createdAt: number;
	fileName: string;
	fileSize?: number;
	kind: string;
	linkedEntityLabel?: string;
	onDelete?: () => void;
	onEdit?: () => void;
	onOpenFile?: () => void;
	title: string;
	url?: string | null;
}

const vaultKindIcons: Record<string, IconName> = {
	booking: "ticket-outline",
	document: "document-outline",
	momentPhoto: "images-outline",
	receipt: "receipt-outline",
};

export const vaultKindLabels: Record<string, string> = {
	booking: "Booking",
	document: "Document",
	momentPhoto: "Photo",
	noteAttachment: "Attachment",
	other: "File",
	receipt: "Receipt",
};

/**
 * One saved file as an inset-list row. Tap opens the file; swipe deletes or
 * edits; the trailing chevron-free row keeps the list quiet.
 */
export function VaultPreviewCard({
	createdAt,
	fileName,
	fileSize,
	kind,
	linkedEntityLabel,
	onDelete,
	onEdit,
	onOpenFile,
	title,
	url,
}: VaultPreviewCardProps) {
	const canOpenFile = Boolean(url && onOpenFile);
	const subtitle = [
		vaultKindLabels[kind] ?? "File",
		fileSize ? formatFileSize(fileSize) : null,
		`Added ${formatShortDate(createdAt)}`,
		linkedEntityLabel,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<SwipeRow
			leading={
				onEdit
					? {
							icon: "create-outline",
							label: "Details",
							onPress: onEdit,
							tone: "accent",
						}
					: undefined
			}
			trailing={
				onDelete
					? {
							icon: "trash-outline",
							label: "Delete",
							onPress: onDelete,
							tone: "danger",
						}
					: undefined
			}
		>
			<ListRow
				accessibilityLabel={
					canOpenFile ? `Open file ${title}` : `${title}, ${fileName}`
				}
				leading={
					<Icon
						name={vaultKindIcons[kind] ?? "document-attach-outline"}
						size={22}
						tone="secondary"
					/>
				}
				onPress={canOpenFile ? onOpenFile : onEdit}
				showChevron={false}
				subtitle={subtitle}
				title={title}
			/>
		</SwipeRow>
	);
}
