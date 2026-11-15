import { TextInput, type TextInputProps, View } from "react-native";

import { AppText, radius, useUITheme } from "@/src/components/ui";

interface TripTextFieldProps
	extends Omit<TextInputProps, "placeholderTextColor" | "style"> {
	errorText?: string;
	helperText?: string;
	isInvalid?: boolean;
	isRequired?: boolean;
	label: string;
}

/** Labeled, themed text input: opaque fill, no border unless invalid. */
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
		<View style={{ gap: 8 }}>
			<AppText bold variant="subhead">
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
					fontSize: 17,
					minHeight: inputProps.multiline ? 88 : 50,
					paddingHorizontal: 16,
					paddingVertical: inputProps.multiline ? 12 : 0,
					textAlignVertical: inputProps.multiline ? "top" : "center",
				}}
				{...inputProps}
			/>
			{showError ? (
				<AppText
					accessibilityLiveRegion="polite"
					tone="danger"
					variant="footnote"
				>
					{errorText}
				</AppText>
			) : null}
			{!showError && helperText ? (
				<AppText tone="secondary" variant="footnote">
					{helperText}
				</AppText>
			) : null}
		</View>
	);
}
