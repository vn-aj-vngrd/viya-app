import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
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
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import {
	Button,
	Input,
	Spinner,
	Surface,
	Text,
	TextField,
} from "heroui-native";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	runOnJS,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";

import { Container } from "@/components/container";
import { ViyaMark } from "@/src/components/viya-mark";

interface PreferenceFormState {
	budgetPreference: BudgetPreference | null;
	foodPreference: FoodPreference | null;
	groupPreference: UserGroupPreference | null;
	interests: TravelInterest[];
	pacePreference: PacePreference | null;
	planningStyle: PlanningStyle | null;
	specialNeeds: SpecialNeed[];
	specialNeedsNote: string;
	travelStyle: TravelStyle | null;
}

type SingleQuestionKey = Exclude<
	keyof PreferenceFormState,
	"interests" | "specialNeeds" | "specialNeedsNote"
>;
type QuestionKey = Exclude<keyof PreferenceFormState, "specialNeedsNote">;
type IntroStage = "brand" | "questions" | "welcome";
type SetupPreviewIconName = ComponentProps<typeof Ionicons>["name"];
interface PreferenceOption {
	description: string;
	label: string;
	value: string;
}

interface Question {
	key: QuestionKey;
	mode: "multi" | "single";
	subtitle: string;
	title: string;
}

const questions = [
	{
		key: "travelStyle",
		mode: "single",
		subtitle: "This sets the default feel of your suggestions.",
		title: "What trip vibe do you usually want?",
	},
	{
		key: "pacePreference",
		mode: "single",
		subtitle: "Viya uses this to avoid days that feel too empty or too tight.",
		title: "How packed should your days feel?",
	},
	{
		key: "budgetPreference",
		mode: "single",
		subtitle: "This shapes the cost tradeoffs in suggestions.",
		title: "What budget comfort fits you best?",
	},
	{
		key: "interests",
		mode: "multi",
		subtitle: "Pick every theme you want Viya to consider.",
		title: "What should Viya look for?",
	},
	{
		key: "foodPreference",
		mode: "single",
		subtitle: "Food can be a highlight, a constraint, or just a break.",
		title: "How should food fit into your trips?",
	},
	{
		key: "groupPreference",
		mode: "single",
		subtitle: "This helps Viya suggest the right level of coordination.",
		title: "Who do you usually travel with?",
	},
	{
		key: "planningStyle",
		mode: "single",
		subtitle: "Choose how proactive Viya should be.",
		title: "How should Viya make suggestions?",
	},
	{
		key: "specialNeeds",
		mode: "multi",
		subtitle: "These become safeguards in future recommendations.",
		title: "Any needs Viya should remember?",
	},
] as const satisfies readonly Question[];

const initialFormState = {
	budgetPreference: null,
	foodPreference: null,
	groupPreference: null,
	interests: [],
	pacePreference: null,
	planningStyle: null,
	specialNeeds: [],
	specialNeedsNote: "",
	travelStyle: null,
} satisfies PreferenceFormState;

const optionGroups = {
	budgetPreference: budgetPreferenceOptions,
	foodPreference: foodPreferenceOptions,
	groupPreference: groupPreferenceOptions,
	interests: travelInterestOptions,
	pacePreference: pacePreferenceOptions,
	planningStyle: planningStyleOptions,
	specialNeeds: specialNeedOptions,
	travelStyle: travelStyleOptions,
} as const;

const setupPreviewCards = [
	{
		accent: "#0A84FF",
		description: "Relaxed, balanced, packed, or adventurous.",
		icon: "sparkles-outline",
		title: "Trip vibe",
	},
	{
		accent: "#059669",
		description: "How full each day should feel.",
		icon: "speedometer-outline",
		title: "Daily pace",
	},
	{
		accent: "#E97816",
		description: "Value, mid-range, or premium comfort.",
		icon: "wallet-outline",
		title: "Budget feel",
	},
	{
		accent: "#DB2777",
		description: "Food, group style, and helpful notes.",
		icon: "heart-outline",
		title: "Travel needs",
	},
] as const satisfies readonly {
	accent: string;
	description: string;
	icon: SetupPreviewIconName;
	title: string;
}[];

const hasCompletedQuestion = (
	formState: PreferenceFormState,
	question: Question
) => {
	const value = formState[question.key];

	if (Array.isArray(value)) {
		return value.length > 0;
	}

	return Boolean(value);
};

const getQuestionAtIndex = (index: number): Question =>
	questions[index] ?? (questions[0] as Question);

