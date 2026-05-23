import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Button, Surface, Text, useThemeColor } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";

function Modal() {
	const accentForegroundColor = useThemeColor("accent-foreground");

	function handleClose() {
		router.back();
	}

	return (
		<Container>
			<View className="flex-1 items-center justify-center p-4">
				<Surface className="w-full max-w-sm rounded-lg p-5" variant="secondary">
					<View className="items-center">
						<View className="mb-3 h-12 w-12 items-center justify-center rounded-lg bg-accent">
							<Ionicons
								color={accentForegroundColor}
								name="checkmark"
								size={24}
							/>
						</View>
						<Text.Heading className="mb-1" type="h5" weight="medium">
							Modal Screen
						</Text.Heading>
						<Text.Paragraph
							align="center"
							className="mb-4"
							color="muted"
							type="body-sm"
						>
							This is an example modal screen for dialogs and confirmations.
						</Text.Paragraph>
					</View>
					<Button className="w-full" onPress={handleClose} size="sm">
						<Button.Label>Close</Button.Label>
					</Button>
				</Surface>
			</View>
		</Container>
	);
}

export default Modal;
