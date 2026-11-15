import { Ionicons } from "@expo/vector-icons";
import type { Risk } from "@viya-app/domain";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AppText, Card, Chip, radius, useUITheme } from "@/src/components/ui";

interface RiskAlertCardProps {
	risk: Risk;
}

export function RiskAlertCard({ risk }: RiskAlertCardProps) {
	const { palette } = useUITheme();
	const severe = risk.severity === "critical" || risk.severity === "high";
	const tint = risk.severity === "critical" ? palette.danger : palette.warning;

	return (
		<Animated.View entering={FadeInDown.duration(220)}>
			<Card padding="md">
				<View
					style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}
				>
					<View
						style={{
							alignItems: "center",
							backgroundColor: palette.fill,
							borderRadius: radius.tile,
							height: 40,
							justifyContent: "center",
							width: 40,
						}}
					>
						<Ionicons
							color={severe ? tint : palette.inkSecondary}
							name="warning"
							size={20}
						/>
					</View>
					<View style={{ flex: 1, gap: 8 }}>
						<View
							style={{
								alignItems: "center",
								flexDirection: "row",
								gap: 8,
								justifyContent: "space-between",
							}}
						>
							<AppText style={{ flex: 1 }} variant="headline">
								{risk.title}
							</AppText>
							<Chip label={risk.severity} />
						</View>
						<AppText tone="secondary" variant="subhead">
							{risk.message}
						</AppText>
						<AppText bold variant="subhead">
							{risk.suggestedAction}
						</AppText>
					</View>
				</View>
			</Card>
		</Animated.View>
	);
}
