import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getPreferenceSuggestions } from "@viya-app/domain";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import {
	DateRangePickerField,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";
import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
import {
	AppText,
	Card,
	haptic,
	motion,
	PressableScale,
	PrimaryButton,
	radius,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";

import { LocationSuggestionField } from "./location-suggestion-field";
import { fetchTripCoverImageUrl } from "./trip-cover-image";
import {
	budgetScopeOptions,
	budgetStrictnessOptions,
	createInitialTripCreateFlowState,
	durationPreferenceOptions,
	getCreateTripPayload,
	getCreateTripReviewRows,
	getStepError,
	getTripCreateOptionLabel,
	paceOptions,
	parseBudgetAmount,
	parseTravelerCount,
	type TravelerType,
	type TripCreateFlowState,
	type TripCreateStep,
	type TripPace,
	type TripStyle,
	travelerTypeOptions,
	tripCreateStepOrder,
	tripStyleOptions,
} from "./trip-create-flow-utils";
import { TripTextField } from "./trip-text-field";

type IconName = ComponentProps<typeof Ionicons>["name"];
type FlowPhase = "flow" | "generating" | "starter";
type AccentKey = "accent" | "success" | "warning";

const generationSteps = [
	{ icon: "map-outline", label: "Saving destination" },
	{ icon: "calendar-outline", label: "Setting trip dates" },
	{ icon: "people-outline", label: "Saving traveler details" },
	{ icon: "wallet-outline", label: "Recording budget" },
	{ icon: "checkbox-outline", label: "Preparing workspace" },
] as const satisfies readonly { icon: IconName; label: string }[];
const stepAdvanceIntervalMs = 1500;
const minimumGenerationDurationMs =
	generationSteps.length * stepAdvanceIntervalMs + 450;

const starterInsights = [
	{
		accent: "accent",
		icon: "cloud-download-outline",
		text: "Bookings can be imported through TripSync.",
	},
	{
		accent: "warning",
		icon: "shield-outline",
		text: "Readiness starts low until documents and bookings are added.",
	},
	{
		accent: "success",
		icon: "receipt-outline",
		text: "Budget tracking becomes more accurate as receipts are logged.",
	},
] as const satisfies readonly {
	accent: AccentKey;
	icon: IconName;
	text: string;
}[];

const paceDetails = {
	balanced: "3-5 activities per day",
	light: "2-3 main activities per day",
	packed: "Maximize the trip",
} as const satisfies Record<TripPace, string>;
const paceIcons = {
	balanced: "scale-outline",
	light: "leaf-outline",
	packed: "flash-outline",
} as const satisfies Record<TripPace, IconName>;
const progressSegmentKeys = [
	"segment-1",
	"segment-2",
	"segment-3",
	"segment-4",
	"segment-5",
	"segment-6",
	"segment-7",
	"segment-8",
] as const;

const getStepPosition = (step: TripCreateStep) => {
	const index = tripCreateStepOrder.indexOf(step);
	return { current: Math.max(index + 1, 1), total: tripCreateStepOrder.length };
};

const wait = (durationMs: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, durationMs);
	});

const normalizeDestinationSuggestion = (value: string) =>
	value.trim().replace(/\s+/g, " ").toLowerCase();

const getUniqueAvailableDestinationSuggestions = ({
	currentDestination,
	existingDestinations,
	suggestions,
}: {
	currentDestination: string;
	existingDestinations: readonly string[];
	suggestions: readonly string[];
}) => {
	const excludedDestinations = new Set(
		[...existingDestinations, currentDestination]
			.map(normalizeDestinationSuggestion)
			.filter(Boolean)
	);
	const seenSuggestions = new Set<string>();
	const availableSuggestions: string[] = [];

	for (const suggestion of suggestions) {
		const normalizedSuggestion = normalizeDestinationSuggestion(suggestion);

		if (!normalizedSuggestion) {
			continue;
		}

		if (
			excludedDestinations.has(normalizedSuggestion) ||
			seenSuggestions.has(normalizedSuggestion)
		) {
			continue;
		}

		seenSuggestions.add(normalizedSuggestion);
		availableSuggestions.push(suggestion);
	}

	return availableSuggestions;
};

