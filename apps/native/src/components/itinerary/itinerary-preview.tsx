import type { ItineraryItem } from "@viya-app/domain";
import { Surface, Text } from "heroui-native";
import { View } from "react-native";

interface ItineraryPreviewProps {
	items: ItineraryItem[];
}

export function ItineraryPreview({ items }: ItineraryPreviewProps) {
	return (
		<Surface className="gap-4 rounded-lg p-4" variant="secondary">
			<View>
				<Text
					className="uppercase"
					color="muted"
					type="body-xs"
					weight="semibold"
				>
					Upcoming itinerary
				</Text>
				<Text.Paragraph className="mt-1" color="muted" type="body-sm">
					The first trip blocks Viya is watching.
				</Text.Paragraph>
			</View>
			<View className="gap-3">
				{items.map((item) => (
					<View className="flex-row gap-3" key={item.id}>
						<View className="w-14">
							<Text type="body-sm" weight="semibold">
								{item.startTime}
							</Text>
							<Text color="muted" type="body-xs">
								{item.endTime}
							</Text>
						</View>
						<View className="flex-1 border-border border-l pl-3">
							<Text weight="semibold">{item.title}</Text>
							<Text.Paragraph
								className="mt-1 leading-5"
								color="muted"
								type="body-sm"
							>
								{item.aiReason}
							</Text.Paragraph>
						</View>
					</View>
				))}
			</View>
		</Surface>
	);
}
