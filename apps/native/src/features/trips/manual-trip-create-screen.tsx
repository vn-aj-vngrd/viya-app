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
} from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ViyaMark } from "@/src/components/viya-mark";
import { VIYA_ROUTES } from "@/src/constants/routes";

import { LocationSuggestionField } from "./location-suggestion-field";
import { fetchTripCoverImageUrl } from "./trip-cover-image";
import {
	type BudgetSuggestionSource,
	budgetScopeOptions,
	budgetStrictnessOptions,
	createInitialTripCreateFlowState,
	durationPreferenceOptions,
	getCreateTripPayload,
	getCreateTripReviewRows,
	getStepError,
	getSuggestedBudgetAmount,
	getSuggestedBudgetPrefill,
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
type BudgetSuggestionStatus = "idle" | "loading" | "ready" | "error";

interface BudgetSuggestionResult {
	amount: number;
	rationale: string;
	source: BudgetSuggestionSource;
}

const generationSteps = [
	{ icon: "map-outline", label: "Creating itinerary" },
	{ icon: "compass-outline", label: "Finding useful places" },
	{ icon: "wallet-outline", label: "Estimating budget" },
	{ icon: "checkbox-outline", label: "Preparing checklist" },
	{ icon: "shield-checkmark-outline", label: "Checking readiness" },
] as const satisfies readonly { icon: IconName; label: string }[];
const stepAdvanceIntervalMs = 1500;

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
		text: "Budget estimates can be refined from real receipts.",
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
				helperText="Viya uses dates to plan the right number of days."
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
	suggestion,
	suggestionStatus,
	state,
}: {
	errorMessage?: string | null;
	onUpdate: <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => void;
	suggestion?: BudgetSuggestionResult | null;
	suggestionStatus: BudgetSuggestionStatus;
	state: TripCreateFlowState;
}) {
	const aiSuggestion = suggestion?.source === "ai" ? suggestion : null;
	const suggestedBudgetAmount = aiSuggestion?.amount;
	const suggestedBudgetLabel = suggestedBudgetAmount
		? `₱${suggestedBudgetAmount.toLocaleString()}`
		: undefined;
	let helperText: string | undefined;

	if (aiSuggestion) {
		helperText = `AI suggests ${suggestedBudgetLabel} based on your previous answers.`;
	} else if (
		suggestion?.source === "fallback" ||
		suggestionStatus === "error"
	) {
		helperText =
			"AI budget suggestion is unavailable. Enter your budget manually.";
	}

	const isSuggestionLoading = suggestionStatus === "loading";

	return (
		<View className="gap-5">
			<View className="gap-2">
				<InlineTextField
					errorText={errorMessage ?? undefined}
					helperText={helperText}
					isInvalid={Boolean(errorMessage)}
					keyboardType="numeric"
					label="Budget amount"
					onChangeText={(value) => onUpdate("budgetAmount", value)}
					placeholder={suggestedBudgetAmount?.toString() ?? "Enter amount"}
					value={state.budgetAmount}
				/>
				{isSuggestionLoading && !errorMessage ? (
					<View className="flex-row items-center gap-2">
						<Spinner size="sm" />
						<Text color="muted" type="body-xs">
							Viya is estimating a budget...
						</Text>
					</View>
				) : null}
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
		<View className="h-24 w-24 items-center justify-center">
			<Animated.View
				className="absolute h-24 w-24 rounded-full"
				style={[{ backgroundColor: "#0A84FF" }, outerRingStyle]}
			/>
			<Animated.View
				className="absolute h-24 w-24 rounded-full"
				style={[{ backgroundColor: "#0A84FF" }, innerRingStyle]}
			/>
			<View
				className="h-[68px] w-[68px] items-center justify-center rounded-[26px] border border-border bg-surface"
				style={{
					shadowColor: "#0A84FF",
					shadowOffset: { height: 8, width: 0 },
					shadowOpacity: 0.18,
					shadowRadius: 18,
				}}
			>
				<ViyaMark size={42} />
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
	let chip: ReactNode = <Ionicons color="#A1A1AA" name={icon} size={18} />;

	if (status === "active") {
		chip = <Spinner size="sm" />;
	} else if (status === "complete") {
		chip = <Ionicons color="#0A84FF" name="checkmark" size={18} />;
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
					className="h-9 w-9 items-center justify-center rounded-full"
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
					<Ionicons color="#0A84FF" name="checkmark-circle" size={20} />
				) : null}
			</Surface>
		</Animated.View>
	);
}

