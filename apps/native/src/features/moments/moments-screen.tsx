import { Ionicons } from "@expo/vector-icons";
import { Surface, Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";

export function MomentsScreen() {
	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4">
				<View>
					<Text.Heading type="h2" weight="semibold">
						Moments
					</Text.Heading>
					<Text.Paragraph className="mt-1" color="muted" type="body-sm">
						Photos, notes, ratings, receipts, and travel tips.
					</Text.Paragraph>
				</View>

				<Surface className="items-center gap-4 rounded-[30px] border border-border bg-surface p-6">
					<View className="h-16 w-16 items-center justify-center rounded-3xl bg-secondary-soft">
						<Ionicons color="#9333EA" name="images" size={30} />
					</View>
					<View className="items-center gap-2">
						<Text.Heading align="center" type="h3" weight="semibold">
							No memories yet
						</Text.Heading>
						<Text.Paragraph
							align="center"
							className="max-w-xs leading-5"
							color="muted"
							type="body-sm"
						>
							During a trip, Viya can attach photos, notes, receipts, ratings,
							and tips to the right itinerary moment.
						</Text.Paragraph>
					</View>
				</Surface>
			</View>
		</Container>
	);
}