function ProgressSegments({ activeIndex }: { activeIndex: number }) {
	return (
		<View className="flex-row gap-1.5">
			{questions.map((question, index) => {
				const isComplete = index <= activeIndex;

				return (
					<View
						className="h-2 flex-1 rounded-full"
						key={question.key}
						style={{
							backgroundColor: isComplete ? "#0A84FF" : "#E4E7EC",
						}}
					/>
				);
			})}
		</View>
	);
}

function BrandIntroScreen({
	memberSince,
	name,
	onComplete,
}: {
	memberSince: string;
	name: string;
	onComplete: () => void;
}) {
	const brandOpacity = useSharedValue(0);
	const brandTranslateY = useSharedValue(18);
	const greetingOpacity = useSharedValue(0);
	const greetingTranslateY = useSharedValue(18);
	const messageOpacity = useSharedValue(0);
	const messageTranslateY = useSharedValue(18);
	const memberOpacity = useSharedValue(0);
	const memberTranslateY = useSharedValue(18);
	const screenOpacity = useSharedValue(1);
	const welcomeOpacity = useSharedValue(0);
	const welcomeTranslateY = useSharedValue(18);

	useEffect(() => {
		const fadeInConfig = {
			duration: 850,
			easing: Easing.out(Easing.cubic),
		};

		brandOpacity.value = withDelay(250, withTiming(1, fadeInConfig));
		brandTranslateY.value = withDelay(250, withTiming(0, fadeInConfig));
		welcomeOpacity.value = withDelay(950, withTiming(1, fadeInConfig));
		welcomeTranslateY.value = withDelay(950, withTiming(0, fadeInConfig));
		greetingOpacity.value = withDelay(1650, withTiming(1, fadeInConfig));
		greetingTranslateY.value = withDelay(1650, withTiming(0, fadeInConfig));
		messageOpacity.value = withDelay(2350, withTiming(1, fadeInConfig));
		messageTranslateY.value = withDelay(2350, withTiming(0, fadeInConfig));
		memberOpacity.value = withDelay(3050, withTiming(1, fadeInConfig));
		memberTranslateY.value = withDelay(3050, withTiming(0, fadeInConfig));
		screenOpacity.value = withDelay(
			5200,
			withTiming(
				0,
				{
					duration: 650,
					easing: Easing.inOut(Easing.cubic),
				},
				(isFinished) => {
					if (isFinished) {
						runOnJS(onComplete)();
					}
				}
			)
		);

		return () => {
			cancelAnimation(brandOpacity);
			cancelAnimation(brandTranslateY);
			cancelAnimation(greetingOpacity);
			cancelAnimation(greetingTranslateY);
			cancelAnimation(messageOpacity);
			cancelAnimation(messageTranslateY);
			cancelAnimation(memberOpacity);
			cancelAnimation(memberTranslateY);
			cancelAnimation(screenOpacity);
			cancelAnimation(welcomeOpacity);
			cancelAnimation(welcomeTranslateY);
		};
	}, [
		brandOpacity,
		brandTranslateY,
		greetingOpacity,
		greetingTranslateY,
		messageOpacity,
		messageTranslateY,
		memberOpacity,
		memberTranslateY,
		onComplete,
		screenOpacity,
		welcomeOpacity,
		welcomeTranslateY,
	]);

	const screenStyle = useAnimatedStyle(() => ({
		opacity: screenOpacity.value,
	}));
	const brandStyle = useAnimatedStyle(() => ({
		opacity: brandOpacity.value,
		transform: [{ translateY: brandTranslateY.value }],
	}));
	const greetingStyle = useAnimatedStyle(() => ({
		opacity: greetingOpacity.value,
		transform: [{ translateY: greetingTranslateY.value }],
	}));
	const messageStyle = useAnimatedStyle(() => ({
		opacity: messageOpacity.value,
		transform: [{ translateY: messageTranslateY.value }],
	}));
	const welcomeStyle = useAnimatedStyle(() => ({
		opacity: welcomeOpacity.value,
		transform: [{ translateY: welcomeTranslateY.value }],
	}));
	const memberStyle = useAnimatedStyle(() => ({
		opacity: memberOpacity.value,
		transform: [{ translateY: memberTranslateY.value }],
	}));

	return (
		<Container className="bg-background" isScrollable={false}>
			<Animated.View
				className="flex-1 justify-between px-7 pt-12 pb-8"
				style={screenStyle}
			>
				<View className="flex-1 justify-center gap-9">
					<Animated.View style={brandStyle}>
						<ViyaMark size={58} />
					</Animated.View>

					<View className="gap-2">
						<Animated.View style={welcomeStyle}>
							<Text.Heading
								className="text-6xl leading-16"
								type="h1"
								weight="semibold"
							>
								Welcome.
							</Text.Heading>
						</Animated.View>
						<Animated.View style={greetingStyle}>
							<Text.Heading
								className="text-4xl leading-10.5"
								type="h2"
								weight="semibold"
							>
								Hi {name},
							</Text.Heading>
						</Animated.View>
						<Animated.View style={messageStyle}>
							<Text.Paragraph
								className="max-w-72.5 leading-6"
								color="muted"
								type="body"
							>
								Thanks for being with Viya!
							</Text.Paragraph>
						</Animated.View>
					</View>
				</View>

				<Animated.View style={memberStyle}>
					<Text color="muted" type="h4">
						{memberSince}
					</Text>
				</Animated.View>
			</Animated.View>
		</Container>
	);
}

