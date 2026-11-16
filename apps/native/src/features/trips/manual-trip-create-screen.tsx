import { api } from "@viya-app/backend/convex/_generated/api";
import { getTripDayCount, rankPhilippineDestinations } from "@viya-app/domain";
import { useAction, useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import {
	DateRangeCalendar,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";
import {
	AppText,
	Chip,
	haptic,
	Icon,
	ListGroup,
	ListRow,
	metrics,
	PressableScale,
	PrimaryButton,
	ScreenShell,
	spacing,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { formatCount, formatTripRange } from "@/src/lib/format";

import { LocationSuggestionField } from "./location-suggestion-field";
import { fetchTripCoverImageUrl } from "./trip-cover-image";
import {
	createInitialTripCreateFlowState,
	durationPreferenceOptions,
	getCreateTripPayload,
	getStepError,
	getTripCreateOptionLabel,
	paceOptions,
	parseTravelerCount,
	type TravelerType,
	type TripCreateFlowState,
	type TripCreateStep,
	type TripStyle,
	travelerTypeOptions,
	tripStyleOptions,
} from "./trip-create-flow-utils";
import {
	applyTripPrefill,
	getTripPrefill,
	isPrefillComplete,
} from "./trip-prefill";
import { TripTextField } from "./trip-text-field";

/** Three screens: where, when, review. Optional detail lives on the review. */
type FlowStep = "destination" | "dates" | "review";

const flowSteps: readonly FlowStep[] = ["destination", "dates", "review"];
const maxTravelers = 20;
const suggestionLimit = 5;
/** Steps validated before the trip is created. Style and budget stay optional. */
const requiredSteps: readonly TripCreateStep[] = [
	"destination",
	"dates",
	"travelers",
	"review",
];

const stepCopy = {
	dates: { primary: "Next", title: "When?" },
	destination: { primary: "Next", title: "Where to?" },
	review: { primary: "Create trip", title: "Review" },
} as const satisfies Record<FlowStep, { primary: string; title: string }>;

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
	const excluded = new Set(
		[...existingDestinations, currentDestination]
			.map(normalizeDestinationSuggestion)
			.filter(Boolean)
	);
	const seen = new Set<string>();
	const available: string[] = [];

	for (const suggestion of suggestions) {
		const normalized = normalizeDestinationSuggestion(suggestion);

		if (!normalized || excluded.has(normalized) || seen.has(normalized)) {
			continue;
		}

		seen.add(normalized);
		available.push(suggestion);
	}

	return available;
};

const getTripLengthLabel = (state: TripCreateFlowState) => {
	const days = getTripDayCount(state.startDate, state.endDate);

	return days ? formatCount(days, "day") : null;
};

type Update = <Key extends keyof TripCreateFlowState>(
	key: Key,
	value: TripCreateFlowState[Key]
) => void;

function Block({
	children,
	footer,
	title,
}: {
	children: ReactNode;
	footer?: string | null;
	title?: string;
}) {
	return (
		<View style={{ gap: spacing.sm }}>
			{title ? (
				<AppText
					accessibilityRole="header"
					style={{ paddingHorizontal: spacing.xs }}
					tone="secondary"
					variant="footnote"
				>
					{title}
				</AppText>
			) : null}
			{children}
			{footer ? (
				<AppText
					style={{ paddingHorizontal: spacing.xs }}
					tone="secondary"
					variant="footnote"
				>
					{footer}
				</AppText>
			) : null}
		</View>
	);
}

function ChipFlow({ children }: { children: ReactNode }) {
	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
			{children}
		</View>
	);
}

function CreateFlowShell({
	children,
	footer,
	onBack,
	reason,
	step,
	title,
}: {
	children: ReactNode;
	footer: ReactNode;
	onBack: () => void;
	reason: string | null;
	step: FlowStep;
	title: string;
}) {
	const stepIndex = flowSteps.indexOf(step);

	return (
		<ScreenShell
			footer={
				<>
					{reason ? (
						<AppText
							accessibilityLiveRegion="polite"
							style={{ textAlign: "center" }}
							tone="secondary"
							variant="footnote"
						>
							{reason}
						</AppText>
					) : null}
					{footer}
				</>
			}
			leading={
				stepIndex === 0
					? "close"
					: { icon: "chevron-back", label: "Back", onPress: onBack }
			}
			summary={`Step ${stepIndex + 1} of ${flowSteps.length}`}
			title={title}
		>
			{children}
		</ScreenShell>
	);
}

function DestinationStep({
	onAskViya,
	onUpdate,
	searchLocationSuggestions,
	state,
	suggestions,
}: {
	onAskViya: () => void;
	onUpdate: Update;
	searchLocationSuggestions: (
		text: string
	) => Promise<
		Array<{ id: string; label: string; value: string; details?: string }>
	>;
	state: TripCreateFlowState;
	suggestions: readonly string[];
}) {
	return (
		<>
			<LocationSuggestionField
				label="Destination"
				onChangeText={(value) => onUpdate("destination", value)}
				placeholder="City, island or region"
				searchLocationSuggestions={searchLocationSuggestions}
				value={state.destination}
			/>
			{suggestions.length > 0 ? (
				<ListGroup header="Suggested for you">
					{suggestions.map((destination) => (
						<ListRow
							key={destination}
							leading={<Icon name="location-outline" tone="secondary" />}
							onPress={() => onUpdate("destination", destination)}
							showChevron={false}
							title={destination}
							trailing={
								state.destination === destination ? (
									<Icon name="checkmark" tone="accent" weight="semibold" />
								) : undefined
							}
						/>
					))}
				</ListGroup>
			) : null}
			<ListGroup>
				<ListRow
					leading={<Icon name="sparkles-outline" tone="secondary" />}
					onPress={onAskViya}
					subtitle="Describe what you want and Viya suggests places."
					title="Ask Viya instead"
				/>
			</ListGroup>
		</>
	);
}

function DatesStep({
	onUpdate,
	state,
}: {
	onUpdate: Update;
	state: TripCreateFlowState;
}) {
	const range: DateRangeValue = { end: state.endDate, start: state.startDate };
	const lengthLabel = getTripLengthLabel(state);

	return (
		<>
			<Block footer={lengthLabel ? `Trip length: ${lengthLabel}` : null}>
				<DateRangeCalendar
					onValueChange={(value) => {
						onUpdate("startDate", value.start);
						onUpdate("endDate", value.end);
						onUpdate("durationPreference", null);
					}}
					value={range}
				/>
			</Block>
			<Block
				footer="Pick a rough length now and set exact dates later."
				title="Not sure yet"
			>
				<ChipFlow>
					{durationPreferenceOptions.map((option) => (
						<Chip
							key={option}
							label={getTripCreateOptionLabel("durationPreference", option)}
							onPress={() => {
								onUpdate("durationPreference", option);
								onUpdate("startDate", "");
								onUpdate("endDate", "");
							}}
							selected={state.durationPreference === option}
						/>
					))}
				</ChipFlow>
			</Block>
		</>
	);
}

function Stepper({
	count,
	onChange,
}: {
	count: number;
	onChange: (count: number) => void;
}) {
	return (
		<View
			accessibilityLabel={`${count} travelers`}
			accessibilityRole="adjustable"
			accessibilityValue={{ max: maxTravelers, min: 2, now: count }}
			style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}
		>
			<PressableScale
				accessibilityLabel="Fewer travelers"
				disabled={count <= 2}
				haptic="selection"
				onPress={() => onChange(count - 1)}
				style={{
					alignItems: "center",
					height: metrics.minTarget,
					justifyContent: "center",
					opacity: count <= 2 ? 0.4 : 1,
					width: metrics.minTarget,
				}}
			>
				<Icon name="remove-circle-outline" size={24} tone="accent" />
			</PressableScale>
			<AppText style={{ minWidth: 24, textAlign: "center" }}>{count}</AppText>
			<PressableScale
				accessibilityLabel="More travelers"
				disabled={count >= maxTravelers}
				haptic="selection"
				onPress={() => onChange(count + 1)}
				style={{
					alignItems: "center",
					height: metrics.minTarget,
					justifyContent: "center",
					opacity: count >= maxTravelers ? 0.4 : 1,
					width: metrics.minTarget,
				}}
			>
				<Icon name="add-circle-outline" size={24} tone="accent" />
			</PressableScale>
		</View>
	);
}

