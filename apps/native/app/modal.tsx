import { router } from "expo-router";
import { View } from "react-native";

import {
	Card,
	EmptyState,
	PrimaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";

function Modal() {
	const { palette } = useUITheme();

	function handleClose() {
		router.back();
	}

	return (
		<View
			style={{
				backgroundColor: palette.canvas,
				flex: 1,
				justifyContent: "center",
				padding: spacing.screen,
			}}
		>
			<Card style={{ gap: spacing.lg }}>
				<EmptyState
					description="This is an example modal screen for dialogs and confirmations."
					icon="checkmark-circle-outline"
					title="Modal Screen"
				/>
				<PrimaryButton label="Close" onPress={handleClose} />
			</Card>
		</View>
	);
}

export default Modal;
