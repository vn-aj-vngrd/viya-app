import type { ItineraryItem } from "@viya-app/domain";
import { Surface } from "heroui-native";
import { Text, View } from "react-native";

interface ItineraryPreviewProps {
	items: ItineraryItem[];
}

export function ItineraryPreview({ items }: ItineraryPreviewProps) {
	return (
		<Surface className="gap-4 rounded-lg p-4" variant="secondary">
			<View>
				<Text className="font-semibold text-muted text-xs uppercase">
					Upcoming itinerary
				</Text>
				<Text className="mt-1 text-muted text-sm">
					The first trip blocks Viya is watching.
				</Text>
			</View>
			<View className="gap-3">
				{items.map((item) => (
					<View className="flex-row gap-3" key={item.id}>
						<View className="w-14">
							<Text className="font-semibold text-foreground text-sm">
								{item.startTime}
							</Text>
							<Text className="text-muted text-xs">{item.endTime}</Text>
						</View>
						<View className="flex-1 border-border border-l pl-3">
							<Text className="font-semibold text-foreground">
								{item.title}
							</Text>
							<Text className="mt-1 text-muted text-sm leading-5">
								{item.aiReason}
							</Text>
						</View>
					</View>
				))}
			</View>
		</Surface>
	);
}
