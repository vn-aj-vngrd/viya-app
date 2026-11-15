import { api } from "@viya-app/backend/convex/_generated/api";
import type { SpecialNeed, TravelInterest } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import {
	getNextMultiPreferenceValues,
	getTravelPreferenceState,
	type MultiTravelPreferenceKey,
	type SingleTravelPreferenceKey,
	type TravelPreferenceKey,
	type TravelPreferenceState,
} from "./travel-preferences";

/** Reads and saves the traveller's preferences; local state keeps taps instant. */
export function useTravelPreferences() {
	const currentPreferences = useQuery(api.preferences.getCurrentPreferences);
	const savePreferences = useMutation(api.preferences.upsertCurrentPreferences);
	const [savingKey, setSavingKey] = useState<TravelPreferenceKey | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [travelPreferences, setTravelPreferences] =
		useState<TravelPreferenceState | null>(null);

	useEffect(() => {
		if (currentPreferences === undefined) {
			return;
		}

		setTravelPreferences(getTravelPreferenceState(currentPreferences));
	}, [currentPreferences]);

	const preferences =
		currentPreferences === undefined
			? undefined
			: (travelPreferences ?? getTravelPreferenceState(currentPreferences));

	const persist = async (
		next: TravelPreferenceState,
		key: TravelPreferenceKey
	) => {
		setTravelPreferences(next);
		setError(null);
		setSavingKey(key);

		try {
			await savePreferences({
				budgetPreference: next.budgetPreference,
				foodPreference: next.foodPreference,
				groupPreference: next.groupPreference,
				interests: next.interests,
				pacePreference: next.pacePreference,
				planningStyle: next.planningStyle,
				specialNeeds: next.specialNeeds,
				specialNeedsNote: next.specialNeedsNote.trim() || undefined,
				travelStyle: next.travelStyle,
			});
		} catch (caught) {
			setTravelPreferences(getTravelPreferenceState(currentPreferences));
			setError(
				caught instanceof Error
					? caught.message
					: "Viya could not save your preferences."
			);
		} finally {
			setSavingKey(null);
		}
	};

	const selectSingle = async (
		key: SingleTravelPreferenceKey,
		value: string
	) => {
		if (savingKey || !preferences) {
			return;
		}

		await persist(
			{ ...preferences, [key]: value } as TravelPreferenceState,
			key
		);
	};

	const toggleMulti = async (key: MultiTravelPreferenceKey, value: string) => {
		if (savingKey || !preferences) {
			return;
		}

		const nextValues = getNextMultiPreferenceValues(
			key,
			preferences[key],
			value
		);
		const next =
			key === "interests"
				? { ...preferences, interests: nextValues as TravelInterest[] }
				: {
						...preferences,
						specialNeeds: nextValues as SpecialNeed[],
						specialNeedsNote:
							nextValues.length === 0 ? "" : preferences.specialNeedsNote,
					};

		await persist(next, key);
	};

	return { error, preferences, savingKey, selectSingle, toggleMulti };
}
