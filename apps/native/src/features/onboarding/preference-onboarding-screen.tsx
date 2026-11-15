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
	type ComponentProps,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from "react";
import { ScrollView, TextInput, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	FadeIn,
	FadeOut,
	runOnJS,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	AppText,
	Card,
	haptic,
	PressableScale,
	PrimaryButton,
	radius,
	SecondaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";
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
		accent: "accent",
		description: "Relaxed, balanced, packed, or adventurous.",
		icon: "sparkles-outline",
		title: "Trip vibe",
	},
	{
		accent: "success",
		description: "How full each day should feel.",
		icon: "speedometer-outline",
		title: "Daily pace",
	},
	{
		accent: "warning",
		description: "Value, mid-range, or premium comfort.",
		icon: "wallet-outline",
		title: "Budget feel",
	},
	{
		accent: "danger",
		description: "Food, group style, and helpful notes.",
		icon: "heart-outline",
		title: "Travel needs",
	},
] as const satisfies readonly {
	accent: "accent" | "danger" | "success" | "warning";
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
	const { palette } = useUITheme();

	return (
		<View
			accessibilityLabel={`Step ${activeIndex + 1} of ${questions.length}`}
			accessibilityRole="progressbar"
			style={{ flexDirection: "row", gap: spacing.xs }}
		>
			{questions.map((question, index) => (
				<View
					key={question.key}
					style={{
						backgroundColor: index <= activeIndex ? palette.ink : palette.fill,
						borderRadius: radius.pill,
						flex: 1,
						height: 4,
					}}
				/>
			))}
		</View>
	);
}

function ScreenFrame({
	children,
	style,
}: {
	children: ReactNode;
	style?: ComponentProps<typeof View>["style"];
}) {
	const { palette } = useUITheme();
	const insets = useSafeAreaInsets();

	return (
		<View
			style={[
				{
					backgroundColor: palette.canvas,
					flex: 1,
					paddingBottom: insets.bottom,
					paddingTop: insets.top,
				},
				style,
			]}
		>
			{children}
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
		<ScreenFrame>
			<Animated.View
				style={[
					{
						flex: 1,
						justifyContent: "space-between",
						paddingBottom: spacing.xl,
						paddingHorizontal: spacing.screen + spacing.xs,
						paddingTop: spacing["3xl"],
					},
					screenStyle,
				]}
			>
				<View
					style={{ flex: 1, gap: spacing["2xl"], justifyContent: "center" }}
				>
					<Animated.View style={brandStyle}>
						<ViyaMark size={58} />
					</Animated.View>

					<View style={{ gap: spacing.sm }}>
						<Animated.View style={welcomeStyle}>
							<AppText
								accessibilityRole="header"
								style={{ fontSize: 52, lineHeight: 58 }}
								variant="largeTitle"
							>
								Welcome.
							</AppText>
						</Animated.View>
						<Animated.View style={greetingStyle}>
							<AppText variant="title">Hi {name},</AppText>
						</Animated.View>
						<Animated.View style={messageStyle}>
							<AppText tone="secondary">Thanks for being with Viya!</AppText>
						</Animated.View>
					</View>
				</View>

				<Animated.View style={memberStyle}>
					<AppText tone="secondary" variant="subhead">
						{memberSince}
					</AppText>
				</Animated.View>
			</Animated.View>
		</ScreenFrame>
	);
}

