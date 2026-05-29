import { Spinner } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";

export function ScreenLoadingState() {
	return (
		<Container className="px-4 pb-28" isScrollable={false}>
			<View className="flex-1 items-center justify-center">
				<Spinner />
			</View>
		</Container>
	);
}
