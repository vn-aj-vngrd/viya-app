import { useRouter } from "expo-router";

import { AppText, ListGroup, ListRow, ScreenShell } from "@/src/components/ui";
import {
	getTravelPreferenceDisplayValue,
	travelPreferenceCategories,
	travelPreferenceGroups,
} from "@/src/features/profile/travel-preferences";
import { useTravelPreferences } from "@/src/features/profile/use-travel-preferences";

export default function TravelPreferencesScreen() {
	const router = useRouter();
	const { error, preferences } = useTravelPreferences();

	if (!preferences) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading preferences" }}
				title="Travel preferences"
			/>
		);
	}

	return (
		<ScreenShell title="Travel preferences">
			{error ? (
				<AppText tone="danger" variant="footnote">
					{error}
				</AppText>
			) : null}
			{travelPreferenceCategories.map((category) => (
				<ListGroup header={category} key={category}>
					{travelPreferenceGroups
						.filter((group) => group.category === category)
						.map((group) => (
							<ListRow
								key={group.key}
								onPress={() =>
									router.push({
										params: { key: group.key },
										pathname: "/(app)/profile/travel-option",
									})
								}
								title={group.title}
								value={getTravelPreferenceDisplayValue({ group, preferences })}
							/>
						))}
				</ListGroup>
			))}
		</ScreenShell>
	);
}