function GeneratingScreen() {
	const insets = useSafeAreaInsets();
	const [activeIndex, setActiveIndex] = useState(0);
	const lastIndex = generationSteps.length - 1;

	useEffect(() => {
		if (activeIndex >= lastIndex) {
			return;
		}

		const timer = setTimeout(() => {
			setActiveIndex((current) => Math.min(current + 1, lastIndex));
		}, stepAdvanceIntervalMs);

		return () => clearTimeout(timer);
	}, [activeIndex, lastIndex]);

	const progress = (activeIndex + 0.5) / generationSteps.length;

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
								Viya is turning your answers into a workspace you can edit.
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
		<View className="h-[76px] w-[76px] items-center justify-center">
			<Animated.View
				className="absolute h-[76px] w-[76px] rounded-full"
				style={[{ backgroundColor: "#0A84FF" }, haloStyle]}
			/>
			<Animated.View
				className="h-[64px] w-[64px] items-center justify-center rounded-[24px]"
				style={[{ backgroundColor: "#EAF2FF" }, badgeStyle]}
			>
				<Ionicons color="#0A84FF" name="checkmark-sharp" size={36} />
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
	const budgetAmount = parseBudgetAmount(state.budgetAmount);
	const travelerCount = parseTravelerCount(state.travelerCount) ?? 1;
	const destination = state.destination || "your trip";

	return (
		<Container className="bg-background" isScrollable={false}>
			<View className="flex-1">
				<ScrollView
					contentContainerStyle={{
						gap: 20,
						paddingBottom: 32,
						paddingHorizontal: 20,
						paddingTop: Math.max(insets.top + 28, 48),
					}}
					showsVerticalScrollIndicator={false}
				>
					<StarterSuccessBadge />
					<Reveal delayMs={120}>
						<View className="gap-2.5">
							<View className="flex-row items-center gap-2">
								<View
									className="h-1.5 w-1.5 rounded-full"
									style={{ backgroundColor: "#059669" }}
								/>
								<Text style={{ color: "#059669" }} type="body-xs" weight="bold">
									READY TO EXPLORE
								</Text>
							</View>
							<Text.Heading className="text-5xl leading-14" type="h1">
								Your starter trip is ready
							</Text.Heading>
							<Text.Paragraph className="leading-6" color="muted">
								Open the workspace to fine-tune everything Viya prepared for{" "}
								{destination}.
							</Text.Paragraph>
						</View>
					</Reveal>
					<Reveal delayMs={260}>
						<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
							<Text type="body" weight="bold">
								{state.destination || "New trip"} setup
							</Text>
							<View className="flex-row">
								<PreviewMetric
									accent="#0A84FF"
									icon="people-outline"
									label="Travelers"
									value={travelerCount.toString()}
								/>
								<View className="mx-3 w-px self-stretch bg-border" />
								<PreviewMetric
									accent="#059669"
									icon="speedometer-outline"
									label="Pace"
									value={getTripCreateOptionLabel("pace", state.pace)}
								/>
								<View className="mx-3 w-px self-stretch bg-border" />
								<PreviewMetric
									accent="#E97816"
									icon="wallet-outline"
									label="Budget"
									value={
										budgetAmount ? `₱${budgetAmount.toLocaleString()}` : "Open"
									}
								/>
							</View>
						</Surface>
					</Reveal>
					<Reveal delayMs={400}>
						<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
							<Text type="body" weight="bold">
								Viya noticed
							</Text>
							{starterInsights.map((insight) => (
								<View
									className="flex-row items-center gap-3"
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
								</View>
							))}
						</Surface>
					</Reveal>
				</ScrollView>
				<Reveal delayMs={520}>
					<View
						className="border-border border-t bg-background px-5 pt-3"
						style={{ paddingBottom: Math.max(insets.bottom, 16) }}
					>
						<Button onPress={onOpen} size="lg">
							<Button.Label>Open trip</Button.Label>
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
		<View className="min-w-0 flex-1 gap-2">
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
		</View>
	);
}