function SetupPreviewCard({
	accent,
	description,
	icon,
	title,
}: {
	accent: string;
	description: string;
	icon: SetupPreviewIconName;
	title: string;
}) {
	return (
		<Surface className="w-[48%] gap-3 rounded-3xl border border-border bg-surface p-4">
			<View
				className="h-10 w-10 items-center justify-center rounded-full"
				style={{ backgroundColor: `${accent}18` }}
			>
				<Ionicons color={accent} name={icon} size={18} />
			</View>
			<View className="gap-1">
				<Text type="body-sm" weight="semibold">
					{title}
				</Text>
				<Text.Paragraph color="muted" type="body-xs">
					{description}
				</Text.Paragraph>
			</View>
		</Surface>
	);
}

function useRevealAnimatedStyle(progress: SharedValue<number>) {
	return useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [
			{ translateY: (1 - progress.value) * 18 },
			{ scale: 0.98 + progress.value * 0.02 },
		],
	}));
}

function WelcomeIntroScreen({ onContinue }: { onContinue: () => void }) {
	const contentProgress = useSharedValue(0);
	const controlsProgress = useSharedValue(0);
	const previewProgress = useSharedValue(0);
	const screenProgress = useSharedValue(0);

	useEffect(() => {
		const revealConfig = {
			duration: 700,
			easing: Easing.out(Easing.cubic),
		};

		screenProgress.value = withTiming(1, {
			duration: 420,
			easing: Easing.out(Easing.cubic),
		});
		contentProgress.value = withDelay(160, withTiming(1, revealConfig));
		previewProgress.value = withDelay(520, withTiming(1, revealConfig));
		controlsProgress.value = withDelay(740, withTiming(1, revealConfig));

		return () => {
			cancelAnimation(contentProgress);
			cancelAnimation(controlsProgress);
			cancelAnimation(previewProgress);
			cancelAnimation(screenProgress);
		};
	}, [contentProgress, controlsProgress, previewProgress, screenProgress]);

	const contentStyle = useRevealAnimatedStyle(contentProgress);
	const controlsStyle = useRevealAnimatedStyle(controlsProgress);
	const previewStyle = useRevealAnimatedStyle(previewProgress);
	const screenStyle = useAnimatedStyle(() => ({
		opacity: screenProgress.value,
	}));

	return (
		<Container className="bg-background" isScrollable={false}>
			<Animated.View
				className="flex-1 justify-between px-6 pt-8 pb-5"
				style={screenStyle}
			>
				<View className="gap-7">
					<Animated.View className="gap-3 pt-16" style={contentStyle}>
						<Text.Heading className="text-5xl leading-14" type="h1">
							Tell us how you like to travel.
						</Text.Heading>
						<Text.Paragraph className="max-w-77.5 leading-6" color="muted">
							Answer eight quick questions so your home and trip suggestions
							match your pace, budget, interests, and needs.
						</Text.Paragraph>
					</Animated.View>
				</View>

				<View className="gap-4">
					<Animated.View
						className="flex-row flex-wrap justify-between gap-y-3"
						style={previewStyle}
					>
						{setupPreviewCards.map((card) => (
							<SetupPreviewCard
								accent={card.accent}
								description={card.description}
								icon={card.icon}
								key={card.title}
								title={card.title}
							/>
						))}
					</Animated.View>
					<Animated.View style={controlsStyle}>
						<Button onPress={onContinue}>
							<Button.Label>Get started</Button.Label>
						</Button>
					</Animated.View>
				</View>
			</Animated.View>
		</Container>
	);
}

