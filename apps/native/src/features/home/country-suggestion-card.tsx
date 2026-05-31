import { Ionicons } from "@expo/vector-icons";
import type { PreferenceCountrySuggestion } from "@viya-app/domain";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Surface, Text } from "heroui-native";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

const imageTransitionMs = 320;
const imageFillStyle = StyleSheet.absoluteFill;
const scrimColors = ["rgba(0,0,0,0)", "rgba(0,0,0,0.18)"] as const;

export function CountrySuggestionCard({
	country,
	imageUrl,
	onPress,
}: {
	country: PreferenceCountrySuggestion;
	imageUrl?: string;
	onPress: (prompt: string) => void;
}) {
	return (
		<Pressable
			accessibilityLabel={`Explore ${country.country}`}
			accessibilityRole="button"
			className="w-56"
			onPress={() => onPress(country.prompt)}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.99 : 1 }],
			})}
		>
			<Surface className="gap-0 overflow-hidden rounded-3xl border border-border bg-surface p-0">
				<View className="h-32 w-full">
					<View
						className="absolute inset-0 items-center justify-center"
						style={{ backgroundColor: `${country.accent}1A` }}
					>
						<Ionicons
							color={country.accent}
							name={country.icon as IconName}
							size={26}
						/>
					</View>
					{imageUrl ? (
						<Image
							cachePolicy="memory-disk"
							contentFit="cover"
							source={{ uri: imageUrl }}
							style={imageFillStyle}
							transition={imageTransitionMs}
						/>
					) : null}
					<LinearGradient
						colors={scrimColors}
						style={{
							bottom: 0,
							height: 48,
							left: 0,
							position: "absolute",
							right: 0,
						}}
					/>
				</View>
				<View className="gap-2 p-4">
					<Text numberOfLines={1} type="body" weight="semibold">
						{country.country}
					</Text>
					<Text color="muted" numberOfLines={2} type="body-sm">
						{country.detail}
					</Text>
					<View className="mt-1 flex-row">
						<View className="rounded-full bg-surface-secondary px-2.5 py-1">
							<Text color="muted" type="body-xs" weight="semibold">
								{country.duration}
							</Text>
						</View>
					</View>
				</View>
			</Surface>
		</Pressable>
	);
}
