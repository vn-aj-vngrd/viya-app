import { Ionicons } from "@expo/vector-icons";
import {
	Input,
	Label,
	Spinner,
	Text,
	TextField,
	useBottomSheetAwareHandlers,
	useThemeColor,
} from "heroui-native";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

const locationSuggestionDebounceMs = 350;
const minimumLocationSuggestionQueryLength = 2;

interface LocationSuggestion {
	countryCode?: string;
	details?: string;
	id: string;
	label: string;
	value: string;
}

interface LocationSuggestionFieldProps {
	isRequired?: boolean;
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	searchLocationSuggestions: (text: string) => Promise<LocationSuggestion[]>;
	value: string;
}

type SuggestionStatus = "idle" | "loading" | "error";
type InputBlurEvent = Parameters<
	NonNullable<ComponentProps<typeof Input>["onBlur"]>
>[0];
type InputFocusEvent = Parameters<
	NonNullable<ComponentProps<typeof Input>["onFocus"]>
>[0];

export function LocationSuggestionField({
	isRequired,
	label,
	onChangeText,
	placeholder,
	searchLocationSuggestions,
	value,
}: LocationSuggestionFieldProps) {
	const bottomSheetHandlers = useBottomSheetAwareHandlers();
	const iconColor = useThemeColor("field-foreground");
	const [isFocused, setIsFocused] = useState(false);
	const [selectedSuggestionValue, setSelectedSuggestionValue] = useState<
		string | null
	>(null);
	const [status, setStatus] = useState<SuggestionStatus>("idle");
	const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
	const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);
	const trimmedValue = value.trim();
	const canSearch =
		trimmedValue.length >= minimumLocationSuggestionQueryLength &&
		trimmedValue !== selectedSuggestionValue;
	const shouldShowPanel =
		isFocused && (suggestions.length > 0 || status === "loading");

	useEffect(() => {
		if (!canSearch) {
			setStatus("idle");
			setSuggestions([]);
			return;
		}

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		const timeoutId = setTimeout(() => {
			setStatus("loading");
			searchLocationSuggestions(trimmedValue)
				.then((nextSuggestions) => {
					if (requestIdRef.current === requestId) {
						setSuggestions(nextSuggestions);
						setStatus("idle");
					}
				})
				.catch(() => {
					if (requestIdRef.current === requestId) {
						setSuggestions([]);
						setStatus("error");
					}
				});
		}, locationSuggestionDebounceMs);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [canSearch, searchLocationSuggestions, trimmedValue]);

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
					className="h-12 border border-border bg-surface px-4"
					onBlur={handleBlur}
					onChangeText={handleChangeText}
					onFocus={handleFocus}
					placeholder={placeholder}
					value={value}
					variant="secondary"
				/>
				{status === "error" && isFocused ? (
					<Text color="muted" type="body-sm">
						Location suggestions are unavailable. You can keep typing manually.
					</Text>
				) : null}
				{shouldShowPanel ? (
					<View className="overflow-hidden rounded-[18px] border border-border bg-surface">
						{status === "loading" ? (
							<View className="flex-row items-center gap-2 px-4 py-3">
								<Spinner size="sm" />
								<Text color="muted" type="body-sm">
									Finding places...
								</Text>
							</View>
						) : null}
						{suggestions.map((suggestion, index) => (
							<Pressable
								accessibilityLabel={`Use ${suggestion.value}`}
								accessibilityRole="button"
								className={`flex-row items-start gap-3 px-4 py-3 ${
									index === 0 ? "" : "border-border border-t"
								}`}
								key={suggestion.id}
								onPress={() => handleSuggestionPress(suggestion)}
							>
								<Ionicons color={iconColor} name="location-outline" size={18} />
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
							</Pressable>
						))}
						{suggestions.length > 0 ? (
							<Text
								className="border-border border-t px-4 py-2"
								color="muted"
								type="body-sm"
							>
								Powered by Geoapify
							</Text>
						) : null}
					</View>
				) : null}
			</View>
		</TextField>
	);
}
