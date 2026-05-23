import { calculateReadinessScore, palawanDemoTrip } from "@viya-app/domain";
import { Chip, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { ReadinessScoreCard } from "@/src/components/readiness/readiness-score-card";

const statusColor = {
	blocked: "danger",
	done: "success",
	ignored: undefined,
	inProgress: undefined,
	todo: "warning",
} as const;

export default function TripReadinessScreen() {
	const readiness = calculateReadinessScore(palawanDemoTrip.readinessItems);

	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<View>
					<Text className="font-semibold text-3xl text-foreground">
						Readiness
					</Text>
					<Text className="mt-1 text-muted text-sm">
						Required trip work before departure.
					</Text>
				</View>
				<ReadinessScoreCard readiness={readiness} />
				{palawanDemoTrip.readinessItems.map((item) => (
					<Surface
						className="gap-2 rounded-lg p-4"
						key={item.id}
						variant="secondary"
					>
						<View className="flex-row items-start justify-between gap-3">
							<View className="flex-1">
								<Text className="font-semibold text-foreground text-lg">
									{item.title}
								</Text>
								<Text className="mt-1 text-muted text-sm leading-5">
									{item.description}
								</Text>
							</View>
							<Chip
								color={statusColor[item.status]}
								size="sm"
								variant="secondary"
							>
								<Chip.Label>{item.status}</Chip.Label>
							</Chip>
						</View>
						<Text className="text-muted text-xs">Due {item.dueDate}</Text>
						<Text className="text-muted text-xs leading-5">
							{item.aiReason}
						</Text>
					</Surface>
				))}
			</View>
		</Container>
	);
}
