import { ScrollView } from "react-native";

import { spacing } from "@/src/components/ui";
import {
	DESTINATION_CARD_WIDTH,
	DestinationCard,
	type DestinationCardItem,
} from "./destination-card";

export function DestinationCarousel({
	imageUrls,
	items,
	onPress,
}: {
	imageUrls: Record<string, string | undefined>;
	items: DestinationCardItem[];
	onPress: (key: string) => void;
}) {
	return (
		<ScrollView
			contentContainerStyle={{
				gap: spacing.md,
				paddingHorizontal: spacing.screen,
			}}
			decelerationRate="fast"
			horizontal={true}
			keyboardShouldPersistTaps="handled"
			showsHorizontalScrollIndicator={false}
			snapToAlignment="start"
			snapToInterval={DESTINATION_CARD_WIDTH + spacing.md}
		>
			{items.map((item) => (
				<DestinationCard
					imageUrl={imageUrls[item.imageKey]}
					item={item}
					key={item.key}
					onPress={onPress}
				/>
			))}
		</ScrollView>
	);
}
