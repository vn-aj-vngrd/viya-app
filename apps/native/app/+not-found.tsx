import { Link, Stack } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";

export default function NotFoundScreen() {
	return (
		<>
			<Stack.Screen options={{ title: "Not Found" }} />
			<Container>
				<View className="flex-1 items-center justify-center p-4">
					<Surface
						className="max-w-sm items-center rounded-lg p-6"
						variant="secondary"
					>
						<Text className="mb-3 text-4xl">🤔</Text>
						<Text.Heading className="mb-1" type="h5" weight="medium">
							Page Not Found
						</Text.Heading>
						<Text.Paragraph
							align="center"
							className="mb-4"
							color="muted"
							type="body-sm"
						>
							The page you're looking for doesn't exist.
						</Text.Paragraph>
						<Link asChild href="/">
							<Button size="sm">Go Home</Button>
						</Link>
					</Surface>
				</View>
			</Container>
		</>
	);
}
