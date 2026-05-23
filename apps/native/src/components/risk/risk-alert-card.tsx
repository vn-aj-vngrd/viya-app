import { Ionicons } from "@expo/vector-icons";
import type { Risk } from "@viya-app/domain";
import { Chip, Surface, Text } from "heroui-native";
import { View } from "react-native";

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
						<Text className="flex-1" weight="semibold">
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
					<Text.Paragraph className="leading-5" color="muted" type="body-sm">
						{risk.message}
					</Text.Paragraph>
					<Text type="body-sm" weight="semibold">
						{risk.suggestedAction}
					</Text>
				</View>
			</View>
		</Surface>
	);
}
