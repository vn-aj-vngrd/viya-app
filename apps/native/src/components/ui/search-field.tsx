import { TextInput, View } from "react-native";

import { Icon } from "./icon";
import { metrics, radius, spacing, typeScale } from "./tokens";
import { useUITheme } from "./use-ui-theme";

const SEARCH_ICON_SIZE = 17;

export interface SearchFieldProps {
	accessibilityLabel?: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}

/** Opaque pill search field for in-content filtering. Never glass. */
export function SearchField({
	accessibilityLabel,
	onChangeText,
	placeholder,
	value,
}: SearchFieldProps) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: spacing.sm,
				minHeight: metrics.minTarget,
				paddingHorizontal: spacing.md,
			}}
		>
			<Icon name="search" size={SEARCH_ICON_SIZE} tone="secondary" />
			<TextInput
				accessibilityLabel={accessibilityLabel ?? placeholder}
				autoCapitalize="none"
				autoCorrect={false}
				clearButtonMode="while-editing"
				enablesReturnKeyAutomatically={true}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={palette.inkTertiary}
				returnKeyType="search"
				style={{
					color: palette.ink,
					flex: 1,
					fontSize: typeScale.body.fontSize,
				}}
				value={value}
			/>
		</View>
	);
}