function Reveal({
	children,
	delayMs = 0,
}: {
	children: ReactNode;
	delayMs?: number;
}) {
	const progress = useSharedValue(0);

	useEffect(() => {
		progress.value = withDelay(delayMs, withSpring(1, motion.spring.surface));

		return () => cancelAnimation(progress);
	}, [delayMs, progress]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [
			{ translateY: (1 - progress.value) * 18 },
			{ scale: 0.98 + progress.value * 0.02 },
		],
	}));

	return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function ProgressSegments({ step }: { step: TripCreateStep }) {
	const { palette } = useUITheme();
	const { current, total } = getStepPosition(step);

	return (
		<View
			accessibilityLabel={`Step ${current} of ${total}`}
			accessibilityRole="progressbar"
			style={{ gap: 8 }}
		>
			<View style={{ flexDirection: "row", gap: 6 }}>
				{progressSegmentKeys.slice(0, total).map((segmentKey, index) => (
					<View
						key={segmentKey}
						style={{
							backgroundColor: index < current ? palette.ink : palette.fill,
							borderRadius: radius.pill,
							flex: 1,
							height: 4,
						}}
					/>
				))}
			</View>
			<AppText tone="secondary" variant="footnote">
				{current} of {total}
			</AppText>
		</View>
	);
}

function OptionCard({
	description,
	icon,
	isSelected,
	onPress,
	title,
}: {
	description: string;
	icon: IconName;
	isSelected: boolean;
	onPress: () => void;
	title: string;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={`${title}. ${description}`}
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			haptic="selection"
			onPress={onPress}
			scaleTo={0.98}
			style={{
				alignItems: "center",
				backgroundColor: palette.surface,
				borderColor: isSelected ? palette.ink : "transparent",
				borderCurve: "continuous",
				borderRadius: radius.card,
				borderWidth: 1.5,
				flexDirection: "row",
				gap: 12,
				minHeight: 64,
				padding: 16,
			}}
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.fill,
					borderRadius: radius.pill,
					height: 44,
					justifyContent: "center",
					width: 44,
				}}
			>
				<Ionicons
					color={isSelected ? palette.ink : palette.inkSecondary}
					name={icon}
					size={20}
				/>
			</View>
			<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
				<AppText variant="headline">{title}</AppText>
				<AppText tone="secondary" variant="subhead">
					{description}
				</AppText>
			</View>
			{isSelected ? (
				<Ionicons color={palette.ink} name="checkmark-circle" size={22} />
			) : null}
		</PressableScale>
	);
}

function ChoiceChip({
	isSelected,
	label,
	onPress,
}: {
	isSelected: boolean;
	label: string;
	onPress: () => void;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			haptic="selection"
			hitSlop={{ bottom: 5, top: 5 }}
			onPress={onPress}
			scaleTo={0.97}
			style={{
				alignItems: "center",
				backgroundColor: isSelected ? palette.ink : palette.surface,
				borderRadius: radius.pill,
				flexDirection: "row",
				height: 34,
				paddingHorizontal: 16,
			}}
		>
			<AppText
				style={{
					color: isSelected ? palette.onPrimary : palette.ink,
					fontWeight: "500",
				}}
				variant="subhead"
			>
				{label}
			</AppText>
		</PressableScale>
	);
}