function ReviewStep({
	onEditDates,
	onEditDestination,
	onToggleStyle,
	onUpdate,
	state,
}: {
	onEditDates: () => void;
	onEditDestination: () => void;
	onToggleStyle: (style: TripStyle) => void;
	onUpdate: Update;
	state: TripCreateFlowState;
}) {
	const travelerCount = parseTravelerCount(state.travelerCount) ?? 1;
	const isFixedCount =
		state.travelerType === "solo" || state.travelerType === "couple";
	const datesValue =
		getTripLengthLabel(state) ??
		(state.durationPreference
			? getTripCreateOptionLabel("durationPreference", state.durationPreference)
			: "Not set");
	const destinationValue = state.destination.trim() || "Not sure yet";
	const datesDetail =
		state.startDate && state.endDate
			? formatTripRange(state.startDate, state.endDate, { year: "always" })
			: undefined;

	const handleTravelerType = (option: TravelerType) => {
		onUpdate("travelerType", option);

		if (option === "solo") {
			onUpdate("travelerCount", "1");
		} else if (option === "couple") {
			onUpdate("travelerCount", "2");
		} else if (travelerCount < 2) {
			onUpdate("travelerCount", "2");
		}
	};

	return (
		<>
			<ListGroup>
				<ListRow
					accessibilityLabel={`Destination, ${destinationValue}. Edit`}
					onPress={onEditDestination}
					title="Destination"
					value={destinationValue}
				/>
				<ListRow
					accessibilityLabel={`Dates, ${datesValue}. Edit`}
					onPress={onEditDates}
					subtitle={datesDetail}
					title="Dates"
					value={datesValue}
				/>
			</ListGroup>
			<TripTextField
				autoCapitalize="words"
				helperText={
					state.destination.trim()
						? "Leave blank to name it after the destination."
						: 'Leave blank to name it "New trip".'
				}
				label="Trip name"
				onChangeText={(value) => onUpdate("title", value)}
				placeholder="Siargao with friends"
				value={state.title}
			/>
			<Block title="Travelers">
				<ChipFlow>
					{travelerTypeOptions.map((option) => (
						<Chip
							key={option}
							label={getTripCreateOptionLabel("travelerType", option)}
							onPress={() => handleTravelerType(option)}
							selected={state.travelerType === option}
						/>
					))}
				</ChipFlow>
				<ListGroup>
					<ListRow
						showChevron={false}
						title="Travelers"
						trailing={
							isFixedCount ? undefined : (
								<Stepper
									count={travelerCount}
									onChange={(count) => onUpdate("travelerCount", String(count))}
								/>
							)
						}
						value={isFixedCount ? String(travelerCount) : undefined}
					/>
				</ListGroup>
			</Block>
			<Block title="Style (optional)">
				<ChipFlow>
					{tripStyleOptions.map((option) => (
						<Chip
							key={option}
							label={getTripCreateOptionLabel("style", option)}
							onPress={() => onToggleStyle(option)}
							selected={state.styles.includes(option)}
						/>
					))}
				</ChipFlow>
				<ChipFlow>
					{paceOptions.map((option) => (
						<Chip
							key={option}
							label={getTripCreateOptionLabel("pace", option)}
							onPress={() => onUpdate("pace", option)}
							selected={state.pace === option}
						/>
					))}
				</ChipFlow>
			</Block>
			<TripTextField
				helperText={
					state.budgetScope === "perPerson"
						? `Per person. Saved as a total for ${formatCount(travelerCount, "traveler")}.`
						: "The total you want to track for the whole trip."
				}
				keyboardType="numeric"
				label="Budget (₱)"
				onChangeText={(value) => onUpdate("budgetAmount", value)}
				placeholder="25,000"
				value={state.budgetAmount}
			/>
		</>
	);
}

