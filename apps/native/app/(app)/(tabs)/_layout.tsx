import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useUITheme } from "@/src/components/ui";
import { rememberContentTab } from "@/src/features/viya/ask-viya-launch";

export const unstable_settings = { initialRouteName: "(discover)" };

export default function TabLayout() {
	const { palette } = useUITheme();

	return (
		<NativeTabs
			backgroundColor={Platform.OS === "android" ? palette.surface : undefined}
			labelVisibilityMode="unlabeled"
			minimizeBehavior="onScrollDown"
			screenListeners={({ route }) => ({
				focus: () => rememberContentTab(route.name),
			})}
			tintColor={palette.accent}
		>
			<NativeTabs.Trigger
				name="(discover)"
				unstable_nativeProps={{ tabBarItemAccessibilityLabel: "Discover" }}
			>
				<NativeTabs.Trigger.Icon
					md="explore"
					sf={{ default: "safari", selected: "safari.fill" }}
				/>
				<NativeTabs.Trigger.Label hidden={true} />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger
				name="(trips)"
				unstable_nativeProps={{ tabBarItemAccessibilityLabel: "Trips" }}
			>
				<NativeTabs.Trigger.Icon
					md="luggage"
					sf={{ default: "suitcase", selected: "suitcase.fill" }}
				/>
				<NativeTabs.Trigger.Label hidden={true} />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger
				name="(vault)"
				unstable_nativeProps={{ tabBarItemAccessibilityLabel: "Vault" }}
			>
				<NativeTabs.Trigger.Icon
					md="wallet"
					sf={{ default: "wallet.pass", selected: "wallet.pass.fill" }}
				/>
				<NativeTabs.Trigger.Label hidden={true} />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger
				name="(profile)"
				unstable_nativeProps={{ tabBarItemAccessibilityLabel: "Profile" }}
			>
				<NativeTabs.Trigger.Icon
					md="account_circle"
					sf={{
						default: "person.crop.circle",
						selected: "person.crop.circle.fill",
					}}
				/>
				<NativeTabs.Trigger.Label hidden={true} />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger
				name="viya"
				role="search"
				unstable_nativeProps={{ tabBarItemAccessibilityLabel: "Ask Viya" }}
			>
				<NativeTabs.Trigger.Icon md="auto_awesome" sf="sparkles" />
				<NativeTabs.Trigger.Label hidden={true} />
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}