function InlineTextField({
	autoCapitalize,
	errorText,
	helperText,
	isInvalid,
	keyboardType,
	label,
	onChangeText,
	placeholder,
	value,
}: {
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	errorText?: string;
	helperText?: string;
	isInvalid?: boolean;
	keyboardType?: "default" | "numeric";
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	return (
		<TripTextField
			autoCapitalize={autoCapitalize}
			errorText={errorText}
			helperText={helperText}
			isInvalid={isInvalid}
			keyboardType={keyboardType}
			label={label}
			onChangeText={onChangeText}
			placeholder={placeholder}
			value={value}
		/>
	);
}

function CreateFlowShell({
	children,
	footer,
	helper,
	onBack,
	step,
	title,
}: {
	children: ReactNode;
	footer: ReactNode;
	helper: string;
	onBack: () => void;
	step: TripCreateStep;
	title: string;
}) {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();

	return (
		<Container
			className="bg-background"
			includeBottomInset={false}
			isScrollable={false}
		>
			<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
				<View
					style={{
						backgroundColor: palette.canvas,
						paddingBottom: 12,
						paddingHorizontal: 20,
						paddingTop: Math.max(insets.top + 6, 20),
					}}
				>
					<NavigationBackButton onPress={onBack} />
				</View>
				<ScrollView
					contentContainerStyle={{
						gap: 24,
						paddingBottom: 32,
						paddingHorizontal: 20,
						paddingTop: 8,
					}}
					keyboardDismissMode="interactive"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					style={{ flex: 1 }}
				>
					<ProgressSegments step={step} />
					<View style={{ gap: 8 }}>
						<AppText accessibilityRole="header" variant="title">
							{title}
						</AppText>
						<AppText style={{ maxWidth: 320 }} tone="secondary">
							{helper}
						</AppText>
					</View>
					<Reveal key={step}>
						<View style={{ gap: 16 }}>{children}</View>
					</Reveal>
				</ScrollView>
				<View
					style={{
						backgroundColor: palette.canvas,
						paddingBottom: Math.max(insets.bottom + 8, 18),
						paddingHorizontal: 20,
						paddingTop: 12,
					}}
				>
					{footer}
				</View>
			</View>
		</Container>
	);
}

function DestinationStep({
	destinationSuggestions,
	errorMessage,
	onPopularSelect,
	onUpdate,
	searchLocationSuggestions,
	state,
}: {
	destinationSuggestions: readonly string[];
	errorMessage?: string | null;
	onPopularSelect: (destination: string) => void;
	onUpdate: <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => void;
	searchLocationSuggestions: (
		text: string
	) => Promise<
		Array<{ id: string; label: string; value: string; details?: string }>
	>;
	state: TripCreateFlowState;
}) {
	return (
		<View style={{ gap: 20 }}>
			<LocationSuggestionField
				errorText={errorMessage ?? undefined}
				isInvalid={Boolean(errorMessage)}
				label="Destination"
				onChangeText={(value) => onUpdate("destination", value)}
				placeholder="Search city, island, or region"
				searchLocationSuggestions={searchLocationSuggestions}
				value={state.destination}
			/>
			<View style={{ gap: 12 }}>
				<AppText tone="secondary" variant="eyebrow">
					SUGGESTED FOR YOU
				</AppText>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					{destinationSuggestions.map((destination) => (
						<ChoiceChip
							isSelected={state.destination === destination}
							key={destination}
							label={destination}
							onPress={() => onPopularSelect(destination)}
						/>
					))}
				</View>
			</View>
		</View>
	);
}

function DatesStep({
	errorMessage,
	onUpdate,
	state,
}: {
	errorMessage?: string | null;
	onUpdate: <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => void;
	state: TripCreateFlowState;
}) {
	const range: DateRangeValue = {
		end: state.endDate,
		start: state.startDate,
	};

	return (
		<View style={{ gap: 20 }}>
			<DateRangePickerField
				errorText={errorMessage ?? undefined}
				helperText="Dates set the number of days in your workspace."
				isInvalid={Boolean(errorMessage)}
				label="Trip dates"
				onValueChange={(value) => {
					onUpdate("startDate", value.start);
					onUpdate("endDate", value.end);
					onUpdate("durationPreference", null);
				}}
				value={range}
			/>
			<View style={{ gap: 12 }}>
				<AppText tone="secondary" variant="eyebrow">
					DATES NOT DECIDED YET
				</AppText>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					{durationPreferenceOptions.map((option) => (
						<ChoiceChip
							isSelected={state.durationPreference === option}
							key={option}
							label={getTripCreateOptionLabel("durationPreference", option)}
							onPress={() => {
								onUpdate("durationPreference", option);
								onUpdate("startDate", "");
								onUpdate("endDate", "");
							}}
						/>
					))}
				</View>
			</View>
		</View>
	);
}

function TravelersStep({
	errorMessage,
	onUpdate,
	state,
}: {
	errorMessage?: string | null;
	onUpdate: <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => void;
	state: TripCreateFlowState;
}) {
	const selectedTravelerCount = parseTravelerCount(state.travelerCount) ?? 1;
	const hasFixedTravelerCount =
		state.travelerType === "solo" || state.travelerType === "couple";
	const fixedTravelerCount = state.travelerType === "couple" ? 2 : 1;

	const handleTravelerTypePress = (option: TravelerType) => {
		onUpdate("travelerType", option);

		if (option === "solo") {
			onUpdate("travelerCount", "1");
			return;
		}

		if (option === "couple") {
			onUpdate("travelerCount", "2");
			return;
		}

		if (selectedTravelerCount < 2) {
			onUpdate("travelerCount", "2");
		}
	};

	return (
		<View style={{ gap: 20 }}>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
				{travelerTypeOptions.map((option) => (
					<ChoiceChip
						isSelected={state.travelerType === option}
						key={option}
						label={getTripCreateOptionLabel("travelerType", option)}
						onPress={() => handleTravelerTypePress(option)}
					/>
				))}
			</View>
			{hasFixedTravelerCount ? (
				<View style={{ gap: 4 }}>
					<AppText bold variant="subhead">
						{fixedTravelerCount}{" "}
						{fixedTravelerCount === 1 ? "traveler" : "travelers"}
					</AppText>
					<AppText tone="secondary" variant="subhead">
						{state.travelerType === "solo"
							? "Solo trips are set to 1 traveler."
							: "Couple trips are set to 2 travelers."}
					</AppText>
				</View>
			) : (
				<InlineTextField
					errorText={errorMessage ?? undefined}
					isInvalid={Boolean(errorMessage)}
					keyboardType="numeric"
					label="Number of travelers"
					onChangeText={(value) => onUpdate("travelerCount", value)}
					placeholder="2"
					value={state.travelerCount}
				/>
			)}
		</View>
	);
}

function StylePaceStep({
	errorMessage,
	onToggleStyle,
	onUpdate,
	state,
}: {
	errorMessage?: string | null;
	onToggleStyle: (style: TripStyle) => void;
	onUpdate: <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => void;
	state: TripCreateFlowState;
}) {
	return (
		<View style={{ gap: 24 }}>
			<View style={{ gap: 12 }}>
				<AppText tone="secondary" variant="eyebrow">
					PICK ONE OR MORE
				</AppText>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					{tripStyleOptions.map((option) => (
						<ChoiceChip
							isSelected={state.styles.includes(option)}
							key={option}
							label={getTripCreateOptionLabel("style", option)}
							onPress={() => onToggleStyle(option)}
						/>
					))}
				</View>
				{errorMessage ? (
					<AppText
						accessibilityLiveRegion="polite"
						tone="danger"
						variant="footnote"
					>
						{errorMessage}
					</AppText>
				) : null}
			</View>
			<View style={{ gap: 12 }}>
				<AppText tone="secondary" variant="eyebrow">
					DAILY PACE
				</AppText>
				<View style={{ gap: 8 }}>
					{paceOptions.map((option) => (
						<OptionCard
							description={paceDetails[option]}
							icon={paceIcons[option]}
							isSelected={state.pace === option}
							key={option}
							onPress={() => onUpdate("pace", option)}
							title={getTripCreateOptionLabel("pace", option)}
						/>
					))}
				</View>
			</View>
		</View>
	);
}

function BudgetStep({
	errorMessage,
	onUpdate,
	state,
}: {
	errorMessage?: string | null;
	onUpdate: <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => void;
	state: TripCreateFlowState;
}) {
	return (
		<View style={{ gap: 20 }}>
			<View style={{ gap: 8 }}>
				<InlineTextField
					errorText={errorMessage ?? undefined}
					helperText="Enter the total amount you want to track for this trip."
					isInvalid={Boolean(errorMessage)}
					keyboardType="numeric"
					label="Budget amount"
					onChangeText={(value) => onUpdate("budgetAmount", value)}
					placeholder="Enter amount"
					value={state.budgetAmount}
				/>
			</View>
			<View style={{ gap: 12 }}>
				<AppText tone="secondary" variant="eyebrow">
					BUDGET TYPE
				</AppText>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					{budgetScopeOptions.map((option) => (
						<ChoiceChip
							isSelected={state.budgetScope === option}
							key={option}
							label={getTripCreateOptionLabel("budgetScope", option)}
							onPress={() => onUpdate("budgetScope", option)}
						/>
					))}
				</View>
			</View>
			<View style={{ gap: 12 }}>
				<AppText tone="secondary" variant="eyebrow">
					STRICTNESS
				</AppText>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					{budgetStrictnessOptions.map((option) => (
						<ChoiceChip
							isSelected={state.budgetStrictness === option}
							key={option}
							label={`${option.charAt(0).toUpperCase()}${option.slice(1)}`}
							onPress={() => onUpdate("budgetStrictness", option)}
						/>
					))}
				</View>
			</View>
		</View>
	);
}

function ReviewStep({ state }: { state: TripCreateFlowState }) {
	const { palette } = useUITheme();
	const rows = getCreateTripReviewRows(state);

	return (
		<Card padding="md">
			{rows.map((row, index) => (
				<View
					key={row.label}
					style={{
						alignItems: "flex-start",
						borderBottomColor: palette.separator,
						borderBottomWidth: index === rows.length - 1 ? 0 : 1,
						flexDirection: "row",
						gap: 16,
						justifyContent: "space-between",
						paddingVertical: 12,
					}}
				>
					<AppText tone="secondary" variant="subhead">
						{row.label}
					</AppText>
					<AppText
						bold
						style={{ flexShrink: 1, maxWidth: 224, textAlign: "right" }}
						variant="subhead"
					>
						{row.value}
					</AppText>
				</View>
			))}
		</Card>
	);
}

function GeneratingBrandMark() {
	const { palette } = useUITheme();
	const pulse = useSharedValue(0);

	useEffect(() => {
		pulse.value = withRepeat(
			withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
			-1,
			false
		);

		return () => cancelAnimation(pulse);
	}, [pulse]);

	const innerRingStyle = useAnimatedStyle(() => ({
		opacity: 0.4 * (1 - pulse.value),
		transform: [{ scale: 0.7 + pulse.value * 0.9 }],
	}));
	const outerRingStyle = useAnimatedStyle(() => {
		const phase = (pulse.value + 0.5) % 1;
		return {
			opacity: 0.4 * (1 - phase),
			transform: [{ scale: 0.7 + phase * 0.9 }],
		};
	});

	return (
		<View
			style={{
				alignItems: "center",
				height: 72,
				justifyContent: "center",
				width: 72,
			}}
		>
			<Animated.View style={[ring(palette.accent), outerRingStyle]} />
			<Animated.View style={[ring(palette.accent), innerRingStyle]} />
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.surface,
					borderRadius: radius.pill,
					height: 48,
					justifyContent: "center",
					width: 48,
				}}
			>
				<Ionicons color={palette.accent} name="map-outline" size={24} />
			</View>
		</View>
	);
}