function CreatingState() {
	return (
		<ScreenShell
			leading="none"
			state={{ kind: "loading", title: "Creating your trip" }}
			title="New trip"
		/>
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
	const params = useLocalSearchParams();
	const [prefill] = useState(() => getTripPrefill(params));
	const [activeStep, setActiveStep] = useState<FlowStep>(
		isPrefillComplete(prefill) ? "review" : "destination"
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [state, setState] = useState<TripCreateFlowState>(() =>
		applyTripPrefill(createInitialTripCreateFlowState(), prefill)
	);
	const searchLocationSuggestions = useCallback(
		(text: string) => runLocationSuggestionSearch({ text }),
		[runLocationSuggestionSearch]
	);
	const suggestions = useMemo(() => {
		const ranked = rankPhilippineDestinations({
			preferences: currentPreferences ?? undefined,
		});

		return getUniqueAvailableDestinationSuggestions({
			currentDestination: state.destination,
			existingDestinations: (existingTrips ?? []).map(
				(trip) => trip.destination
			),
			suggestions: ranked.map((item) => item.destination.name),
		}).slice(0, suggestionLimit);
	}, [currentPreferences, existingTrips, state.destination]);

	const update: Update = (key, value) => {
		setState((current) => ({ ...current, [key]: value }));
		setErrorMessage(null);
	};

	const handleToggleStyle = (style: TripStyle) => {
		setState((current) => ({
			...current,
			styles: current.styles.includes(style)
				? current.styles.filter((item) => item !== style)
				: [...current.styles, style],
		}));
	};

	const stepIndex = flowSteps.indexOf(activeStep);
	const reason = (() => {
		if (activeStep === "review") {
			for (const step of requiredSteps) {
				const error = getStepError(state, step);

				if (error) {
					return error;
				}
			}

			return null;
		}

		return getStepError(state, activeStep);
	})();

	const handleBack = () => {
		setErrorMessage(null);

		if (stepIndex === 0) {
			router.back();
			return;
		}

		setActiveStep(flowSteps[stepIndex - 1] ?? "destination");
	};

	const handleCreate = async () => {
		setIsCreating(true);
		setErrorMessage(null);

		try {
			const payload = getCreateTripPayload(state);
			const coverImageUrl = await fetchTripCoverImageUrl(payload.destination);
			const result = await createTrip({ ...payload, coverImageUrl });
			haptic("success");
			router.replace(VIYA_ROUTES.tripDashboard(result.tripId));
		} catch (error) {
			haptic("error");
			setIsCreating(false);
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Could not create this trip. Try again."
			);
		}
	};

	const handleContinue = async () => {
		if (reason) {
			haptic("warning");
			setErrorMessage(reason);
			return;
		}

		if (activeStep === "review") {
			await handleCreate();
			return;
		}

		setActiveStep(flowSteps[stepIndex + 1] ?? "review");
	};

	if (isCreating) {
		return <CreatingState />;
	}

	let content: ReactNode = (
		<DestinationStep
			onAskViya={() => router.push(VIYA_ROUTES.ai)}
			onUpdate={update}
			searchLocationSuggestions={searchLocationSuggestions}
			state={state}
			suggestions={suggestions}
		/>
	);

	if (activeStep === "dates") {
		content = <DatesStep onUpdate={update} state={state} />;
	} else if (activeStep === "review") {
		content = (
			<ReviewStep
				onEditDates={() => setActiveStep("dates")}
				onEditDestination={() => setActiveStep("destination")}
				onToggleStyle={handleToggleStyle}
				onUpdate={update}
				state={state}
			/>
		);
	}

	return (
		<CreateFlowShell
			footer={
				<PrimaryButton
					disabled={Boolean(reason)}
					label={stepCopy[activeStep].primary}
					onPress={() => {
						handleContinue().catch(() => undefined);
					}}
				/>
			}
			onBack={handleBack}
			reason={errorMessage ?? reason}
			step={activeStep}
			title={stepCopy[activeStep].title}
		>
			{content}
		</CreateFlowShell>
	);
}
