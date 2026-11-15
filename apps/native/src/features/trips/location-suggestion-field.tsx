import type { ComponentProps, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	type TextInput,
	View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	AppText,
	fadeIn,
	haptic,
	Icon,
	metrics,
	PressableScale,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import {
	getLocationSuggestionPanelState,
	type LocationSuggestionStatus,
} from "./location-suggestion-field-utils";
import { TripTextField } from "./trip-text-field";

interface LocationSuggestion {
	countryCode?: string;
	details?: string;
	id: string;
	label: string;
	latitude?: number;
	longitude?: number;
	value: string;
}

const locationSuggestionDebounceMs = 250;

interface LocationSuggestionFieldProps {
	errorText?: string;
	helperText?: string;
	isInvalid?: boolean;
	isRequired?: boolean;
	label: string;
	onChangeText: (value: string) => void;
	onSuggestionSelect?: (suggestion: LocationSuggestion) => void;
	placeholder: string;
	searchLocationSuggestions: (text: string) => Promise<LocationSuggestion[]>;
	value: string;
}

type InputBlurEvent = Parameters<
	NonNullable<ComponentProps<typeof TextInput>["onBlur"]>
>[0];
type InputFocusEvent = Parameters<
	NonNullable<ComponentProps<typeof TextInput>["onFocus"]>
>[0];

export function LocationSuggestionField({
	errorText,
	helperText,
	isInvalid,
	isRequired,
	label,
	onChangeText,
	onSuggestionSelect,
	placeholder,
	searchLocationSuggestions,
	value,
}: LocationSuggestionFieldProps) {
	const bottomSheetHandlers = useCompatibleBottomSheetAwareHandlers();
	const { palette } = useUITheme();
	const [isFocused, setIsFocused] = useState(false);
	const [selectedSuggestionValue, setSelectedSuggestionValue] = useState<
		string | null
	>(null);
	const [hasSearched, setHasSearched] = useState(false);
	const [status, setStatus] = useState<LocationSuggestionStatus>("idle");
	const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
	const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);
	const panelState = getLocationSuggestionPanelState({
		hasSearched,
		isFocused,
		selectedSuggestionValue,
		status,
		suggestionCount: suggestions.length,
		value,
	});

	useEffect(() => {
		if (!panelState.canSearch) {
			requestIdRef.current += 1;
			setHasSearched(false);
			setStatus("idle");
			setSuggestions([]);
			return;
		}

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		setHasSearched(false);
		setStatus("loading");
		setSuggestions([]);
		const timeoutId = setTimeout(() => {
			searchLocationSuggestions(panelState.trimmedValue)
				.then((nextSuggestions) => {
					if (requestIdRef.current === requestId) {
						setHasSearched(true);
						setSuggestions(nextSuggestions);
						setStatus("idle");
					}
				})
				.catch(() => {
					if (requestIdRef.current === requestId) {
						setHasSearched(true);
						setSuggestions([]);
						setStatus("error");
					}
				});
		}, locationSuggestionDebounceMs);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [
		panelState.canSearch,
		panelState.trimmedValue,
		searchLocationSuggestions,
	]);

	useEffect(
		() => () => {
			if (blurTimeoutRef.current) {
				clearTimeout(blurTimeoutRef.current);
			}
		},
		[]
	);

	const handleFocus = (event: InputFocusEvent) => {
		if (blurTimeoutRef.current) {
			clearTimeout(blurTimeoutRef.current);
		}
		bottomSheetHandlers.onFocus(event);
		setIsFocused(true);
	};

	const handleBlur = (event: InputBlurEvent) => {
		bottomSheetHandlers.onBlur(event);
		blurTimeoutRef.current = setTimeout(() => {
			setIsFocused(false);
		}, 120);
	};

	const handleChangeText = (nextValue: string) => {
		setSelectedSuggestionValue(null);
		onChangeText(nextValue);
	};

	const handleSuggestionPress = (suggestion: LocationSuggestion) => {
		haptic("selection");
		setSelectedSuggestionValue(suggestion.value);
		setSuggestions([]);
		setIsFocused(false);
		onChangeText(suggestion.value);
		onSuggestionSelect?.(suggestion);
	};

	return (
		<View style={{ gap: spacing.sm }}>
			<TripTextField
				autoCapitalize="words"
				errorText={errorText}
				helperText={helperText}
				isInvalid={isInvalid}
				isRequired={isRequired}
				label={label}
				onBlur={handleBlur}
				onChangeText={handleChangeText}
				onFocus={handleFocus}
				placeholder={placeholder}
				value={value}
			/>
			{panelState.shouldShowPanel ? (
				<Animated.View
					entering={fadeIn}
					style={{
						backgroundColor: palette.surface,
						borderCurve: "continuous",
						borderRadius: radius.card,
						overflow: "hidden",
					}}
				>
					{panelState.message === "loading" ? (
						<LocationSuggestionMessage
							icon={
								<ActivityIndicator color={palette.inkSecondary} size="small" />
							}
							text="Searching places"
						/>
					) : null}
					{panelState.message === "error" ? (
						<LocationSuggestionMessage
							icon={<Icon name="alert-circle-outline" tone="secondary" />}
							text="Suggestions are unavailable. You can keep what you typed."
						/>
					) : null}
					{panelState.message === "empty" ? (
						<LocationSuggestionMessage
							icon={<Icon name="search-outline" tone="secondary" />}
							text="No close matches. Keep typing or use what you typed."
						/>
					) : null}
					{suggestions.map((suggestion, index) => (
						<PressableScale
							accessibilityLabel={`Use ${suggestion.value}`}
							accessibilityRole="button"
							haptic="none"
							key={suggestion.id}
							onPress={() => handleSuggestionPress(suggestion)}
							scaleTo={0.99}
							style={{
								alignItems: "center",
								borderTopColor: palette.separator,
								borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
								flexDirection: "row",
								gap: spacing.md,
								minHeight: metrics.rowHeight,
								paddingHorizontal: spacing.lg,
								paddingVertical: spacing.sm,
							}}
						>
							<Icon name="location-outline" tone="secondary" />
							<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
								<AppText numberOfLines={1} variant="callout">
									{suggestion.label}
								</AppText>
								{suggestion.details ? (
									<AppText
										numberOfLines={1}
										tone="secondary"
										variant="footnote"
									>
										{suggestion.details}
									</AppText>
								) : null}
							</View>
							{suggestion.countryCode ? (
								<AppText tone="tertiary" variant="footnote">
									{suggestion.countryCode}
								</AppText>
							) : null}
						</PressableScale>
					))}
					{suggestions.length > 0 ? (
						<AppText
							style={{
								borderTopColor: palette.separator,
								borderTopWidth: StyleSheet.hairlineWidth,
								paddingHorizontal: spacing.lg,
								paddingVertical: spacing.sm,
							}}
							tone="tertiary"
							variant="footnote"
						>
							Suggestions by Geoapify
						</AppText>
					) : null}
				</Animated.View>
			) : null}
		</View>
	);
}

function LocationSuggestionMessage({
	icon,
	text,
}: {
	icon: ReactNode;
	text: string;
}) {
	return (
		<View
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.md,
				minHeight: metrics.rowHeight,
				paddingHorizontal: spacing.lg,
				paddingVertical: spacing.md,
			}}
		>
			{icon}
			<AppText style={{ flex: 1 }} tone="secondary" variant="subhead">
				{text}
			</AppText>
		</View>
	);
}
