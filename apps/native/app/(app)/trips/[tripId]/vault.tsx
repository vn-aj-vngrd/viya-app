import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button, Spinner, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { useVaultUpload } from "@/src/features/vault/use-vault-upload";
import { VaultPreviewCard } from "@/src/features/vault/vault-preview-card";

export default function VaultScreen() {
	const vaultItems = useQuery(api.vault.listTripVaultItems, {});
	const { errorMessage, isUploading, pickDocument, pickPhoto } =
		useVaultUpload();
	const savedFilesContent =
		vaultItems === undefined ? (
			<View className="items-center py-6">
				<Spinner />
			</View>
		) : (
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
	const emptyFilesContent =
		vaultItems?.length === 0 ? (
			<Surface className="rounded-[24px] border border-border bg-surface p-4">
				<Text weight="semibold">No files yet</Text>
				<Text.Paragraph className="mt-1 leading-5" color="muted" type="body-sm">
					Add a booking, travel document, receipt, or photo once your trip
					starts taking shape.
				</Text.Paragraph>
			</Surface>
		) : null;

	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4">
				<View>
					<Text.Heading type="h2" weight="semibold">
						Vault
					</Text.Heading>
					<Text.Paragraph className="mt-1" color="muted" type="body-sm">
						Secure storage for bookings, travel documents, receipts, and trip
						photos.
					</Text.Paragraph>
				</View>

				<Surface className="gap-4 rounded-[28px] border border-border bg-surface p-5">
					<View className="flex-row items-start gap-3">
						<View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
							<Ionicons color="white" name="lock-closed" size={20} />
						</View>
						<View className="flex-1">
							<Text.Heading type="h5" weight="semibold">
								Upload to Vault
							</Text.Heading>
							<Text.Paragraph
								className="mt-1 leading-5"
								color="muted"
								type="body-sm"
							>
								Files are uploaded through Convex storage and saved with
								auth-scoped metadata.
							</Text.Paragraph>
						</View>
					</View>
					<View className="flex-row gap-3">
						<Button
							className="flex-1"
							isDisabled={isUploading}
							onPress={pickDocument}
							size="sm"
						>
							<Button.Label>Document</Button.Label>
						</Button>
						<Button
							className="flex-1"
							isDisabled={isUploading}
							onPress={pickPhoto}
							size="sm"
							variant="secondary"
						>
							<Button.Label>Photo</Button.Label>
						</Button>
					</View>
					{isUploading ? (
						<View className="flex-row items-center gap-2">
							<Spinner size="sm" />
							<Text color="muted" type="body-sm">
								Uploading...
							</Text>
						</View>
					) : null}
					{errorMessage ? (
						<Text className="text-danger" type="body-sm">
							{errorMessage}
						</Text>
					) : null}
				</Surface>

				<View className="gap-3">
					<Text.Heading type="h5" weight="semibold">
						Saved files
					</Text.Heading>
					{emptyFilesContent ?? savedFilesContent}
				</View>
			</View>
		</Container>
	);
}