const ring = (backgroundColor: string) =>
	({
		backgroundColor,
		borderRadius: radius.pill,
		height: 72,
		position: "absolute",
		width: 72,
	}) as const;

function GenerationProgressBar({ progress }: { progress: number }) {
	const { palette } = useUITheme();
	const width = useSharedValue(0);

	useEffect(() => {
		width.value = withTiming(progress, {
			duration: 700,
			easing: Easing.out(Easing.cubic),
		});

		return () => cancelAnimation(width);
	}, [progress, width]);

	const fillStyle = useAnimatedStyle(() => ({
		width: `${width.value * 100}%`,
	}));

	return (
		<View
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				height: 6,
				overflow: "hidden",
				width: "100%",
			}}
		>
			<Animated.View
				style={[
					{
						backgroundColor: palette.accent,
						borderRadius: radius.pill,
						height: "100%",
					},
					fillStyle,
				]}
			/>
		</View>
	);
}

type GenerationStepStatus = "complete" | "active" | "pending";

function GenerationStepRow({
	icon,
	index,
	label,
	status,
}: {
	icon: IconName;
	index: number;
	label: string;
	status: GenerationStepStatus;
}) {
	const { palette } = useUITheme();
	const reveal = useSharedValue(0);

	useEffect(() => {
		reveal.value = withDelay(
			index * 90,
			withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
		);

		return () => cancelAnimation(reveal);
	}, [index, reveal]);

	const rowStyle = useAnimatedStyle(() => ({
		opacity: reveal.value,
		transform: [{ translateY: (1 - reveal.value) * 14 }],
	}));

	const isPending = status === "pending";
	let chip: ReactNode = (
		<Ionicons color={palette.inkTertiary} name={icon} size={16} />
	);

	if (status === "active") {
		chip = <ActivityIndicator color={palette.accent} size="small" />;
	} else if (status === "complete") {
		chip = <Ionicons color={palette.accent} name="checkmark" size={16} />;
	}

	return (
		<Animated.View accessibilityLabel={`${label}, ${status}`} style={rowStyle}>
			<Card
				padding="md"
				radius={radius.field}
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: 12,
					opacity: isPending ? 0.55 : 1,
				}}
			>
				<View
					style={{
						alignItems: "center",
						backgroundColor: palette.fill,
						borderRadius: radius.pill,
						height: 32,
						justifyContent: "center",
						width: 32,
					}}
				>
					{chip}
				</View>
				<AppText
					bold
					style={{ flex: 1 }}
					tone={isPending ? "secondary" : "ink"}
					variant="subhead"
				>
					{label}
				</AppText>
				{status === "complete" ? (
					<Ionicons color={palette.success} name="checkmark-circle" size={18} />
				) : null}
			</Card>
		</Animated.View>
	);
}

