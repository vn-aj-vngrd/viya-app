import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { Platform } from "react-native";

const ONBOARDING_STORAGE_KEY = "viya.onboarding.completed";

export const getCompletedOnboarding = async () => {
	if (Platform.OS === "web") {
		return globalThis.localStorage?.getItem(ONBOARDING_STORAGE_KEY) === "true";
	}

	return (await getItemAsync(ONBOARDING_STORAGE_KEY)) === "true";
};

export const setCompletedOnboarding = async () => {
	if (Platform.OS === "web") {
		globalThis.localStorage?.setItem(ONBOARDING_STORAGE_KEY, "true");
		return;
	}

	await setItemAsync(ONBOARDING_STORAGE_KEY, "true");
};

export const resetCompletedOnboarding = async () => {
	if (Platform.OS === "web") {
		globalThis.localStorage?.removeItem(ONBOARDING_STORAGE_KEY);
		return;
	}

	await deleteItemAsync(ONBOARDING_STORAGE_KEY);
};
