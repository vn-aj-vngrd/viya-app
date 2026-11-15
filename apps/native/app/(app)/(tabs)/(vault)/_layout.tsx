import { Stack } from "expo-router";

import { useShellScreenOptions } from "@/src/components/ui";

export default function TabStackLayout() {
	const screenOptions = useShellScreenOptions();

	return <Stack screenOptions={screenOptions} />;
}