function PreferenceOptionButton({
	currentQuestion,
	index,
	isSelected,
	onMultiToggle,
	onSingleSelect,
	option,
}: {
	currentQuestion: Question;
	index: number;
	isSelected: boolean;
	onMultiToggle: (
		key: "interests" | "specialNeeds",
		value: TravelInterest | SpecialNeed
	) => void;
	onSingleSelect: (
		key: SingleQuestionKey,
		value: PreferenceFormState[SingleQuestionKey]
	) => void;
	option: PreferenceOption;
}) {
	const optionProgress = useSharedValue(0);

	useEffect(() => {
		optionProgress.value = 0;
		optionProgress.value = withDelay(
			index * 70,
			withTiming(1, {
				duration: 460,
				easing: Easing.out(Easing.cubic),
			})
		);

		return () => {
			cancelAnimation(optionProgress);
		};
	}, [index, optionProgress]);

	const optionStyle = useAnimatedStyle(() => ({
		opacity: optionProgress.value,
		transform: [
			{ translateY: (1 - optionProgress.value) * 18 },
			{ scale: 0.985 + optionProgress.value * 0.015 },
		],
	}));

	return (
		<Animated.View style={optionStyle}>
			<Pressable
				accessibilityRole="button"
				className="rounded-3xl"
				onPress={() => {
					if (currentQuestion.mode === "multi") {
						onMultiToggle(
							currentQuestion.key as "interests" | "specialNeeds",
							option.value as TravelInterest | SpecialNeed
						);
						return;
					}

					onSingleSelect(
						currentQuestion.key as SingleQuestionKey,
						option.value as PreferenceFormState[SingleQuestionKey]
					);
				}}
			>
				<Surface
					className="flex-row items-center gap-3 rounded-3xl border bg-surface p-4"
					style={{
						borderColor: isSelected ? "#0A84FF" : "rgba(24, 24, 27, 0.08)",
					}}
				>
					<View
						className="h-9 w-9 items-center justify-center rounded-full"
						style={{
							backgroundColor: isSelected ? "#EAF2FF" : "#F4F4F5",
						}}
					>
						<Ionicons
							color={isSelected ? "#0A84FF" : "#71717A"}
							name={isSelected ? "checkmark" : "ellipse-outline"}
							size={18}
						/>
					</View>
					<View className="flex-1 gap-1">
						<Text type="body-sm" weight="semibold">
							{option.label}
						</Text>
						<Text.Paragraph color="muted" type="body-xs">
							{option.description}
						</Text.Paragraph>
					</View>
				</Surface>
			</Pressable>
		</Animated.View>
	);
}

