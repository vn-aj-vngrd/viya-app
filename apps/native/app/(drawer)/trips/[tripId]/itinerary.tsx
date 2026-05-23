import { palawanDemoTrip } from "@viya-app/domain";
import { Chip, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";

export default function TripItineraryScreen() {
	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<View>
					<Text className="font-semibold text-3xl text-foreground">
						Itinerary
					</Text>
					<Text className="mt-1 text-muted text-sm">
						Day plans, timing, cost, and AI rationale.
					</Text>
				</View>
				{palawanDemoTrip.days.map((day) => {
					const dayItems = palawanDemoTrip.items.filter(
						(item) => item.dayId === day.id
					);

					return (
						<Surface
							className="gap-4 rounded-lg p-4"
							key={day.id}
							variant="secondary"
						>
							<View className="flex-row items-start justify-between gap-3">
								<View className="flex-1">
									<Text className="font-semibold text-muted text-xs uppercase">
										Day {day.dayNumber} · {day.date}
									</Text>
									<Text className="mt-1 font-semibold text-foreground text-xl">
										{day.title}
									</Text>
									<Text className="mt-1 text-muted text-sm leading-5">
										{day.summary}
									</Text>
								</View>
								<Chip size="sm" variant="secondary">
									<Chip.Label>{day.pace}</Chip.Label>
								</Chip>
							</View>
							<View className="gap-3">
								{dayItems.map((item) => (
									<View className="rounded-lg bg-content2 p-3" key={item.id}>
										<Text className="font-semibold text-foreground">
											{item.startTime} · {item.title}
										</Text>
										<Text className="mt-1 text-muted text-sm">
											{item.description}
										</Text>
										<Text className="mt-2 text-muted text-xs">
											{item.aiReason}
										</Text>
									</View>
								))}
							</View>
						</Surface>
					);
				})}
			</View>
		</Container>
	);
}
