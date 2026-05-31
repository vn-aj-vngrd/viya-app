import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getPreferenceSuggestions } from "@viya-app/domain";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
	Button,
	Input,
	Label,
	Spinner,
	Surface,
	Text,
	TextField,
	useThemeColor,
} from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import {
	DateRangePickerField,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";
import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
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

type IconName = ComponentProps<typeof Ionicons>["name"];
type FlowPhase = "flow" | "generating" | "starter";

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
		accent: "#0A84FF",
		icon: "cloud-download-outline",
		text: "Bookings can be imported through TripSync.",
	},
	{
		accent: "#E97816",
		icon: "shield-outline",
		text: "Readiness starts low until documents and bookings are added.",
	},
	{
		accent: "#059669",
		icon: "receipt-outline",
		text: "Budget tracking becomes more accurate as receipts are logged.",
	},
] as const satisfies readonly {
	accent: string;
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
		progress.value = withDelay(
			delayMs,
			withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })
		);

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
	const { current, total } = getStepPosition(step);

	return (
		<View className="gap-2">
			<View className="flex-row gap-1.5">
				{progressSegmentKeys.slice(0, total).map((segmentKey, index) => {
					const isComplete = index < current;

					return (
						<View
							className="h-2 flex-1 rounded-full"
							key={segmentKey}
							style={{ backgroundColor: isComplete ? "#0A84FF" : "#E4E7EC" }}
						/>
					);
				})}
			</View>
			<Text color="muted" type="body-xs" weight="semibold">
				{current} of {total}
			</Text>
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
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			className="rounded-3xl"
			onPress={onPress}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.99 : 1 }],
			})}
		>
			<Surface
				className="flex-row items-center gap-3 rounded-3xl border bg-surface p-4"
				style={{
					borderColor: isSelected ? "#0A84FF" : "rgba(24, 24, 27, 0.08)",
				}}
			>
				<View
					className="h-11 w-11 items-center justify-center rounded-full"
					style={{ backgroundColor: isSelected ? "#EAF2FF" : "#F4F4F5" }}
				>
					<Ionicons
						color={isSelected ? "#0A84FF" : "#71717A"}
						name={icon}
						size={20}
					/>
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text type="body" weight="semibold">
						{title}
					</Text>
					<Text.Paragraph color="muted" type="body-sm">
						{description}
					</Text.Paragraph>
				</View>
				{isSelected ? (
					<Ionicons color="#0A84FF" name="checkmark-circle" size={22} />
				) : null}
			</Surface>
		</Pressable>
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
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			className="min-h-10 flex-row items-center rounded-full border bg-white px-4"
			onPress={onPress}
			style={({ pressed }) => ({
				backgroundColor: isSelected ? "#0A84FF" : "#FFFFFF",
				borderColor: isSelected ? "#0A84FF" : "rgba(24, 24, 27, 0.06)",
				opacity: pressed ? 0.82 : 1,
				transform: [{ scale: pressed ? 0.98 : 1 }],
			})}
		>
			<Text
				style={{ color: isSelected ? "#FFFFFF" : "#18181B" }}
				type="body-sm"
				weight="semibold"
			>
				{label}
			</Text>
		</Pressable>
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
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<Input
				autoCapitalize={autoCapitalize}
				className={
					isInvalid
						? "h-12 border border-danger bg-surface px-4"
						: "h-12 border border-border bg-surface px-4"
				}
				keyboardType={keyboardType}
				onChangeText={onChangeText}
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
				<Text color="muted" type="body-xs">
					{helperText}
				</Text>
			) : null}
		</TextField>
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

	return (
		<Container
			className="bg-background"
			includeBottomInset={false}
			isScrollable={false}
		>
			<View className="flex-1">
				<View
					className="bg-background px-5 pb-3"
					style={{ paddingTop: Math.max(insets.top + 6, 20) }}
				>
					<NavigationBackButton onPress={onBack} />
				</View>
				<ScrollView
					className="flex-1"
					contentContainerStyle={{
						gap: 26,
						paddingBottom: 32,
						paddingHorizontal: 20,
						paddingTop: 8,
					}}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<ProgressSegments step={step} />
					<View className="gap-3">
						<Text.Heading className="text-5xl leading-14" type="h1">
							{title}
						</Text.Heading>
						<Text.Paragraph className="max-w-80 leading-6" color="muted">
							{helper}
						</Text.Paragraph>
					</View>
					<View className="gap-4">{children}</View>
				</ScrollView>
				<View
					className="bg-background px-5 pt-3"
					style={{ paddingBottom: Math.max(insets.bottom + 8, 18) }}
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
		<View className="gap-5">
			<LocationSuggestionField
				errorText={errorMessage ?? undefined}
				isInvalid={Boolean(errorMessage)}
				label="Destination"
				onChangeText={(value) => onUpdate("destination", value)}
				placeholder="Search city, island, or region"
				searchLocationSuggestions={searchLocationSuggestions}
				value={state.destination}
			/>
			<View className="gap-3">
				<Text color="muted" type="body-xs" weight="semibold">
					SUGGESTED FOR YOU
				</Text>
				<View className="flex-row flex-wrap gap-2">
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
		<View className="gap-5">
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
			<View className="gap-3">
				<Text color="muted" type="body-xs" weight="semibold">
					DATES NOT DECIDED YET
				</Text>
				<View className="flex-row flex-wrap gap-2">
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
		<View className="gap-5">
			<View className="flex-row flex-wrap gap-2">
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
				<View className="gap-1">
					<Text type="body-sm" weight="semibold">
						{fixedTravelerCount}{" "}
						{fixedTravelerCount === 1 ? "traveler" : "travelers"}
					</Text>
					<Text color="muted" type="body-sm">
						{state.travelerType === "solo"
							? "Solo trips are set to 1 traveler."
							: "Couple trips are set to 2 travelers."}
					</Text>
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
		<View className="gap-6">
			<View className="gap-3">
				<Text color="muted" type="body-xs" weight="semibold">
					PICK ONE OR MORE
				</Text>
				<View className="flex-row flex-wrap gap-2">
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
					<Text className="text-danger" type="body-xs">
						{errorMessage}
					</Text>
				) : null}
			</View>
			<View className="gap-3">
				<Text color="muted" type="body-xs" weight="semibold">
					DAILY PACE
				</Text>
				<View className="gap-2">
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
		<View className="gap-5">
			<View className="gap-2">
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
			<View className="gap-3">
				<Text color="muted" type="body-xs" weight="semibold">
					BUDGET TYPE
				</Text>
				<View className="flex-row flex-wrap gap-2">
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
			<View className="gap-3">
				<Text color="muted" type="body-xs" weight="semibold">
					STRICTNESS
				</Text>
				<View className="flex-row flex-wrap gap-2">
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
	const rows = getCreateTripReviewRows(state);

	return (
		<Surface className="gap-2 rounded-[30px] border border-border bg-surface p-5">
			{rows.map((row, index) => (
				<View
					className={`flex-row items-start justify-between gap-4 py-3 ${
						index === rows.length - 1 ? "" : "border-border border-b"
					}`}
					key={row.label}
				>
					<Text color="muted" type="body-sm">
						{row.label}
					</Text>
					<Text
						className="max-w-56 text-right"
						type="body-sm"
						weight="semibold"
					>
						{row.value}
					</Text>
				</View>
			))}
		</Surface>
	);
}

