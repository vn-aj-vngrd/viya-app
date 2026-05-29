import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import {
	Button,
	Input,
	Label,
	Spinner,
	Surface,
	Text,
	TextArea,
	TextField,
} from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import {
	DateRangePickerField,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";
import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
import { VIYA_ROUTES } from "@/src/constants/routes";

import { LocationSuggestionField } from "./location-suggestion-field";
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

const popularDestinations = [
	"Hong Kong",
	"Tokyo",
	"Singapore",
	"Seoul",
	"Bali",
	"Bangkok",
] as const;

const generationSteps = [
	"Creating itinerary",
	"Finding useful places",
	"Estimating budget",
	"Preparing checklist",
	"Checking readiness",
] as const;

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
					boxShadow: isSelected
						? "0 12px 24px rgba(10, 132, 255, 0.12)"
						: "0 8px 18px rgba(15, 23, 42, 0.05)",
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
		<Button
			onPress={onPress}
			size="sm"
			variant={isSelected ? "primary" : "secondary"}
		>
			<Button.Label>{label}</Button.Label>
		</Button>
	);
}

function InlineTextField({
	autoCapitalize,
	keyboardType,
	label,
	onChangeText,
	placeholder,
	value,
}: {
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
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
				className="h-12 border border-border bg-surface px-4"
				keyboardType={keyboardType}
				onChangeText={onChangeText}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

function CreateFlowShell({
	children,
	errorMessage,
	footer,
	helper,
	onBack,
	step,
	title,
}: {
	children: ReactNode;
	errorMessage: string | null;
	footer: ReactNode;
	helper: string;
	onBack: () => void;
	step: TripCreateStep;
	title: string;
}) {
	const insets = useSafeAreaInsets();

	return (
		<Container className="bg-background" isScrollable={false}>
			<View className="flex-1">
				<ScrollView
					contentContainerStyle={{
						gap: 26,
						paddingBottom: 32,
						paddingHorizontal: 20,
						paddingTop: Math.max(insets.top + 6, 20),
					}}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View className="gap-5">
						<NavigationBackButton onPress={onBack} />
						<ProgressSegments step={step} />
					</View>
					<View className="gap-3">
						<Text.Heading className="text-5xl leading-14" type="h1">
							{title}
						</Text.Heading>
						<Text.Paragraph className="max-w-80 leading-6" color="muted">
							{helper}
						</Text.Paragraph>
					</View>
					<View className="gap-4">{children}</View>
					{errorMessage ? (
						<Text className="text-danger" type="body-sm">
							{errorMessage}
						</Text>
					) : null}
				</ScrollView>
				<View
					className="border-border border-t bg-background px-5 pt-3"
					style={{ paddingBottom: Math.max(insets.bottom, 16) }}
				>
					{footer}
				</View>
			</View>
		</Container>
	);
}

function DestinationMapPreview({ destination }: { destination: string }) {
	return (
		<Surface className="overflow-hidden rounded-[30px] border border-border bg-surface">
			<View
				className="relative h-52"
				style={{
					backgroundColor: "#EEF6F3",
				}}
			>
				<View className="absolute top-8 left-5 h-8 w-36 rotate-[-12deg] rounded-full bg-primary/10" />
				<View className="absolute top-24 right-0 h-10 w-48 rotate-[18deg] rounded-full bg-success/15" />
				<View className="absolute bottom-9 left-0 h-8 w-52 rotate-[24deg] rounded-full bg-warning/15" />
				<View className="absolute top-1/2 left-1/2 h-14 w-14 -translate-x-7 -translate-y-7 items-center justify-center rounded-full bg-primary/10">
					<View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
						<Ionicons color="#FFFFFF" name="location" size={18} />
					</View>
				</View>
				<View className="absolute right-4 bottom-4 left-4 rounded-[22px] bg-white/95 p-4">
					<Text type="body-sm" weight="semibold">
						{destination || "Destination anchor"}
					</Text>
					<Text color="muted" type="body-xs">
						Search sets the map anchor. A full map picker can slot in here.
					</Text>
				</View>
			</View>
		</Surface>
	);
}

function DestinationStep({
	onPopularSelect,
	onUpdate,
	searchLocationSuggestions,
	state,
}: {
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
				label="Destination"
				onChangeText={(value) => {
					onUpdate("destination", value);
					onUpdate("isDestinationUndecided", false);
				}}
				placeholder="Search city, island, or region"
				searchLocationSuggestions={searchLocationSuggestions}
				value={state.destination}
			/>
			<View className="gap-3">
				<Text color="muted" type="body-xs" weight="semibold">
					POPULAR
				</Text>
				<View className="flex-row flex-wrap gap-2">
					{popularDestinations.map((destination) => (
						<ChoiceChip
							isSelected={state.destination === destination}
							key={destination}
							label={destination}
							onPress={() => onPopularSelect(destination)}
						/>
					))}
				</View>
			</View>
			<DestinationMapPreview destination={state.destination} />
			<Button
				onPress={() => {
					onUpdate("destination", "");
					onUpdate("isDestinationUndecided", true);
				}}
				variant={state.isDestinationUndecided ? "primary" : "secondary"}
			>
				<Button.Label>I'm not sure yet</Button.Label>
			</Button>
		</View>
	);
}

function DatesStep({
	onUpdate,
	state,
}: {
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
				helperText="Viya uses dates to plan the right number of days."
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
	onUpdate,
	state,
}: {
	onUpdate: <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => void;
	state: TripCreateFlowState;
}) {
	return (
		<View className="gap-5">
			<View className="flex-row flex-wrap gap-2">
				{travelerTypeOptions.map((option) => (
					<ChoiceChip
						isSelected={state.travelerType === option}
						key={option}
						label={getTripCreateOptionLabel("travelerType", option)}
						onPress={() => onUpdate("travelerType", option)}
					/>
				))}
			</View>
			<InlineTextField
				keyboardType="numeric"
				label="Number of travelers"
				onChangeText={(value) => onUpdate("travelerCount", value)}
				placeholder="1"
				value={state.travelerCount}
			/>
		</View>
	);
}

function StylePaceStep({
	onToggleStyle,
	onUpdate,
	state,
}: {
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
	onSkip,
	onUpdate,
	state,
}: {
	onSkip: () => void;
	onUpdate: <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => void;
	state: TripCreateFlowState;
}) {
	return (
		<View className="gap-5">
			<InlineTextField
				keyboardType="numeric"
				label="Budget amount"
				onChangeText={(value) => onUpdate("budgetAmount", value)}
				placeholder="60000"
				value={state.budgetAmount}
			/>
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
			<Button onPress={onSkip} variant="tertiary">
				<Button.Label>Skip for now</Button.Label>
			</Button>
		</View>
	);
}

function ContextStep({
	onSkip,
	onUpdate,
	state,
}: {
	onSkip: () => void;
	onUpdate: <Key extends keyof TripCreateFlowState>(
		key: Key,
		value: TripCreateFlowState[Key]
	) => void;
	state: TripCreateFlowState;
}) {
	return (
		<View className="gap-5">
			<TextField className="gap-2">
				<Label>
					<Label.Text>Must-haves</Label.Text>
				</Label>
				<TextArea
					className="min-h-28 rounded-[18px] border border-border bg-surface px-4 py-3"
					onChangeText={(value) => onUpdate("mustHaves", value)}
					placeholder="Disneyland, food trip, shopping, hotel near Mong Kok"
					value={state.mustHaves}
					variant="secondary"
				/>
			</TextField>
			<TextField className="gap-2">
				<Label>
					<Label.Text>Paste booking details</Label.Text>
				</Label>
				<TextArea
					className="min-h-24 rounded-[18px] border border-border bg-surface px-4 py-3"
					onChangeText={(value) => onUpdate("pastedBookingText", value)}
					placeholder="Flight, hotel, confirmation number, arrival time"
					value={state.pastedBookingText}
					variant="secondary"
				/>
			</TextField>
			<Surface className="flex-row items-center gap-3 rounded-[24px] border border-border bg-surface p-4">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="cloud-upload-outline" size={19} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text type="body-sm" weight="semibold">
						File upload is available inside TripSync
					</Text>
					<Text color="muted" type="body-xs">
						Create the trip first, then import PDFs, screenshots, and receipts.
					</Text>
				</View>
			</Surface>
			<Button onPress={onSkip} variant="tertiary">
				<Button.Label>Skip</Button.Label>
			</Button>
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

function GeneratingScreen() {
	const insets = useSafeAreaInsets();

	return (
		<Container className="bg-background" isScrollable={false}>
			<View
				className="flex-1 justify-between px-6 pb-5"
				style={{ paddingTop: Math.max(insets.top + 24, 44) }}
			>
				<View className="flex-1 justify-center gap-8">
					<View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
						<Spinner />
					</View>
					<View className="gap-3">
						<Text.Heading className="text-5xl leading-14" type="h1">
							Viya is building your starter trip
						</Text.Heading>
						<Text.Paragraph className="max-w-80 leading-6" color="muted">
							Creating a useful workspace from your answers.
						</Text.Paragraph>
					</View>
				</View>
				<View className="gap-3">
					{generationSteps.map((step, index) => (
						<Surface
							className="flex-row items-center gap-3 rounded-[22px] border border-border bg-surface p-3"
							key={step}
						>
							<View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
								<Ionicons
									color="#0A84FF"
									name={index === 0 ? "sparkles-outline" : "checkmark"}
									size={16}
								/>
							</View>
							<Text type="body-sm" weight="semibold">
								{step}
							</Text>
						</Surface>
					))}
				</View>
			</View>
		</Container>
	);
}

function StarterPreviewScreen({
	onEdit,
	onOpen,
	state,
}: {
	onEdit: () => void;
	onOpen: () => void;
	state: TripCreateFlowState;
}) {
	const insets = useSafeAreaInsets();
	const budgetAmount = parseBudgetAmount(state.budgetAmount);
	const travelerCount = parseTravelerCount(state.travelerCount) ?? 1;

	return (
		<Container className="bg-background" isScrollable={false}>
			<View className="flex-1">
				<ScrollView
					contentContainerStyle={{
						gap: 24,
						paddingBottom: 32,
						paddingHorizontal: 20,
						paddingTop: Math.max(insets.top + 28, 48),
					}}
				>
					<View className="gap-3">
						<Text.Heading className="text-5xl leading-14" type="h1">
							Your starter trip is ready
						</Text.Heading>
						<Text.Paragraph color="muted">
							Open the workspace to edit everything Viya prepared.
						</Text.Paragraph>
					</View>
					<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
						<Text type="body" weight="bold">
							{state.destination || "New trip"} setup
						</Text>
						<View className="flex-row flex-wrap gap-3">
							<PreviewMetric
								label="Travelers"
								value={travelerCount.toString()}
							/>
							<PreviewMetric
								label="Pace"
								value={getTripCreateOptionLabel("pace", state.pace)}
							/>
							<PreviewMetric
								label="Budget"
								value={
									budgetAmount ? `₱${budgetAmount.toLocaleString()}` : "Open"
								}
							/>
						</View>
					</Surface>
					<Surface className="gap-3 rounded-[30px] border border-border bg-surface p-5">
						<Text type="body" weight="bold">
							Viya noticed
						</Text>
						{[
							"Bookings can be imported through TripSync.",
							"Readiness starts low until documents and bookings are added.",
							"Budget estimates can be refined from real receipts.",
						].map((item) => (
							<View className="flex-row gap-2" key={item}>
								<Ionicons color="#0A84FF" name="sparkles-outline" size={16} />
								<Text className="flex-1" color="muted" type="body-sm">
									{item}
								</Text>
							</View>
						))}
					</Surface>
				</ScrollView>
				<View
					className="gap-2 border-border border-t bg-background px-5 pt-3"
					style={{ paddingBottom: Math.max(insets.bottom, 16) }}
				>
					<Button onPress={onOpen} size="lg">
						<Button.Label>Open trip</Button.Label>
					</Button>
					<Button onPress={onEdit} size="lg" variant="secondary">
						<Button.Label>Edit setup</Button.Label>
					</Button>
				</View>
			</View>
		</Container>
	);
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-24 flex-1 rounded-[20px] bg-surface-secondary p-3">
			<Text color="muted" type="body-xs" weight="semibold">
				{label}
			</Text>
			<Text className="mt-1" type="body-sm" weight="bold">
				{value}
			</Text>
		</View>
	);
}

export function ManualTripCreateScreen() {
	const router = useRouter();
	const createTrip = useMutation(api.trips.createTrip);
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
			const result = await createTrip(getCreateTripPayload(state));
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
				onEdit={() => {
					setFlowPhase("flow");
					setActiveStep("review");
				}}
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
			onPopularSelect={(destination) => {
				updateState("destination", destination);
				updateState("isDestinationUndecided", false);
			}}
			onUpdate={updateState}
			searchLocationSuggestions={searchLocationSuggestions}
			state={state}
		/>
	);
	let primaryLabel = "Continue";
	let secondaryAction: ReactNode = null;

	if (activeStep === "dates") {
		title = "When is your trip?";
		helper =
			"Viya will use your dates to plan the right pace and number of days.";
		content = <DatesStep onUpdate={updateState} state={state} />;
	} else if (activeStep === "travelers") {
		title = "Who's going?";
		helper = "This helps Viya suggest the right pace, activities, and budget.";
		content = <TravelersStep onUpdate={updateState} state={state} />;
	} else if (activeStep === "style") {
		title = "What kind of trip do you want?";
		helper =
			"Pick what matters most. Viya will use this to suggest better days.";
		content = (
			<StylePaceStep
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
				onSkip={() => {
					updateState("budgetAmount", "");
					setActiveStep("context");
				}}
				onUpdate={updateState}
				state={state}
			/>
		);
	} else if (activeStep === "context") {
		title = "Anything you already want to include?";
		helper = "Add places, bookings, or notes you already have in mind.";
		content = (
			<ContextStep
				onSkip={() => setActiveStep("review")}
				onUpdate={updateState}
				state={state}
			/>
		);
	} else if (activeStep === "review") {
		title = "Review your trip";
		helper = "Check the setup before Viya creates your workspace.";
		content = <ReviewStep state={state} />;
		primaryLabel = isCreating ? "Creating..." : "Create trip";
		secondaryAction = (
			<Button
				isDisabled={isCreating}
				onPress={() => setActiveStep("destination")}
				size="lg"
				variant="secondary"
			>
				<Button.Label>Edit</Button.Label>
			</Button>
		);
	}

	return (
		<CreateFlowShell
			errorMessage={errorMessage}
			footer={
				<View className="gap-2">
					<Button isDisabled={isCreating} onPress={handleContinue} size="lg">
						{isCreating ? <Spinner size="sm" /> : null}
						<Button.Label>{primaryLabel}</Button.Label>
					</Button>
					{secondaryAction}
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