function GeneratingScreen() {
	const insets = useSafeAreaInsets();
	const [activeIndex, setActiveIndex] = useState(0);
	const finalIndex = generationSteps.length;

	useEffect(() => {
		if (activeIndex >= finalIndex) {
			return;
		}

		const timer = setTimeout(() => {
			setActiveIndex((current) => Math.min(current + 1, finalIndex));
		}, stepAdvanceIntervalMs);

		return () => clearTimeout(timer);
	}, [activeIndex]);

	const progress = Math.min(1, (activeIndex + 0.5) / generationSteps.length);

	const getStepStatus = (index: number): GenerationStepStatus => {
		if (index < activeIndex) {
			return "complete";
		}

		if (index === activeIndex) {
			return "active";
		}

		return "pending";
	};

	return (
		<Container className="bg-background" isScrollable={false}>
			<View
				style={{
					flex: 1,
					gap: 36,
					justifyContent: "center",
					paddingBottom: Math.max(insets.bottom + 24, 36),
					paddingHorizontal: 24,
					paddingTop: Math.max(insets.top + 24, 44),
				}}
			>
				<Reveal>
					<View style={{ gap: 24 }}>
						<GeneratingBrandMark />
						<View style={{ gap: 8 }}>
							<AppText accessibilityRole="header" variant="title">
								Building your starter trip
							</AppText>
							<AppText style={{ maxWidth: 320 }} tone="secondary">
								Your answers are being saved into an editable workspace.
							</AppText>
						</View>
						<GenerationProgressBar progress={progress} />
					</View>
				</Reveal>
				<View style={{ gap: 10 }}>
					{generationSteps.map((step, index) => (
						<GenerationStepRow
							icon={step.icon}
							index={index}
							key={step.label}
							label={step.label}
							status={getStepStatus(index)}
						/>
					))}
				</View>
			</View>
		</Container>
	);
}

