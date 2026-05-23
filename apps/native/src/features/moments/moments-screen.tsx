import { Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";

export function MomentsScreen() {
	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4">
				<View>
					<Text.Heading type="h2" weight="semibold">
						Moments
					</Text.Heading>
				</View>

				<EmptyState
					description="During a trip, Viya can attach photos, notes, receipts, ratings, and tips to the right moment."
					icon="images-outline"
					title="No memories yet"
				/>
			</View>
		</Container>
	);
}
