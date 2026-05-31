import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const StyledIonicons = withUniwind(Ionicons);

export function ThemeToggle() {
	return (
		<View className="px-2.5">
			<StyledIonicons className="text-foreground" name="sunny" size={20} />
		</View>
	);
}
