import { api } from "@viya-app/backend/convex/_generated/api";
import type {
	BudgetPreference,
	FoodPreference,
	PacePreference,
	PlanningStyle,
	SpecialNeed,
	TravelInterest,
	TravelStyle,
	UserGroupPreference,
} from "@viya-app/domain";
import {
	budgetPreferenceOptions,
	foodPreferenceOptions,
	groupPreferenceOptions,
	pacePreferenceOptions,
	planningStyleOptions,
	specialNeedOptions,
	travelInterestOptions,
	travelStyleOptions,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";

import {
	AppText,
	Chip,
	fadeIn,
	Icon,
	inputThemeProps,
	ListGroup,
	ListRow,
	PrimaryButton,
	radius,
	ScreenShell,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";

interface Option<TValue extends string> {
	description: string;
	label: string;
	value: TValue;
}

interface PreferenceFormState {
	budgetPreference: BudgetPreference;
	foodPreference: FoodPreference;
	groupPreference: UserGroupPreference;
	interests: TravelInterest[];
	pacePreference: PacePreference;
	planningStyle: PlanningStyle;
	specialNeeds: SpecialNeed[];
	specialNeedsNote: string;
	travelStyle: TravelStyle;
}

/** Saved when a person skips; every field is required by the backend. */
const defaultState: PreferenceFormState = {
	budgetPreference: "midRange",
	foodPreference: "flexible",
	groupPreference: "varies",
	interests: [],
	pacePreference: "moderate",
	planningStyle: "giveOptions",
	specialNeeds: ["none"],
	specialNeedsNote: "",
	travelStyle: "balanced",
};

const STEP_COUNT = 4;

interface ChipGroupProps<TValue extends string> {
	footer?: string;
	onToggle: (value: TValue) => void;
	options: readonly Option<TValue>[];
	selected: readonly TValue[];
	title: string;
}

function ChipGroup<TValue extends string>({
	footer,
	onToggle,
	options,
	selected,
	title,
}: ChipGroupProps<TValue>) {
	return (
		<View style={{ gap: spacing.sm }}>
			<AppText accessibilityRole="header" variant="headline">
				{title}
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				{options.map((option) => (
					<Chip
						key={option.value}
						label={option.label}
						onPress={() => onToggle(option.value)}
						selected={selected.includes(option.value)}
					/>
				))}
			</View>
			{footer ? (
				<AppText tone="secondary" variant="footnote">
					{footer}
				</AppText>
			) : null}
		</View>
	);
}

interface ChoiceGroupProps<TValue extends string> {
	onSelect: (value: TValue) => void;
	options: readonly Option<TValue>[];
	selected: TValue;
	title: string;
}

function ChoiceGroup<TValue extends string>({
	onSelect,
	options,
	selected,
	title,
}: ChoiceGroupProps<TValue>) {
	return (
		<ListGroup header={title}>
			{options.map((option) => (
				<ListRow
					accessibilityLabel={`${option.label}. ${option.description}`}
					key={option.value}
					onPress={() => onSelect(option.value)}
					showChevron={false}
					subtitle={option.description}
					title={option.label}
					trailing={
						selected === option.value ? (
							<Icon
								name="checkmark"
								size={18}
								tone="accent"
								weight="semibold"
							/>
						) : null
					}
				/>
			))}
		</ListGroup>
	);
}

const describe = <TValue extends string>(
	options: readonly Option<TValue>[],
	value: TValue
) => options.find((option) => option.value === value)?.description;

const toggleIn = <T,>(values: readonly T[], value: T) =>
	values.includes(value)
		? values.filter((v) => v !== value)
		: [...values, value];

export function PreferenceOnboardingScreen() {
	const router = useRouter();
	const { palette } = useUITheme();
	const savePreferences = useMutation(api.preferences.upsertCurrentPreferences);
	const saved = useQuery(api.preferences.getCurrentPreferences);
	const hydrated = useRef(false);
	const [step, setStep] = useState(0);
	const [form, setForm] = useState<PreferenceFormState>(defaultState);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (hydrated.current || !saved) {
			return;
		}
		hydrated.current = true;
		setForm({
			budgetPreference: saved.budgetPreference,
			foodPreference: saved.foodPreference,
			groupPreference: saved.groupPreference,
			interests: saved.interests,
			pacePreference: saved.pacePreference,
			planningStyle: saved.planningStyle,
			specialNeeds: saved.specialNeeds,
			specialNeedsNote: saved.specialNeedsNote ?? "",
			travelStyle: saved.travelStyle,
		});
	}, [saved]);
	const isLastStep = step === STEP_COUNT - 1;
	const hasNeeds = form.specialNeeds.some((need) => need !== "none");

	const update = <K extends keyof PreferenceFormState>(
		key: K,
		value: PreferenceFormState[K]
	) => {
		setErrorMessage(null);
		setForm((current) => ({ ...current, [key]: value }));
	};

	const toggleNeed = (need: SpecialNeed) => {
		setErrorMessage(null);
		setForm((current) => {
			const next =
				need === "none"
					? (["none"] as SpecialNeed[])
					: toggleIn(current.specialNeeds, need).filter((n) => n !== "none");
			return {
				...current,
				specialNeeds: next.length === 0 ? ["none"] : next,
				specialNeedsNote:
					next.length === 0 || need === "none" ? "" : current.specialNeedsNote,
			};
		});
	};

	const save = async () => {
		if (isSaving) {
			return;
		}
		setErrorMessage(null);
		setIsSaving(true);
		try {
			await savePreferences({
				...form,
				specialNeedsNote: form.specialNeedsNote.trim() || undefined,
			});
			router.replace(VIYA_ROUTES.home);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Could not save your preferences. Try again."
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleContinue = () => {
		if (isLastStep) {
			save();
			return;
		}
		setStep((current) => current + 1);
	};

	const handleBack = () => {
		setErrorMessage(null);
		setStep((current) => Math.max(0, current - 1));
	};

	const steps = [
		{
			subtitle: "Viya starts with this feel and adjusts as you plan.",
			title: "How do you like to travel?",
			content: (
				<>
					<ChipGroup
						footer={describe(travelStyleOptions, form.travelStyle)}
						onToggle={(value) => update("travelStyle", value)}
						options={travelStyleOptions}
						selected={[form.travelStyle]}
						title="Travel style"
					/>
					<ChipGroup
						footer={describe(pacePreferenceOptions, form.pacePreference)}
						onToggle={(value) => update("pacePreference", value)}
						options={pacePreferenceOptions}
						selected={[form.pacePreference]}
						title="Daily pace"
					/>
				</>
			),
		},
		{
			subtitle: "Used for cost trade-offs and how much Viya decides for you.",
			title: "Budget and suggestions",
			content: (
				<>
					<ChoiceGroup
						onSelect={(value) => update("budgetPreference", value)}
						options={budgetPreferenceOptions}
						selected={form.budgetPreference}
						title="Budget comfort"
					/>
					<ChoiceGroup
						onSelect={(value) => update("planningStyle", value)}
						options={planningStyleOptions}
						selected={form.planningStyle}
						title="How much Viya decides"
					/>
				</>
			),
		},
		{
			subtitle: "Pick everything that interests you.",
			title: "What do you enjoy?",
			content: (
				<>
					<ChipGroup
						onToggle={(value) =>
							update("interests", toggleIn(form.interests, value))
						}
						options={travelInterestOptions}
						selected={form.interests}
						title="Interests"
					/>
					<ChipGroup
						footer={describe(foodPreferenceOptions, form.foodPreference)}
						onToggle={(value) => update("foodPreference", value)}
						options={foodPreferenceOptions}
						selected={[form.foodPreference]}
						title="Food"
					/>
				</>
			),
		},
		{
			subtitle: "Viya plans around these on every trip.",
			title: "Who comes along?",
			content: (
				<>
					<ChipGroup
						footer={describe(groupPreferenceOptions, form.groupPreference)}
						onToggle={(value) => update("groupPreference", value)}
						options={groupPreferenceOptions}
						selected={[form.groupPreference]}
						title="Travelling with"
					/>
					<ChipGroup
						onToggle={toggleNeed}
						options={specialNeedOptions}
						selected={form.specialNeeds}
						title="Needs to plan around"
					/>
					{hasNeeds ? (
						<Animated.View entering={fadeIn}>
							<TextInput
								accessibilityLabel="Note about your needs"
								onChangeText={(value) => update("specialNeedsNote", value)}
								placeholder="Add a note (optional)"
								{...inputThemeProps(palette)}
								style={{
									backgroundColor: palette.surface,
									borderRadius: radius.field,
									color: palette.ink,
									fontSize: 17,
									minHeight: 50,
									paddingHorizontal: spacing.lg,
								}}
								value={form.specialNeedsNote}
							/>
						</Animated.View>
					) : null}
				</>
			),
		},
	];
	const current = steps[step] ?? steps[0];

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={{ backgroundColor: palette.canvas, flex: 1 }}
		>
			<ScreenShell
				actions={[
					{
						disabled: isSaving,
						key: "skip",
						label: "Not now",
						onPress: save,
						type: "text",
					},
				]}
				footer={
					<>
						{errorMessage ? (
							<AppText
								accessibilityLiveRegion="polite"
								accessibilityRole="alert"
								tone="danger"
								variant="subhead"
							>
								{errorMessage}
							</AppText>
						) : null}
						<PrimaryButton
							fullWidth={true}
							isPending={isSaving}
							label={isLastStep ? "Done" : "Continue"}
							onPress={handleContinue}
						/>
					</>
				}
				leading={
					step > 0
						? { icon: "chevron-back", label: "Back", onPress: handleBack }
						: "none"
				}
				summary={`Step ${step + 1} of ${STEP_COUNT}`}
				title={current.title}
			>
				<AppText tone="secondary">{current.subtitle}</AppText>
				{current.content}
			</ScreenShell>
		</KeyboardAvoidingView>
	);
}
