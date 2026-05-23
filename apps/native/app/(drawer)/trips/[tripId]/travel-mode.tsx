import { getUpcomingItineraryItems, palawanDemoTrip } from "@viya-app/domain";
import { Button, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";

export default function TravelModeScreen() {
	const currentItem = getUpcomingItineraryItems(palawanDemoTrip, 1)[0];

	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<View>
					<Text className="font-semibold text-3xl text-foreground">
						Travel Mode
					</Text>
					<Text className="mt-1 text-muted text-sm">
						Day-of controls and contextual help.
					</Text>
				</View>
				<Surface className="gap-4 rounded-lg p-4" variant="secondary">
					<Text className="font-semibold text-muted text-xs uppercase">
						Now
					</Text>
					<Text className="font-semibold text-2xl text-foreground">
						{currentItem.title}
					</Text>
					<Text className="text-muted text-sm leading-5">
						{currentItem.description}
					</Text>
					<View className="rounded-lg bg-content2 p-3">
						<Text className="font-semibold text-foreground text-sm">
							Viya note
						</Text>
						<Text className="mt-1 text-muted text-sm leading-5">
							{currentItem.aiReason}
						</Text>
					</View>
					<View className="flex-row gap-3">
						<Button className="flex-1" size="sm">
							<Button.Label>Mark done</Button.Label>
						</Button>
						<Button className="flex-1" size="sm" variant="secondary">
							<Button.Label>Ask Viya</Button.Label>
						</Button>
					</View>
				</Surface>
			</View>
		</Container>
	);
}