export function ManualTripCreateScreen() {
	const router = useRouter();
	const createTrip = useMutation(api.trips.createTrip);
	const currentPreferences = useQuery(api.preferences.getCurrentPreferences);
	const generateBudgetSuggestion = useAction(
		api.ai.features.generateBudgetSuggestion
	);
	const runLocationSuggestionSearch = useAction(
		api.locations.searchLocationSuggestions
	);
	const [activeStep, setActiveStep] = useState<TripCreateStep>("destination");
	const [createdTripId, setCreatedTripId] = useState<Id<"trips"> | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [flowPhase, setFlowPhase] = useState<FlowPhase>("flow");
	const [isCreating, setIsCreating] = useState(false);
	const [budgetSuggestion, setBudgetSuggestion] =
		useState<BudgetSuggestionResult | null>(null);
	const [budgetSuggestionStatus, setBudgetSuggestionStatus] =
		useState<BudgetSuggestionStatus>("idle");
	const lastAppliedBudgetSuggestionRef = useRef<string | null>(null);
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

		return [
			...suggestions.countrySuggestions.map((suggestion) => suggestion.country),
			...suggestions.placeSuggestions.map((suggestion) => suggestion.location),
		].slice(0, 6);
	}, [currentPreferences]);
	const {
		budgetScope,
		budgetStrictness,
		destination,
		durationPreference,
		endDate,
		pace,
		startDate,
		styles,
		travelerCount,
		travelerType,
	} = state;
	const budgetSuggestionRequest = useMemo(() => {
		const suggestionState: TripCreateFlowState = {
			...createInitialTripCreateFlowState(),
			budgetScope,
			budgetStrictness,
			destination,
			durationPreference,
			endDate,
			pace,
			startDate,
			styles,
			travelerCount,
			travelerType,
		};

		return {
			budgetScope,
			budgetStrictness,
			destination,
			durationPreference: durationPreference ?? undefined,
			endDate,
			heuristicAmount: getSuggestedBudgetAmount(suggestionState),
			pace,
			startDate,
			styles,
			travelerCount,
			travelerType,
		};
	}, [
		budgetScope,
		budgetStrictness,
		destination,
		durationPreference,
		endDate,
		pace,
		startDate,
		styles,
		travelerCount,
		travelerType,
	]);

	useEffect(() => {
		if (activeStep !== "budget") {
			return;
		}

		let isCurrent = true;
		setBudgetSuggestion(null);
		setBudgetSuggestionStatus("loading");

		const loadBudgetSuggestion = async () => {
			try {
				const suggestion = await generateBudgetSuggestion(
					budgetSuggestionRequest
				);

				if (!isCurrent) {
					return;
				}

				setBudgetSuggestion(suggestion);
				setBudgetSuggestionStatus("ready");
				setState((currentState) => {
					const nextBudgetAmount = getSuggestedBudgetPrefill(
						currentState.budgetAmount,
						suggestion.amount,
						lastAppliedBudgetSuggestionRef.current ?? undefined,
						suggestion.source
					);

					if (nextBudgetAmount === currentState.budgetAmount) {
						return currentState;
					}

					lastAppliedBudgetSuggestionRef.current = nextBudgetAmount;

					return { ...currentState, budgetAmount: nextBudgetAmount };
				});
			} catch {
				if (isCurrent) {
					setBudgetSuggestionStatus("error");
				}
			}
		};

		loadBudgetSuggestion();

		return () => {
			isCurrent = false;
		};
	}, [activeStep, budgetSuggestionRequest, generateBudgetSuggestion]);

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
			const coverImageUrl = await fetchTripCoverImageUrl(payload.destination);
			const result = await createTrip({ ...payload, coverImageUrl });
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
		"Choose a destination so Viya can build your trip around the right place.";
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
		helper =
			"Viya will use your dates to plan the right pace and number of days.";
		content = (
			<DatesStep
				errorMessage={errorMessage}
				onUpdate={updateState}
				state={state}
			/>
		);
	} else if (activeStep === "travelers") {
		title = "Who's going?";
		helper = "This helps Viya suggest the right pace, activities, and budget.";
		content = (
			<TravelersStep
				errorMessage={errorMessage}
				onUpdate={updateState}
				state={state}
			/>
		);
	} else if (activeStep === "style") {
		title = "What kind of trip do you want?";
		helper =
			"Pick what matters most. Viya will use this to suggest better days.";
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
		helper = "Viya can warn you if the plan becomes too expensive.";
		content = (
			<BudgetStep
				errorMessage={errorMessage}
				onUpdate={updateState}
				state={state}
				suggestion={budgetSuggestion}
				suggestionStatus={budgetSuggestionStatus}
			/>
		);
	} else if (activeStep === "review") {
		title = "Review your trip";
		helper = "Check the setup before Viya creates your workspace.";
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