function GeneratingBrandMark() {
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
		<View className="h-[72px] w-[72px] items-center justify-center">
			<Animated.View
				className="absolute h-[72px] w-[72px] rounded-full"
				style={[{ backgroundColor: "#0A84FF" }, outerRingStyle]}
			/>
			<Animated.View
				className="absolute h-[72px] w-[72px] rounded-full"
				style={[{ backgroundColor: "#0A84FF" }, innerRingStyle]}
			/>
			<View
				className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
				style={{
					shadowColor: "#0A84FF",
					shadowOffset: { height: 8, width: 0 },
					shadowOpacity: 0.18,
					shadowRadius: 18,
				}}
			>
				<Ionicons color="#0A84FF" name="map-outline" size={24} />
			</View>
		</View>
	);
}

function GenerationProgressBar({ progress }: { progress: number }) {
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
			className="h-2 w-full overflow-hidden rounded-full"
			style={{ backgroundColor: "#E4E7EC" }}
		>
			<Animated.View
				className="h-full rounded-full"
				style={[{ backgroundColor: "#0A84FF" }, fillStyle]}
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
	let chip: ReactNode = <Ionicons color="#A1A1AA" name={icon} size={16} />;

	if (status === "active") {
		chip = <Spinner size="sm" />;
	} else if (status === "complete") {
		chip = <Ionicons color="#0A84FF" name="checkmark" size={16} />;
	}

	return (
		<Animated.View style={rowStyle}>
			<Surface
				className="flex-row items-center gap-3 rounded-[22px] border bg-surface p-3.5"
				style={{
					borderColor:
						status === "active" ? "#0A84FF" : "rgba(24, 24, 27, 0.08)",
					opacity: isPending ? 0.55 : 1,
				}}
			>
				<View
					className="h-8 w-8 items-center justify-center rounded-full"
					style={{ backgroundColor: isPending ? "#F4F4F5" : "#EAF2FF" }}
				>
					{chip}
				</View>
				<Text
					className="flex-1"
					color={isPending ? "muted" : undefined}
					type="body-sm"
					weight="semibold"
				>
					{label}
				</Text>
				{status === "complete" ? (
					<Ionicons color="#0A84FF" name="checkmark-circle" size={18} />
				) : null}
			</Surface>
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
				className="flex-1 justify-center gap-9 px-6"
				style={{
					paddingBottom: Math.max(insets.bottom + 24, 36),
					paddingTop: Math.max(insets.top + 24, 44),
				}}
			>
				<Reveal>
					<View className="gap-6">
						<GeneratingBrandMark />
						<View className="gap-3">
							<Text.Heading className="text-5xl leading-14" type="h1">
								Building your starter trip
							</Text.Heading>
							<Text.Paragraph className="max-w-80 leading-6" color="muted">
								Your answers are being saved into an editable workspace.
							</Text.Paragraph>
						</View>
						<GenerationProgressBar progress={progress} />
					</View>
				</Reveal>
				<View className="gap-2.5">
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
	const scale = useSharedValue(0.6);
	const opacity = useSharedValue(0);
	const halo = useSharedValue(0);

	useEffect(() => {
		opacity.value = withTiming(1, {
			duration: 420,
			easing: Easing.out(Easing.cubic),
		});
		scale.value = withTiming(1, {
			duration: 720,
			easing: Easing.out(Easing.back(1.6)),
		});
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
		<View className="h-14 w-14 items-center justify-center">
			<Animated.View
				className="absolute h-14 w-14 rounded-full"
				style={[{ backgroundColor: "#0A84FF" }, haloStyle]}
			/>
			<Animated.View
				className="h-12 w-12 items-center justify-center rounded-full"
				style={[{ backgroundColor: "#EAF2FF" }, badgeStyle]}
			>
				<Ionicons color="#0A84FF" name="checkmark-sharp" size={26} />
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
	const accentForeground = useThemeColor("accent-foreground");
	const budgetAmount = parseBudgetAmount(state.budgetAmount);
	const travelerCount = parseTravelerCount(state.travelerCount) ?? 1;
	const destination = state.destination || "your trip";

	return (
		<Container className="bg-background" isScrollable={false}>
			<View className="flex-1">
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
						<View className="gap-2.5">
							<Text.Heading className="text-5xl leading-14" type="h1">
								Your starter trip is ready
							</Text.Heading>
							<Text.Paragraph className="leading-6" color="muted">
								Open the workspace to fine-tune the manual plan for{" "}
								{destination}.
							</Text.Paragraph>
						</View>
					</Reveal>
					<Reveal delayMs={260}>
						<View className="gap-3">
							<Text type="body" weight="bold">
								{state.destination || "New trip"} setup
							</Text>
							<View className="flex-row gap-3">
								<PreviewMetric
									accent="#0A84FF"
									icon="people-outline"
									label="Travelers"
									value={travelerCount.toString()}
								/>
								<PreviewMetric
									accent="#059669"
									icon="speedometer-outline"
									label="Pace"
									value={getTripCreateOptionLabel("pace", state.pace)}
								/>
								<PreviewMetric
									accent="#E97816"
									icon="wallet-outline"
									label="Budget"
									value={
										budgetAmount ? `₱${budgetAmount.toLocaleString()}` : "Open"
									}
								/>
							</View>
						</View>
					</Reveal>
					<Reveal delayMs={400}>
						<View className="gap-3">
							<Text type="body" weight="bold">
								Setup checklist
							</Text>
							{starterInsights.map((insight) => (
								<Surface
									className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3.5"
									key={insight.text}
								>
									<View
										className="h-9 w-9 items-center justify-center rounded-full"
										style={{ backgroundColor: `${insight.accent}18` }}
									>
										<Ionicons
											color={insight.accent}
											name={insight.icon}
											size={18}
										/>
									</View>
									<Text
										className="flex-1 leading-5"
										color="muted"
										type="body-sm"
									>
										{insight.text}
									</Text>
								</Surface>
							))}
						</View>
					</Reveal>
				</ScrollView>
				<Reveal delayMs={520}>
					<View
						className="absolute right-0 bottom-0 left-0 bg-background px-6"
						style={{ paddingBottom: 8 }}
					>
						<Button className="h-[54px] gap-2 rounded-full" onPress={onOpen}>
							<Button.Label className="text-[17px]">Open trip</Button.Label>
							<Ionicons
								color={accentForeground}
								name="arrow-forward"
								size={18}
							/>
						</Button>
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
	accent: string;
	icon: IconName;
	label: string;
	value: string;
}) {
	return (
		<Surface className="min-w-0 flex-1 gap-2 rounded-3xl border border-border bg-surface p-4">
			<View
				className="h-8 w-8 items-center justify-center rounded-full"
				style={{ backgroundColor: `${accent}18` }}
			>
				<Ionicons color={accent} name={icon} size={16} />
			</View>
			<View className="gap-0.5">
				<Text color="muted" type="body-xs" weight="semibold">
					{label}
				</Text>
				<Text type="body-sm" weight="bold">
					{value}
				</Text>
			</View>
		</Surface>
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
				<View className="gap-2">
					<Button isDisabled={isCreating} onPress={handleContinue} size="lg">
						{isCreating ? <Spinner size="sm" /> : null}
						<Button.Label>{primaryLabel}</Button.Label>
					</Button>
				</View>
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