function StarterSuccessBadge() {
	const { palette } = useUITheme();
	const scale = useSharedValue(0.6);
	const opacity = useSharedValue(0);
	const halo = useSharedValue(0);

	useEffect(() => {
		opacity.value = withTiming(1, {
			duration: 420,
			easing: Easing.out(Easing.cubic),
		});
		scale.value = withSpring(1, motion.spring.surface);
		haptic("success");
		halo.value = withRepeat(
			withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
			-1,
			false
		);

		return () => {
			cancelAnimation(scale);
			cancelAnimation(opacity);
			cancelAnimation(halo);
		};
	}, [halo, opacity, scale]);

	const badgeStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ scale: scale.value }],
	}));
	const haloStyle = useAnimatedStyle(() => ({
		opacity: 0.28 * (1 - halo.value),
		transform: [{ scale: 0.8 + halo.value * 0.7 }],
	}));

	return (
		<View
			style={{
				alignItems: "center",
				height: 56,
				justifyContent: "center",
				width: 56,
			}}
		>
			<Animated.View
				style={[
					{
						backgroundColor: palette.success,
						borderRadius: radius.pill,
						height: 56,
						position: "absolute",
						width: 56,
					},
					haloStyle,
				]}
			/>
			<Animated.View
				style={[
					{
						alignItems: "center",
						backgroundColor: palette.surface,
						borderRadius: radius.pill,
						height: 48,
						justifyContent: "center",
						width: 48,
					},
					badgeStyle,
				]}
			>
				<Ionicons color={palette.success} name="checkmark-sharp" size={26} />
			</Animated.View>
		</View>
	);
}

