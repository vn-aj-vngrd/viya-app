import { palawanDemoTrip } from "@viya-app/domain";
import { ImageBackground, Text, View } from "react-native";

import { Container } from "@/components/container";

export function MomentsScreen() {
	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<View>
					<Text className="font-semibold text-3xl text-foreground">
						Moments
					</Text>
					<Text className="mt-1 text-muted text-sm">
						Trip memories and highlights.
					</Text>
				</View>
				{palawanDemoTrip.moments.map((moment) => (
					<ImageBackground
						className="min-h-72 justify-end overflow-hidden rounded-lg bg-content2"
						imageStyle={{ borderRadius: 8 }}
						key={moment.id}
						source={{ uri: moment.photoUrl }}
					>
						<View className="gap-1 bg-background/80 p-4">
							<Text className="font-semibold text-foreground text-xl">
								{moment.title}
							</Text>
							<Text className="text-muted text-sm leading-5">
								{moment.caption}
							</Text>
							<Text className="text-muted text-xs">{moment.locationName}</Text>
						</View>
					</ImageBackground>
				))}
			</View>
		</Container>
	);
}
