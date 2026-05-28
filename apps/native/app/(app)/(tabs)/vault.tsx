import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Link } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import { VIYA_ROUTES } from "@/src/constants/routes";

const syncedDocuments = ["Flight confirmation", "Hotel receipt"] as const;
const missingDocuments = ["Tour booking", "Valid ID copy"] as const;

function VaultDocumentRow({
	name,
	status,
}: {
	name: string;
	status: "missing" | "synced";
}) {
	const isSynced = status === "synced";

	return (
		<View className="flex-row items-center gap-3 py-3">
			<View
				className="h-9 w-9 items-center justify-center rounded-full"
				style={{ backgroundColor: isSynced ? "#E4F8EF" : "#FFF7ED" }}
			>
				<Ionicons
					color={isSynced ? "#059669" : "#E97816"}
					name={isSynced ? "checkmark" : "alert"}
					size={17}
				/>
			</View>
			<Text className="flex-1" type="body-sm" weight="medium">
				{name}
			</Text>
			<Text color="muted" type="body-xs" weight="semibold">
				{isSynced ? "Synced" : "Missing"}
			</Text>
		</View>
	);
}

export default function VaultTabScreen() {
	const trips = useQuery(api.trips.listTrips);
	const currentTrip = trips?.find((trip) => !trip.isDemo) ?? null;

	return (
		<Container className="px-4 pb-28">
			<View className="gap-5 py-4" style={{ alignSelf: "stretch" }}>
				<View
					className="flex-row items-center gap-4"
					style={{ alignSelf: "stretch" }}
				>
					<Text.Heading type="h2" weight="semibold">
						Vault
					</Text.Heading>
					<View style={{ marginLeft: "auto" }}>
						<AccountAvatarButton size={44} />
					</View>
				</View>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="gap-1">
						<Text.Heading type="h4" weight="semibold">
							Trip documents
						</Text.Heading>
						<Text.Paragraph className="leading-5" color="muted" type="body-sm">
							Keep confirmations, receipts, screenshots, and IDs where Viya can
							use them.
						</Text.Paragraph>
					</View>

					<View className="gap-2">
						<Text color="muted" type="body-xs" weight="semibold">
							SYNCED
						</Text>
						{syncedDocuments.map((item) => (
							<VaultDocumentRow key={item} name={item} status="synced" />
						))}
					</View>

					<View className="gap-2">
						<Text color="muted" type="body-xs" weight="semibold">
							MISSING
						</Text>
						{missingDocuments.map((item) => (
							<VaultDocumentRow key={item} name={item} status="missing" />
						))}
					</View>

					<Link
						asChild
						href={
							currentTrip
								? VIYA_ROUTES.tripVault(currentTrip._id)
								: VIYA_ROUTES.trips
						}
					>
						<Button isDisabled={trips === undefined}>
							<Button.Label>Open vault</Button.Label>
						</Button>
					</Link>
				</Surface>
			</View>
		</Container>
	);
}
