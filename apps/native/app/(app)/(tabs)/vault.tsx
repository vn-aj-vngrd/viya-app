import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import {
	AppText,
	CollapsingScreen,
	ListGroup,
	ListRow,
	PrimaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";

const syncedDocuments = ["Flight confirmation", "Hotel receipt"] as const;
const missingDocuments = ["Tour booking", "Valid ID copy"] as const;
const TAB_BAR_CLEARANCE = 112;
const STATUS_ICON_SIZE = 32;

function DocumentStatusIcon({ status }: { status: "missing" | "synced" }) {
	const { palette } = useUITheme();
	const isSynced = status === "synced";
	const tone = isSynced ? palette.success : palette.warning;

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: STATUS_ICON_SIZE / 2,
				height: STATUS_ICON_SIZE,
				justifyContent: "center",
				width: STATUS_ICON_SIZE,
			}}
		>
			<Ionicons
				color={tone}
				name={isSynced ? "checkmark" : "alert"}
				size={17}
			/>
		</View>
	);
}

export default function VaultTabScreen() {
	const router = useRouter();
	const trips = useQuery(api.trips.listTrips);
	const currentTrip = trips?.find((trip) => !trip.isDemo) ?? null;

	return (
		<CollapsingScreen
			contentContainerStyle={{
				gap: spacing.section,
				paddingBottom: TAB_BAR_CLEARANCE,
				paddingHorizontal: spacing.screen,
			}}
			title="Vault"
			trailing={<AccountAvatarButton size={44} />}
		>
			<Animated.View
				entering={FadeInDown.duration(260)}
				style={{ gap: spacing.section }}
			>
				<AppText tone="secondary" variant="callout">
					Keep confirmations, receipts, screenshots, and IDs where Viya can use
					them.
				</AppText>

				<ListGroup header="Synced">
					{syncedDocuments.map((item) => (
						<ListRow
							key={item}
							leading={<DocumentStatusIcon status="synced" />}
							title={item}
							value="Synced"
						/>
					))}
				</ListGroup>

				<ListGroup header="Missing">
					{missingDocuments.map((item) => (
						<ListRow
							key={item}
							leading={<DocumentStatusIcon status="missing" />}
							title={item}
							value="Missing"
						/>
					))}
				</ListGroup>

				<PrimaryButton
					disabled={trips === undefined}
					label="Open vault"
					onPress={() =>
						router.push(
							currentTrip
								? VIYA_ROUTES.tripVault(currentTrip._id)
								: VIYA_ROUTES.trips
						)
					}
				/>
			</Animated.View>
		</CollapsingScreen>
	);
}