function StarterPreviewScreen({
	onOpen,
	state,
}: {
	onOpen: () => void;
	state: TripCreateFlowState;
}) {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();
	const budgetAmount = parseBudgetAmount(state.budgetAmount);
	const travelerCount = parseTravelerCount(state.travelerCount) ?? 1;
	const destination = state.destination || "your trip";

	return (
		<Container className="bg-background" isScrollable={false}>
			<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
				<ScrollView
					contentContainerStyle={{
						gap: 24,
						paddingBottom: Math.max(insets.bottom + 128, 148),
						paddingHorizontal: 20,
						paddingTop: Math.max(insets.top + 28, 48),
					}}
					showsVerticalScrollIndicator={false}
				>
					<StarterSuccessBadge />
					<Reveal delayMs={120}>
						<View style={{ gap: 10 }}>
							<AppText accessibilityRole="header" variant="title">
								Your starter trip is ready
							</AppText>
							<AppText tone="secondary">
								Open the workspace to fine-tune the manual plan for{" "}
								{destination}.
							</AppText>
						</View>
					</Reveal>
					<Reveal delayMs={220}>
						<View style={{ gap: 12 }}>
							<AppText variant="headline">
								{state.destination || "New trip"} setup
							</AppText>
							<View style={{ flexDirection: "row", gap: 12 }}>
								<PreviewMetric
									accent="accent"
									icon="people-outline"
									label="Travelers"
									value={travelerCount.toString()}
								/>
								<PreviewMetric
									accent="success"
									icon="speedometer-outline"
									label="Pace"
									value={getTripCreateOptionLabel("pace", state.pace)}
								/>
								<PreviewMetric
									accent="warning"
									icon="wallet-outline"
									label="Budget"
									value={
										budgetAmount ? `₱${budgetAmount.toLocaleString()}` : "Open"
									}
								/>
							</View>
						</View>
					</Reveal>
					<Reveal delayMs={320}>
						<View style={{ gap: 12 }}>
							<AppText variant="headline">Setup checklist</AppText>
							{starterInsights.map((insight) => (
								<Card
									key={insight.text}
									padding="md"
									style={{
										alignItems: "center",
										flexDirection: "row",
										gap: 12,
									}}
								>
									<View
										style={{
											alignItems: "center",
											backgroundColor: palette.fill,
											borderRadius: radius.pill,
											height: 36,
											justifyContent: "center",
											width: 36,
										}}
									>
										<Ionicons
											color={palette[insight.accent]}
											name={insight.icon}
											size={18}
										/>
									</View>
									<AppText
										style={{ flex: 1 }}
										tone="secondary"
										variant="subhead"
									>
										{insight.text}
									</AppText>
								</Card>
							))}
						</View>
					</Reveal>
				</ScrollView>
				<Reveal delayMs={420}>
					<View
						style={{
							backgroundColor: palette.canvas,
							bottom: 0,
							left: 0,
							paddingBottom: Math.max(insets.bottom, 8),
							paddingHorizontal: 20,
							paddingTop: 8,
							position: "absolute",
							right: 0,
						}}
					>
						<PrimaryButton
							icon="arrow-forward"
							label="Open trip"
							onPress={onOpen}
						/>
					</View>
				</Reveal>
			</View>
		</Container>
	);
}

function PreviewMetric({
	accent,
	icon,
	label,
	value,
}: {
	accent: AccentKey;
	icon: IconName;
	label: string;
	value: string;
}) {
	const { palette } = useUITheme();

	return (
		<Card padding="md" style={{ flex: 1, gap: 8, minWidth: 0 }}>
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.fill,
					borderRadius: radius.pill,
					height: 32,
					justifyContent: "center",
					width: 32,
				}}
			>
				<Ionicons color={palette[accent]} name={icon} size={16} />
			</View>
			<View style={{ gap: 2 }}>
				<AppText tone="secondary" variant="footnote">
					{label}
				</AppText>
				<AppText bold numberOfLines={1} variant="subhead">
					{value}
				</AppText>
			</View>
		</Card>
	);
}