function SetupPreviewCard({
	accent,
	description,
	icon,
	title,
}: {
	accent: "accent" | "danger" | "success" | "warning";
	description: string;
	icon: SetupPreviewIconName;
	title: string;
}) {
	const { palette } = useUITheme();
	const color = palette[accent];

	return (
		<Card padding="md" style={{ gap: spacing.md, width: "48.5%" }}>
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.fill,
					borderRadius: radius.pill,
					height: 40,
					justifyContent: "center",
					width: 40,
				}}
			>
				<Ionicons color={color} name={icon} size={20} />
			</View>
			<View style={{ gap: spacing.xs }}>
				<AppText bold={true} variant="subhead">
					{title}
				</AppText>
				<AppText tone="secondary" variant="footnote">
					{description}
				</AppText>
			</View>
		</Card>
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
		<ScreenFrame>
			<Animated.View
				style={[
					{
						flex: 1,
						justifyContent: "space-between",
						paddingBottom: spacing.lg,
						paddingHorizontal: spacing.screen,
						paddingTop: spacing.xl,
					},
					screenStyle,
				]}
			>
				<Animated.View
					style={[
						{ gap: spacing.md, paddingTop: spacing["3xl"] },
						contentStyle,
					]}
				>
					<AppText accessibilityRole="header" variant="largeTitle">
						Tell us how you like to travel.
					</AppText>
					<AppText style={{ maxWidth: 320 }} tone="secondary">
						Answer eight quick questions so your home and trip suggestions match
						your pace, budget, interests, and needs.
					</AppText>
				</Animated.View>

				<View style={{ gap: spacing.lg }}>
					<Animated.View
						style={[
							{
								flexDirection: "row",
								flexWrap: "wrap",
								justifyContent: "space-between",
								rowGap: spacing.md,
							},
							previewStyle,
						]}
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
						<PrimaryButton
							icon="arrow-forward"
							label="Continue"
							onPress={onContinue}
						/>
					</Animated.View>
				</View>
			</Animated.View>
		</ScreenFrame>
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
	const { palette } = useUITheme();
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
			<PressableScale
				accessibilityLabel={option.label}
				accessibilityRole={
					currentQuestion.mode === "multi" ? "checkbox" : "radio"
				}
				accessibilityState={{ selected: isSelected }}
				haptic="selection"
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
				scaleTo={0.98}
				style={{
					alignItems: "center",
					backgroundColor: palette.surface,
					borderColor: isSelected ? palette.accent : "transparent",
					borderRadius: radius.card,
					borderWidth: 1.5,
					flexDirection: "row",
					gap: spacing.md,
					minHeight: 64,
					padding: spacing.lg,
				}}
			>
				<View
					style={{
						alignItems: "center",
						backgroundColor: isSelected ? palette.accent : palette.fill,
						borderRadius: radius.pill,
						height: 28,
						justifyContent: "center",
						width: 28,
					}}
				>
					<Ionicons
						color={isSelected ? "#FFFFFF" : palette.inkTertiary}
						name={isSelected ? "checkmark" : "ellipse-outline"}
						size={isSelected ? 18 : 16}
					/>
				</View>
				<View style={{ flex: 1, gap: spacing.xs }}>
					<AppText bold={true}>{option.label}</AppText>
					<AppText tone="secondary" variant="footnote">
						{option.description}
					</AppText>
				</View>
			</PressableScale>
		</Animated.View>
	);
}

export function PreferenceOnboardingScreen() {
	const router = useRouter();
	const { palette } = useUITheme();
	const insets = useSafeAreaInsets();
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
		<View
			style={{
				backgroundColor: palette.canvas,
				flex: 1,
				paddingTop: insets.top,
			}}
		>
			<ScrollView
				contentContainerStyle={{
					gap: spacing.section,
					paddingBottom: spacing.section,
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.screen,
				}}
				contentInsetAdjustmentBehavior="automatic"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={{ gap: spacing.lg }}>
					<AppText tone="secondary" variant="subhead">
						Step {currentIndex + 1} of {questions.length}
					</AppText>

					<ProgressSegments activeIndex={currentIndex} />

					<View style={{ gap: spacing.sm }}>
						<AppText accessibilityRole="header" variant="title">
							{currentQuestion.title}
						</AppText>
						<AppText tone="secondary" variant="subhead">
							{currentQuestion.subtitle}
						</AppText>
					</View>
				</View>

				<View style={{ gap: spacing.md }}>
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
					<Animated.View
						entering={FadeIn.duration(200)}
						exiting={FadeOut.duration(150)}
						style={{ gap: spacing.sm }}
					>
						<AppText tone="secondary" variant="eyebrow">
							Optional note
						</AppText>
						<TextInput
							accessibilityLabel="Optional note"
							onChangeText={(value) =>
								setFormState((currentFormState) => ({
									...currentFormState,
									specialNeedsNote: value,
								}))
							}
							placeholder="Add a short note if useful"
							placeholderTextColor={palette.inkTertiary}
							style={{
								backgroundColor: palette.surface,
								borderRadius: radius.field,
								color: palette.ink,
								fontSize: 17,
								height: 50,
								paddingHorizontal: spacing.lg,
							}}
							value={formState.specialNeedsNote}
						/>
					</Animated.View>
				) : null}
			</ScrollView>

			<View
				style={{
					backgroundColor: palette.canvas,
					gap: spacing.md,
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.md,
				}}
			>
				{errorMessage ? (
					<Animated.View entering={FadeIn.duration(200)}>
						<AppText
							accessibilityLiveRegion="polite"
							accessibilityRole="alert"
							tone="danger"
							variant="subhead"
						>
							{errorMessage}
						</AppText>
					</Animated.View>
				) : null}

				<View style={{ flexDirection: "row", gap: spacing.md }}>
					<View style={{ flex: 1 }}>
						<SecondaryButton
							disabled={currentIndex === 0 || isSaving}
							label="Back"
							onPress={handleBackPress}
						/>
					</View>
					<View style={{ flex: 1 }}>
						<PrimaryButton
							disabled={!canContinue}
							isPending={isSaving}
							label={continueButtonLabel}
							onPress={() => {
								haptic("light");
								handleContinuePress();
							}}
						/>
					</View>
				</View>
			</View>
		</View>
	);
}
