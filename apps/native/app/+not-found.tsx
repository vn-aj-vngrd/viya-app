import { useRouter } from "expo-router";

import { ScreenShell } from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";

export default function NotFoundScreen() {
	const router = useRouter();

	return (
		<ScreenShell
			state={{
				action: {
					label: "Back to trips",
					onPress: () => router.replace(VIYA_ROUTES.trips),
				},
				description: "This screen does not exist or has moved.",
				icon: "compass-outline",
				kind: "empty",
				title: "Page not found",
			}}
			title="Not found"
		/>
	);
}
