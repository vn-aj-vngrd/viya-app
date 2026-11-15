import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";

import {
	AppText,
	haptic,
	Icon,
	ListGroup,
	ListRow,
	ScreenShell,
	useUITheme,
} from "@/src/components/ui";
import {
	type MultiTravelPreferenceKey,
	type SingleTravelPreferenceKey,
	travelPreferenceGroups,
} from "@/src/features/profile/travel-preferences";
import { useTravelPreferences } from "@/src/features/profile/use-travel-preferences";

const CHECK_SIZE = 17;

export default function TravelOptionScreen() {
	const { key } = useLocalSearchParams<{ key?: string }>();
	const { palette } = useUITheme();
	const { error, preferences, savingKey, selectSingle, toggleMulti } =
		useTravelPreferences();
	const [lastTapped, setLastTapped] = useState<string | null>(null);
	const group = travelPreferenceGroups.find((item) => item.key === key);

	useEffect(() => {
		if (error) {
			haptic("error");
		}
	}, [error]);

	if (!group) {
		return (
			<ScreenShell
				state={{
					description: "Go back and choose a preference.",
					icon: "alert-circle-outline",
					kind: "empty",
					title: "Preference not found",
				}}
				title="Preference"
			/>
		);
	}

	if (!preferences) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading preferences" }}
				title={group.title}
			/>
		);
	}

	const selectedValue = preferences[group.key];
	const isMulti = group.mode === "multi";

	return (
		<ScreenShell title={group.title}>
			{error ? (
				<AppText tone="danger" variant="footnote">
					{error}
				</AppText>
			) : null}
			<ListGroup footer={isMulti ? "Choose any that apply." : undefined}>
				{group.options.map((option) => {
					const selected = Array.isArray(selectedValue)
						? (selectedValue as readonly string[]).includes(option.value)
						: selectedValue === option.value;
					const isSaving =
						savingKey === group.key && lastTapped === option.value;
					const handlePress = () => {
						setLastTapped(option.value);
						if (isMulti) {
							toggleMulti(group.key as MultiTravelPreferenceKey, option.value);
						} else {
							selectSingle(
								group.key as SingleTravelPreferenceKey,
								option.value
							);
						}
					};

					let trailing: React.ReactNode;
					if (isSaving) {
						trailing = <ActivityIndicator color={palette.inkSecondary} />;
					} else if (selected) {
						trailing = (
							<Icon
								name="checkmark"
								size={CHECK_SIZE}
								tone="accent"
								weight="semibold"
							/>
						);
					}

					return (
						<ListRow
							accessibilityLabel={`${option.label}${selected ? ", selected" : ""}`}
							key={option.value}
							onPress={savingKey ? undefined : handlePress}
							showChevron={false}
							subtitle={option.description}
							title={option.label}
							trailing={trailing}
						/>
					);
				})}
			</ListGroup>
		</ScreenShell>
	);
}
