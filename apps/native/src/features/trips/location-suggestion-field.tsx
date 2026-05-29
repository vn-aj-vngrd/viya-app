import { Ionicons } from "@expo/vector-icons";
import {
	Input,
	Label,
	Spinner,
	Text,
	TextField,
	useThemeColor,
} from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	getLocationSuggestionPanelState,
	type LocationSuggestionStatus,
} from "./location-suggestion-field-utils";

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
	NonNullable<ComponentProps<typeof Input>["onBlur"]>
>[0];
type InputFocusEvent = Parameters<
	NonNullable<ComponentProps<typeof Input>["onFocus"]>
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
	const iconColor = useThemeColor("field-foreground");
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
	const inputClassName = isInvalid
		? "h-12 border border-danger bg-surface px-4"
		: "h-12 border border-border bg-surface px-4";

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
		setSelectedSuggestionValue(suggestion.value);
		setSuggestions([]);
		setIsFocused(false);
		onChangeText(suggestion.value);
		onSuggestionSelect?.(suggestion);
	};

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>
					{label}
					{isRequired ? <Text className="text-danger"> *</Text> : null}
				</Label.Text>
			</Label>
			<View className="gap-2">
				<Input
					autoCapitalize="words"
					className={inputClassName}
					onBlur={handleBlur}
					onChangeText={handleChangeText}
					onFocus={handleFocus}
					placeholder={placeholder}
					value={value}
					variant="secondary"
				/>
				{isInvalid && errorText ? (
					<Text className="text-danger" type="body-xs">
						{errorText}
					</Text>
				) : null}
				{!(isInvalid && errorText) && helperText ? (
					<Text color="muted" type="body-sm">
						{helperText}
					</Text>
				) : null}
				{panelState.shouldShowPanel ? (
					<View
						className="overflow-hidden rounded-[18px] border border-border bg-surface"
						style={{ boxShadow: "0 12px 26px rgba(15, 23, 42, 0.08)" }}
					>
						{panelState.message === "loading" ? (
							<LocationSuggestionMessage
								icon={<Spinner size="sm" />}
								text="Finding matching destinations..."
							/>
						) : null}
						{panelState.message === "error" ? (
							<LocationSuggestionMessage
								icon={
									<Ionicons
										color="#71717A"
										name="alert-circle-outline"
										size={18}
									/>
								}
								text="Suggestions are unavailable. You can keep this destination."
							/>
						) : null}
						{panelState.message === "empty" ? (
							<LocationSuggestionMessage
								icon={
									<Ionicons color="#71717A" name="search-outline" size={18} />
								}
								text="No close matches yet. Keep typing or use your text."
							/>
						) : null}
						{suggestions.map((suggestion, index) => (
							<Pressable
								accessibilityLabel={`Use ${suggestion.value}`}
								accessibilityRole="button"
								className={`min-h-16 flex-row items-center gap-3 px-4 py-3 ${
									index === 0 ? "" : "border-border border-t"
								}`}
								key={suggestion.id}
								onPress={() => handleSuggestionPress(suggestion)}
								style={({ pressed }) => ({
									backgroundColor: pressed
										? "rgba(10, 132, 255, 0.06)"
										: "#FFFFFF",
								})}
							>
								<View className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary">
									<Ionicons
										color={iconColor}
										name="location-outline"
										size={18}
									/>
								</View>
								<View className="min-w-0 flex-1 gap-0.5">
									<Text numberOfLines={1} type="body-sm" weight="semibold">
										{suggestion.label}
									</Text>
									{suggestion.details ? (
										<Text color="muted" numberOfLines={1} type="body-sm">
											{suggestion.details}
										</Text>
									) : null}
								</View>
								{suggestion.countryCode ? (
									<View className="rounded-full bg-surface-secondary px-2 py-1">
										<Text color="muted" type="body-xs" weight="semibold">
											{suggestion.countryCode}
										</Text>
									</View>
								) : null}
								<Ionicons color="#A1A1AA" name="chevron-forward" size={16} />
							</Pressable>
						))}
						{suggestions.length > 0 ? (
							<Text
								className="border-border border-t px-4 py-2"
								color="muted"
								type="body-xs"
							>
								Geoapify suggestions
							</Text>
						) : null}
					</View>
				) : null}
			</View>
		</TextField>
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
		<View className="flex-row items-center gap-3 px-4 py-3">
			<View className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary">
				{icon}
			</View>
			<Text className="flex-1" color="muted" type="body-sm">
				{text}
			</Text>
		</View>
	);
}
