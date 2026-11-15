import { TextInput, type TextInputProps, View } from "react-native";

import {
	AppText,
	metrics,
	radius,
	spacing,
	typeScale,
	useUITheme,
} from "@/src/components/ui";

interface TripTextFieldProps
	extends Omit<TextInputProps, "placeholderTextColor" | "style"> {
	errorText?: string;
	helperText?: string;
	isInvalid?: boolean;
	isRequired?: boolean;
	label: string;
}

/** Labeled, themed text input: opaque fill, hairline edge only when invalid. */
export function TripTextField({
	errorText,
	helperText,
	isInvalid,
	isRequired,
	label,
	...inputProps
}: TripTextFieldProps) {
	const { palette } = useUITheme();
	const showError = Boolean(isInvalid && errorText);

	return (
		<View style={{ gap: spacing.sm }}>
			<AppText
				style={{ paddingHorizontal: spacing.xs }}
				tone="secondary"
				variant="footnote"
			>
				{label}
				{isRequired ? <AppText tone="danger"> *</AppText> : null}
			</AppText>
			<TextInput
				accessibilityLabel={label}
				accessibilityState={{ disabled: inputProps.editable === false }}
				placeholderTextColor={palette.inkTertiary}
				selectionColor={palette.accent}
				style={{
					backgroundColor: palette.surface,
					borderColor: isInvalid ? palette.danger : "transparent",
					borderCurve: "continuous",
					borderRadius: radius.field,
					borderWidth: isInvalid ? 1 : 0,
					color: palette.ink,
					fontSize: typeScale.body.fontSize,
					minHeight: inputProps.multiline ? 88 : metrics.actionHeight,
					paddingHorizontal: spacing.lg,
					paddingVertical: inputProps.multiline ? spacing.md : 0,
					textAlignVertical: inputProps.multiline ? "top" : "center",
				}}
				{...inputProps}
			/>
			{showError ? (
				<AppText
					accessibilityLiveRegion="polite"
					style={{ paddingHorizontal: spacing.xs }}
					tone="danger"
					variant="footnote"
				>
					{errorText}
				</AppText>
			) : null}
			{!showError && helperText ? (
				<AppText
					style={{ paddingHorizontal: spacing.xs }}
					tone="secondary"
					variant="footnote"
				>
					{helperText}
				</AppText>
			) : null}
		</View>
	);
}
