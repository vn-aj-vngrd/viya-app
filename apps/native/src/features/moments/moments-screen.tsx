import { View } from "react-native";

import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import { CollapsingScreen, EmptyState, spacing } from "@/src/components/ui";

const TAB_BAR_CLEARANCE = 112;

export function MomentsScreen() {
	return (
		<CollapsingScreen
			contentContainerStyle={{
				flexGrow: 1,
				paddingBottom: TAB_BAR_CLEARANCE,
				paddingHorizontal: spacing.screen,
			}}
			title="Moments"
			trailing={<AccountAvatarButton size={44} />}
		>
			<View style={{ flex: 1, minHeight: 360 }}>
				<EmptyState
					description="During a trip, Viya can attach photos, notes, receipts, ratings, and tips to the right moment."
					icon="images-outline"
					title="No memories yet"
				/>
			</View>
		</CollapsingScreen>
	);
}
