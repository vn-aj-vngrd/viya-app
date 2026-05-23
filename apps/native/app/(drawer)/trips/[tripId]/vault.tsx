import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button, Spinner, Surface } from "heroui-native";
import { Text, View } from "react-native";

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
			<Surface className="rounded-lg p-4" variant="secondary">
				<Text className="font-semibold text-foreground">No files yet</Text>
				<Text className="mt-1 text-muted text-sm leading-5">
					Add a booking, travel document, receipt, or photo to exercise the
					Vault pipeline.
				</Text>
			</Surface>
		) : null;

	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<View>
					<Text className="font-semibold text-3xl text-foreground">
						Viya Vault
					</Text>
					<Text className="mt-1 text-muted text-sm">
						Secure storage for bookings, travel documents, receipts, and trip
						photos.
					</Text>
				</View>

				<Surface className="gap-4 rounded-lg p-4" variant="secondary">
					<View className="flex-row items-start gap-3">
						<View className="h-11 w-11 items-center justify-center rounded-lg bg-primary">
							<Ionicons color="white" name="lock-closed" size={20} />
						</View>
						<View className="flex-1">
							<Text className="font-semibold text-foreground text-lg">
								Upload to Vault
							</Text>
							<Text className="mt-1 text-muted text-sm leading-5">
								Files are uploaded through Convex storage and saved with
								auth-scoped metadata.
							</Text>
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
							<Text className="text-muted text-sm">Uploading...</Text>
						</View>
					) : null}
					{errorMessage ? (
						<Text className="text-danger text-sm">{errorMessage}</Text>
					) : null}
				</Surface>

				<View className="gap-3">
					<Text className="font-semibold text-foreground text-lg">
						Saved files
					</Text>
					{emptyFilesContent ?? savedFilesContent}
				</View>
			</View>
		</Container>
	);
}