export function PreferenceOnboardingScreen() {
	const router = useRouter();
	const { user } = useUser();
	const savePreferences = useMutation(api.preferences.upsertCurrentPreferences);
	const [introStage, setIntroStage] = useState<IntroStage>("brand");
	const [currentIndex, setCurrentIndex] = useState(0);
	const [formState, setFormState] =
		useState<PreferenceFormState>(initialFormState);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const currentQuestion = getQuestionAtIndex(currentIndex);
	const canContinue = hasCompletedQuestion(formState, currentQuestion);
	const isLastQuestion = currentIndex === questions.length - 1;
	const selectedSpecialNeeds = formState.specialNeeds.filter(
		(need) => need !== "none"
	);

	const options = useMemo(
		() => optionGroups[currentQuestion.key],
		[currentQuestion.key]
	);
	const firstName = user?.firstName ?? user?.fullName?.split(" ")[0] ?? "there";
	const memberSince = `Member since ${
		user?.createdAt ? new Date(user.createdAt).getFullYear() : "2026"
	}`;

	const handleSingleSelect = (
		key: SingleQuestionKey,
		value: PreferenceFormState[SingleQuestionKey]
	) => {
		setErrorMessage(null);
		setFormState((currentFormState) => ({
			...currentFormState,
			[key]: value,
		}));
	};

	const handleMultiToggle = (
		key: "interests" | "specialNeeds",
		value: TravelInterest | SpecialNeed
	) => {
		setErrorMessage(null);
		setFormState((currentFormState) => {
			const currentValues = currentFormState[key] as string[];
			const nextValues = currentValues.includes(value)
				? currentValues.filter((item) => item !== value)
				: [...currentValues, value];

			if (key === "specialNeeds") {
				const normalizedValues =
					value === "none"
						? ["none"]
						: nextValues.filter((item) => item !== "none");

				return {
					...currentFormState,
					specialNeeds: normalizedValues as SpecialNeed[],
					specialNeedsNote:
						normalizedValues.length === 0
							? ""
							: currentFormState.specialNeedsNote,
				};
			}

			return {
				...currentFormState,
				interests: nextValues as TravelInterest[],
			};
		});
	};

	const handleBackPress = () => {
		setErrorMessage(null);
		setCurrentIndex((index) => Math.max(0, index - 1));
	};

	const handleContinuePress = async () => {
		if (!canContinue || isSaving) {
			return;
		}

		if (!isLastQuestion) {
			setCurrentIndex((index) => index + 1);
			return;
		}

		if (
			!(
				formState.travelStyle &&
				formState.pacePreference &&
				formState.budgetPreference &&
				formState.foodPreference &&
				formState.groupPreference &&
				formState.planningStyle
			)
		) {
			setErrorMessage("Complete every preference before continuing.");
			return;
		}

		setErrorMessage(null);
		setIsSaving(true);

		try {
			await savePreferences({
				budgetPreference: formState.budgetPreference,
				foodPreference: formState.foodPreference,
				groupPreference: formState.groupPreference,
				interests: formState.interests,
				pacePreference: formState.pacePreference,
				planningStyle: formState.planningStyle,
				specialNeeds: formState.specialNeeds,
				specialNeedsNote: formState.specialNeedsNote.trim() || undefined,
				travelStyle: formState.travelStyle,
			});
			router.replace("/(app)/(tabs)");
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Viya could not save your preferences."
			);
		} finally {
			setIsSaving(false);
		}
	};

	if (introStage === "brand") {
		return (
			<BrandIntroScreen
				memberSince={memberSince}
				name={firstName}
				onComplete={() => setIntroStage("welcome")}
			/>
		);
	}

	if (introStage === "welcome") {
		return <WelcomeIntroScreen onContinue={() => setIntroStage("questions")} />;
	}

	let continueButtonLabel = "Continue";

	if (isSaving) {
		continueButtonLabel = "Saving...";
	} else if (isLastQuestion) {
		continueButtonLabel = "Save";
	}

	return (
		<Container isScrollable={false}>
			<View className="flex-1">
				<ScrollView
					contentContainerStyle={{
						gap: 20,
						paddingBottom: 28,
						paddingHorizontal: 20,
						paddingTop: 20,
					}}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View className="gap-4">
						<Text color="muted" type="body-sm" weight="medium">
							Step {currentIndex + 1} of {questions.length}
						</Text>

						<ProgressSegments activeIndex={currentIndex} />

						<View className="gap-2">
							<Text.Heading type="h3" weight="semibold">
								{currentQuestion.title}
							</Text.Heading>
							<Text.Paragraph color="muted" type="body-sm">
								{currentQuestion.subtitle}
							</Text.Paragraph>
						</View>
					</View>

					<View className="gap-3">
						{options.map((option, index) => {
							const fieldValue = formState[currentQuestion.key];
							const isSelected = Array.isArray(fieldValue)
								? (fieldValue as readonly string[]).includes(option.value)
								: fieldValue === option.value;

							return (
								<PreferenceOptionButton
									currentQuestion={currentQuestion}
									index={index}
									isSelected={isSelected}
									key={`${currentQuestion.key}-${option.value}`}
									onMultiToggle={handleMultiToggle}
									onSingleSelect={handleSingleSelect}
									option={option}
								/>
							);
						})}
					</View>

					{currentQuestion.key === "specialNeeds" &&
					selectedSpecialNeeds.length > 0 ? (
						<View className="gap-2">
							<Text color="muted" type="body-xs" weight="semibold">
								OPTIONAL NOTE
							</Text>
							<TextField>
								<Input
									onChangeText={(value) =>
										setFormState((currentFormState) => ({
											...currentFormState,
											specialNeedsNote: value,
										}))
									}
									placeholder="Add a short note if useful"
									value={formState.specialNeedsNote}
								/>
							</TextField>
						</View>
					) : null}
				</ScrollView>

				<View className="gap-3 border-border border-t bg-background px-5 py-4">
					{errorMessage ? (
						<Text className="text-danger" type="body-sm">
							{errorMessage}
						</Text>
					) : null}

					<View className="flex-row gap-3">
						<Button
							className="flex-1"
							isDisabled={currentIndex === 0 || isSaving}
							onPress={handleBackPress}
							variant="secondary"
						>
							<Button.Label>Back</Button.Label>
						</Button>
						<Button
							className="flex-1"
							isDisabled={!canContinue || isSaving}
							onPress={handleContinuePress}
						>
							{isSaving ? <Spinner color="#FFFFFF" size="sm" /> : null}
							<Button.Label>{continueButtonLabel}</Button.Label>
						</Button>
					</View>
				</View>
			</View>
		</Container>
	);
}