export function ManualTripCreateScreen() {
	const router = useRouter();
	const createTrip = useMutation(api.trips.createTrip);
	const currentPreferences = useQuery(api.preferences.getCurrentPreferences);
	const existingTrips = useQuery(api.trips.listTrips);
	const runLocationSuggestionSearch = useAction(
		api.locations.searchLocationSuggestions
	);
	const [activeStep, setActiveStep] = useState<TripCreateStep>("destination");
	const [createdTripId, setCreatedTripId] = useState<Id<"trips"> | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [flowPhase, setFlowPhase] = useState<FlowPhase>("flow");
	const [isCreating, setIsCreating] = useState(false);
	const [state, setState] = useState<TripCreateFlowState>(() =>
		createInitialTripCreateFlowState()
	);
	const searchLocationSuggestions = useCallback(
		(text: string) => runLocationSuggestionSearch({ text }),
		[runLocationSuggestionSearch]
	);
	const activeStepIndex = useMemo(
		() => tripCreateStepOrder.indexOf(activeStep),
		[activeStep]
	);
	const destinationSuggestions = useMemo(() => {
		const suggestions = getPreferenceSuggestions(currentPreferences ?? {});
		const preferredDestinations = [
			...suggestions.countrySuggestions.map((suggestion) => suggestion.country),
			...suggestions.placeSuggestions.map((suggestion) => suggestion.location),
		];

		return getUniqueAvailableDestinationSuggestions({
			currentDestination: state.destination,
			existingDestinations: (existingTrips ?? []).map(
				(trip) => trip.destination
			),
			suggestions: preferredDestinations,
		}).slice(0, 6);
	}, [currentPreferences, existingTrips, state.destination]);
	const updateState = <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => {
		setState((currentState) => ({ ...currentState, [key]: value }));
		setErrorMessage(null);
	};

	const handleBack = () => {
		setErrorMessage(null);

		if (activeStep === "destination") {
			router.back();
			return;
		}

		const previousStep = tripCreateStepOrder[Math.max(activeStepIndex - 1, 0)];
		setActiveStep(previousStep ?? "destination");
	};

	const handleToggleStyle = (style: TripStyle) => {
		setState((currentState) => {
			const styles = currentState.styles.includes(style)
				? currentState.styles.filter((item) => item !== style)
				: [...currentState.styles, style];

			return { ...currentState, styles };
		});
		setErrorMessage(null);
	};

	const handleCreate = async () => {
		const stepError = getStepError(state, activeStep);

		if (stepError) {
			setErrorMessage(stepError);
			return;
		}

		setIsCreating(true);
		setErrorMessage(null);

		try {
			setFlowPhase("generating");
			const payload = getCreateTripPayload(state);
			const creationPromise = (async () => {
				const coverImageUrl = await fetchTripCoverImageUrl(payload.destination);
				return createTrip({ ...payload, coverImageUrl });
			})();
			const [result] = await Promise.all([
				creationPromise,
				wait(minimumGenerationDurationMs),
			]);
			setCreatedTripId(result.tripId);
			setFlowPhase("starter");
		} catch (error) {
			setFlowPhase("flow");
			setErrorMessage(
				error instanceof Error ? error.message : "Could not create this trip."
			);
		} finally {
			setIsCreating(false);
		}
	};

	const handleContinue = async () => {
		const stepError = getStepError(state, activeStep);

		if (stepError) {
			setErrorMessage(stepError);
			return;
		}

		setErrorMessage(null);

		if (activeStep === "review") {
			await handleCreate();
			return;
		}

		const nextStep = tripCreateStepOrder[activeStepIndex + 1];
		if (nextStep) {
			setActiveStep(nextStep);
		}
	};

	if (flowPhase === "generating") {
		return <GeneratingScreen />;
	}

	if (flowPhase === "starter" && createdTripId) {
		return (
			<StarterPreviewScreen
				onOpen={() => router.replace(VIYA_ROUTES.tripDashboard(createdTripId))}
				state={state}
			/>
		);
	}

	let title = "Where are you going?";
	let helper =
		"Choose the destination this trip workspace should be organized around.";
	let content: ReactNode = (
		<DestinationStep
			destinationSuggestions={destinationSuggestions}
			errorMessage={activeStep === "destination" ? errorMessage : null}
			onPopularSelect={(destination) => {
				updateState("destination", destination);
			}}
			onUpdate={updateState}
			searchLocationSuggestions={searchLocationSuggestions}
			state={state}
		/>
	);
	let primaryLabel = "Continue";

	if (activeStep === "dates") {
		title = "When is your trip?";
		helper = "Set the dates so the workspace can organize days and timing.";
		content = (
			<DatesStep
				errorMessage={errorMessage}
				onUpdate={updateState}
				state={state}
			/>
		);
	} else if (activeStep === "travelers") {
		title = "Who's going?";
		helper = "This keeps the group size and traveler type visible in planning.";
		content = (
			<TravelersStep
				errorMessage={errorMessage}
				onUpdate={updateState}
				state={state}
			/>
		);
	} else if (activeStep === "style") {
		title = "What kind of trip do you want?";
		helper = "Pick what matters most so your manual plan has a clear shape.";
		content = (
			<StylePaceStep
				errorMessage={errorMessage}
				onToggleStyle={handleToggleStyle}
				onUpdate={updateState}
				state={state}
			/>
		);
	} else if (activeStep === "budget") {
		title = "What's your budget?";
		helper = "Enter the amount you want the budget wallet to track.";
		content = (
			<BudgetStep
				errorMessage={errorMessage}
				onUpdate={updateState}
				state={state}
			/>
		);
	} else if (activeStep === "review") {
		title = "Review your trip";
		helper = "Check the setup before creating your editable workspace.";
		content = <ReviewStep state={state} />;
		primaryLabel = isCreating ? "Creating..." : "Create trip";
	}

	return (
		<CreateFlowShell
			footer={
				<PrimaryButton
					disabled={isCreating}
					isPending={isCreating}
					label={primaryLabel}
					onPress={handleContinue}
				/>
			}
			helper={helper}
			onBack={handleBack}
			step={activeStep}
			title={title}
		>
			{content}
		</CreateFlowShell>
	);
}
