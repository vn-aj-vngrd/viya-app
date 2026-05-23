import { palawanDemoTrip } from "@viya-app/domain";
import { Surface } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";

const stats = [
	{ label: "Planned days", value: String(palawanDemoTrip.days.length) },
	{ label: "AI risks found", value: String(palawanDemoTrip.risks.length) },
	{ label: "Moments saved", value: String(palawanDemoTrip.moments.length) },
] as const;

export default function WrappedScreen() {
	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<View>
					<Text className="font-semibold text-3xl text-foreground">
						Trip Wrapped
					</Text>
					<Text className="mt-1 text-muted text-sm">
						A shareable recap surface for after the trip.
					</Text>
				</View>
				<Surface className="gap-4 rounded-lg p-5" variant="secondary">
					<Text className="font-semibold text-4xl text-foreground">
						{palawanDemoTrip.trip.title}
					</Text>
					<Text className="text-muted text-sm leading-5">
						Wrapped will combine moments, route highlights, spend summaries, and
						Viya-generated story cards.
					</Text>
					<View className="gap-3">
						{stats.map((stat) => (
							<View
								className="flex-row justify-between rounded-lg bg-content2 p-3"
								key={stat.label}
							>
								<Text className="text-muted text-sm">{stat.label}</Text>
								<Text className="font-semibold text-foreground text-lg">
									{stat.value}
								</Text>
							</View>
						))}
					</View>
				</Surface>
			</View>
		</Container>
	);
}
