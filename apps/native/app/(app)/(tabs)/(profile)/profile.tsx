import { useClerk, useUser } from "@clerk/expo";
import { api } from "@viya-app/backend/convex/_generated/api";
import {
	getTripPhase,
	pacePreferenceOptions,
	travelStyleOptions,
} from "@viya-app/domain";
import { useQuery } from "convex/react";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import {
	Icon,
	type IconName,
	ListGroup,
	ListRow,
	ScreenShell,
	spacing,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { PersonalInfoSheet } from "@/src/features/profile/personal-info-sheet";
import { ProfileAvatar } from "@/src/features/profile/profile-avatar";
import {
	getOptionLabel,
	getTravelPreferenceState,
} from "@/src/features/profile/travel-preferences";
import { formatCount, toLocalDateKey } from "@/src/lib/format";

const AVATAR_ROW_SIZE = 56;
const ROW_ICON_SIZE = 20;
const themeLabels = { dark: "Dark", light: "Light", system: "System" } as const;

function RowIcon({ name }: { name: IconName }) {
	return (
		<View style={{ alignItems: "center", width: spacing.xl }}>
			<Icon name={name} size={ROW_ICON_SIZE} tone="secondary" />
		</View>
	);
}

export default function ProfileScreen() {
	const { signOut } = useClerk();
	const { user } = useUser();
	const router = useRouter();
	const { palette } = useUITheme();
	const { confirm } = useFeedback();
	const { themePreference } = useAppTheme();
	const currentPreferences = useQuery(api.preferences.getCurrentPreferences);
	const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const trips = useQuery(api.trips.listTrips);
	const primaryEmail = user?.emailAddresses[0]?.emailAddress;
	const displayName =
		user?.fullName || user?.username || primaryEmail || "Your account";
	const preferenceState = getTravelPreferenceState(currentPreferences);
	const travelPreferenceValue = `${getOptionLabel(
		travelStyleOptions,
		preferenceState.travelStyle
	)} · ${getOptionLabel(pacePreferenceOptions, preferenceState.pacePreference)}`;
	const realTrips = trips?.filter((trip) => !trip.isDemo) ?? [];
	const todayKey = toLocalDateKey();
	const activeTripCount = realTrips.filter((trip) => {
		const phase = getTripPhase(trip, todayKey);

		return phase === "upcoming" || phase === "during" || phase === "undated";
	}).length;
	const pastTripCount = realTrips.length - activeTripCount;

	const handleSignOutRequest = async () => {
		const isConfirmed = await confirm({
			confirmLabel: "Sign out",
			destructive: true,
			message: "You will need to sign in again on this device.",
			title: "Sign out",
		});

		if (!isConfirmed) {
			return;
		}

		setIsSigningOut(true);
		try {
			await signOut();
			router.replace("/(auth)");
		} finally {
			setIsSigningOut(false);
		}
	};

	return (
		<ScreenShell
			sheets={
				<PersonalInfoSheet
					isOpen={isPersonalInfoOpen}
					onOpenChange={setIsPersonalInfoOpen}
				/>
			}
			title="Profile"
			titleMode="large"
		>
			<ListGroup>
				<ListRow
					accessibilityLabel={`${displayName}, edit name and photo`}
					leading={
						<ProfileAvatar
							imageUrl={user?.imageUrl}
							name={displayName}
							size={AVATAR_ROW_SIZE}
						/>
					}
					onPress={() => setIsPersonalInfoOpen(true)}
					subtitle={primaryEmail}
					subtitleLines={1}
					title={displayName}
					titleLines={1}
				/>
			</ListGroup>

			{trips ? (
				<ListGroup header="Trips">
					<ListRow
						accessibilityLabel={`Trips, ${formatCount(realTrips.length, "trip")}`}
						leading={<RowIcon name="briefcase-outline" />}
						onPress={() => router.push(VIYA_ROUTES.trips)}
						subtitle={`${activeTripCount} upcoming · ${pastTripCount} past`}
						title="Trips"
						value={formatCount(realTrips.length, "trip")}
					/>
				</ListGroup>
			) : null}

			<ListGroup header="Preferences">
				<ListRow
					leading={<RowIcon name="map-outline" />}
					onPress={() => router.push(VIYA_ROUTES.profileTravel)}
					title="Travel preferences"
					value={travelPreferenceValue}
				/>
				<ListRow
					leading={<RowIcon name="moon" />}
					onPress={() => router.push(VIYA_ROUTES.profileAppearance)}
					title="Appearance"
					value={themeLabels[themePreference]}
				/>
			</ListGroup>

			<ListGroup header="About">
				<ListRow
					showChevron={false}
					title="Version"
					value={Constants.expoConfig?.version ?? "Unknown"}
				/>
			</ListGroup>

			<ListGroup footer="Signing out only affects this device.">
				<ListRow
					destructive={true}
					onPress={isSigningOut ? undefined : handleSignOutRequest}
					showChevron={false}
					title={isSigningOut ? "Signing out" : "Sign out"}
					trailing={
						isSigningOut ? (
							<ActivityIndicator color={palette.inkSecondary} />
						) : undefined
					}
				/>
			</ListGroup>
		</ScreenShell>
	);
}
