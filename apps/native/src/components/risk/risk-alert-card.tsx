import { Ionicons } from "@expo/vector-icons";
import type { Risk } from "@viya-app/domain";
import { Chip, Surface } from "heroui-native";
import { Text, View } from "react-native";

interface RiskAlertCardProps {
	risk: Risk;
}

const severityColor = {
	critical: "danger",
	high: "warning",
	low: undefined,
	medium: undefined,
} as const;

export function RiskAlertCard({ risk }: RiskAlertCardProps) {
	return (
		<Surface className="gap-3 rounded-lg p-4" variant="secondary">
			<View className="flex-row items-start gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-lg bg-danger-soft">
					<Ionicons color="#ef4444" name="warning" size={20} />
				</View>
				<View className="flex-1 gap-2">
					<View className="flex-row items-center justify-between gap-2">
						<Text className="flex-1 font-semibold text-base text-foreground">
							{risk.title}
						</Text>
						<Chip
							color={severityColor[risk.severity]}
							size="sm"
							variant="secondary"
						>
							<Chip.Label>{risk.severity}</Chip.Label>
						</Chip>
					</View>
					<Text className="text-muted text-sm leading-5">{risk.message}</Text>
					<Text className="font-semibold text-foreground text-sm">
						{risk.suggestedAction}
					</Text>
				</View>
			</View>
		</Surface>
	);
}
