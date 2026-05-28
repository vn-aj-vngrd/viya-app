import { api } from "@viya-app/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Link, useRouter } from "expo-router";
import {
	Button,
	Input,
	Label,
	Separator,
	Spinner,
	Surface,
	Text,
	TextArea,
	TextField,
} from "heroui-native";
import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { formatReadableTripDateRange } from "@/src/components/date/date-format-utils";
import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
import { VIYA_ROUTES } from "@/src/constants/routes";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const travelStyleOptions = [
	"balanced",
	"relaxed",
	"adventure",
	"budget",
	"luxury",
	"packed",
] as const;
const groupTypeOptions = [
	"solo",
	"couple",
	"family",
	"friends",
	"work",
] as const;

type TravelStyle = (typeof travelStyleOptions)[number];
type GroupType = (typeof groupTypeOptions)[number];

interface ManualTripFormState {
	budgetAmount: string;
	destination: string;
	endDate: string;
	groupType: GroupType;
	notes: string;
	startDate: string;
	title: string;
	travelStyle: TravelStyle;
}

const initialFormState: ManualTripFormState = {
	budgetAmount: "",
	destination: "",
	endDate: "",
	groupType: "solo",
	notes: "",
	startDate: "",
	title: "",
	travelStyle: "balanced",
};

const getTrimmedForm = (form: ManualTripFormState) => ({
	...form,
	budgetAmount: form.budgetAmount.trim(),
	destination: form.destination.trim(),
	endDate: form.endDate.trim(),
	notes: form.notes.trim(),
	startDate: form.startDate.trim(),
	title: form.title.trim(),
});

const getFormError = (form: ManualTripFormState) => {
	const trimmedForm = getTrimmedForm(form);

	if (!trimmedForm.title) {
		return "Add a trip name.";
	}

	if (!trimmedForm.destination) {
		return "Add a destination.";
	}

	if (!datePattern.test(trimmedForm.startDate)) {
		return "Add a start date in YYYY-MM-DD format.";
	}

	if (!datePattern.test(trimmedForm.endDate)) {
		return "Add an end date in YYYY-MM-DD format.";
	}

	if (
		new Date(`${trimmedForm.endDate}T00:00:00.000Z`).getTime() <
		new Date(`${trimmedForm.startDate}T00:00:00.000Z`).getTime()
	) {
		return "End date must be after the start date.";
	}

	if (trimmedForm.budgetAmount) {
		const amount = Number(trimmedForm.budgetAmount.replaceAll(",", ""));
		if (!(Number.isFinite(amount) && amount > 0)) {
			return "Budget must be a positive number.";
		}
	}

	return null;
};

function HeaderIntro() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const topPadding = Math.max(insets.top + 2, 18);

	return (
		<View className="gap-5" style={{ paddingTop: topPadding }}>
			<NavigationBackButton onPress={() => router.back()} />
			<View className="gap-2">
				<Text color="muted" type="body-xs" weight="semibold">
					MANUAL SETUP
				</Text>
				<Text.Heading type="h1" weight="semibold">
					Create a trip
				</Text.Heading>
				<Text.Paragraph className="leading-5" color="muted" type="body-sm">
					Add the basics now. Viya can refine bookings, readiness, and itinerary
					afterward.
				</Text.Paragraph>
			</View>
		</View>
	);
}

function FormField({
	autoCapitalize,
	keyboardType,
	label,
	multiline = false,
	onChangeText,
	placeholder,
	value,
}: {
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	keyboardType?: "default" | "numeric";
	label: string;
	multiline?: boolean;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			{multiline ? (
				<TextArea
					className="min-h-24 rounded-[18px] border-0 bg-surface-secondary px-4 py-3"
					onChangeText={onChangeText}
					placeholder={placeholder}
					value={value}
					variant="secondary"
				/>
			) : (
				<Input
					autoCapitalize={autoCapitalize}
					className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
					keyboardType={keyboardType}
					onChangeText={onChangeText}
					placeholder={placeholder}
					value={value}
					variant="secondary"
				/>
			)}
		</TextField>
	);
}

function InlineField({
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
		<TextField className="min-h-14 flex-row items-center gap-4 px-4 py-2">
			<Label className="w-24">
				<Label.Text>{label}</Label.Text>
			</Label>
			<Input
				autoCapitalize={autoCapitalize}
				className="h-10 flex-1 border-0 bg-transparent px-0 text-right"
				keyboardType={keyboardType}
				onChangeText={onChangeText}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

function OptionChips<Value extends string>({
	onChange,
	options,
	value,
}: {
	onChange: (value: Value) => void;
	options: readonly Value[];
	value: Value;
}) {
	return (
		<View className="flex-row flex-wrap gap-2">
			{options.map((option) => {
				const isSelected = option === value;

				return (
					<Button
						key={option}
						onPress={() => onChange(option)}
						size="sm"
						variant={isSelected ? "primary" : "secondary"}
					>
						<Button.Label>{option}</Button.Label>
					</Button>
				);
			})}
		</View>
	);
}

function FormSection({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	return (
		<View className="gap-2">
			<Text className="px-1" color="muted" type="body-xs" weight="semibold">
				{title}
			</Text>
			<Surface className="overflow-hidden rounded-[26px] border border-border bg-surface">
				{children}
			</Surface>
		</View>
	);
}

function ReviewRow({ label, value }: { label: string; value: string }) {
	return (
		<View className="flex-row items-start justify-between gap-4 border-border border-b py-3">
			<Text color="muted" type="body-sm">
				{label}
			</Text>
			<Text className="max-w-52 text-right" type="body-sm" weight="semibold">
				{value}
			</Text>
		</View>
	);
}

export function ManualTripCreateScreen() {
	const router = useRouter();
	const createTrip = useMutation(api.trips.createTrip);
	const [form, setForm] = useState<ManualTripFormState>(initialFormState);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isReviewing, setIsReviewing] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const trimmedForm = getTrimmedForm(form);
	const formError = getFormError(form);
	const budgetAmount = trimmedForm.budgetAmount
		? Number(trimmedForm.budgetAmount.replaceAll(",", ""))
		: undefined;
	const tripTitle = trimmedForm.title;

	const updateForm = <Key extends keyof ManualTripFormState>(
		key: Key,
		value: ManualTripFormState[Key]
	) => {
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
		setErrorMessage(null);
	};

	const handleReview = () => {
		if (formError) {
			setErrorMessage(formError);
			return;
		}

		setIsReviewing(true);
	};

	const handleCreate = async () => {
		if (formError) {
			setErrorMessage(formError);
			return;
		}

		setIsCreating(true);
		setErrorMessage(null);
		try {
			const result = await createTrip({
				budgetAmount,
				budgetCurrency: "PHP",
				destination: trimmedForm.destination,
				endDate: trimmedForm.endDate,
				groupType: trimmedForm.groupType,
				startDate: trimmedForm.startDate,
				summary:
					trimmedForm.notes ||
					"Manual trip draft. Viya can help enrich booking targets and readiness.",
				title: tripTitle,
				travelStyle: trimmedForm.travelStyle,
			});
			router.replace(VIYA_ROUTES.tripDashboard(result.tripId));
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Could not create this trip."
			);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-6 pb-4">
				<HeaderIntro />

				{isReviewing ? (
					<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
						<Text.Heading type="h4" weight="semibold">
							Review trip details
						</Text.Heading>
						<View>
							<ReviewRow label="Trip name" value={tripTitle} />
							<ReviewRow label="Destination" value={trimmedForm.destination} />
							<ReviewRow
								label="Dates"
								value={formatReadableTripDateRange({
									endDate: trimmedForm.endDate,
									fallbackLabel: "Dates not set",
									startDate: trimmedForm.startDate,
								})}
							/>
							<ReviewRow
								label="Style"
								value={`${trimmedForm.travelStyle} · ${trimmedForm.groupType}`}
							/>
							<ReviewRow
								label="Budget"
								value={
									budgetAmount
										? `PHP ${budgetAmount.toLocaleString()}`
										: "Not set"
								}
							/>
							{trimmedForm.notes ? (
								<View className="pt-3">
									<Text color="muted" type="body-xs" weight="semibold">
										NOTES FOR VIYA
									</Text>
									<Text.Paragraph className="mt-2" color="muted" type="body-sm">
										{trimmedForm.notes}
									</Text.Paragraph>
								</View>
							) : null}
						</View>
						<View className="gap-2">
							<Button isDisabled={isCreating} onPress={() => handleCreate()}>
								{isCreating ? <Spinner size="sm" /> : null}
								<Button.Label>Create trip</Button.Label>
							</Button>
							<Button
								isDisabled={isCreating}
								onPress={() => setIsReviewing(false)}
								variant="secondary"
							>
								<Button.Label>Edit details</Button.Label>
							</Button>
						</View>
					</Surface>
				) : (
					<View className="gap-5">
						<FormSection title="Basics">
							<InlineField
								autoCapitalize="words"
								label="Trip name"
								onChangeText={(value) => updateForm("title", value)}
								placeholder="Summer getaway"
								value={form.title}
							/>
							<Separator className="ml-4" />
							<InlineField
								autoCapitalize="words"
								label="Destination"
								onChangeText={(value) => updateForm("destination", value)}
								placeholder="City, country, or region"
								value={form.destination}
							/>
						</FormSection>
						<FormSection title="Dates and budget">
							<InlineField
								autoCapitalize="none"
								label="Start"
								onChangeText={(value) => updateForm("startDate", value)}
								placeholder="2026-07-10"
								value={form.startDate}
							/>
							<Separator className="ml-4" />
							<InlineField
								autoCapitalize="none"
								label="End"
								onChangeText={(value) => updateForm("endDate", value)}
								placeholder="2026-07-14"
								value={form.endDate}
							/>
							<Separator className="ml-4" />
							<InlineField
								keyboardType="numeric"
								label="Budget"
								onChangeText={(value) => updateForm("budgetAmount", value)}
								placeholder="25000"
								value={form.budgetAmount}
							/>
						</FormSection>
						<FormSection title="Preferences">
							<View className="gap-3 px-4 py-4">
								<Text color="muted" type="body-xs" weight="semibold">
									Travel style
								</Text>
								<OptionChips
									onChange={(value) => updateForm("travelStyle", value)}
									options={travelStyleOptions}
									value={form.travelStyle}
								/>
							</View>
							<Separator className="ml-4" />
							<View className="gap-3 px-4 py-4">
								<Text color="muted" type="body-xs" weight="semibold">
									Travelers
								</Text>
								<OptionChips
									onChange={(value) => updateForm("groupType", value)}
									options={groupTypeOptions}
									value={form.groupType}
								/>
							</View>
						</FormSection>
						<FormSection title="Viya notes">
							<View className="p-4">
								<FormField
									label="Optional context"
									multiline={true}
									onChangeText={(value) => updateForm("notes", value)}
									placeholder="Booking ideas, must-haves, constraints"
									value={form.notes}
								/>
							</View>
						</FormSection>
						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<Button className="mt-1" onPress={handleReview} size="lg">
							<Button.Label>Review trip</Button.Label>
						</Button>
					</View>
				)}

				<View className="items-center gap-3 px-4">
					<Text className="text-center" color="muted" type="body-sm">
						Want the assistant to shape the plan first?
					</Text>
					<Link
						asChild
						href={{
							params: { mode: "plan", returnTo: VIYA_ROUTES.newTrip },
							pathname: "/(app)/(tabs)/viya",
						}}
					>
						<Button size="sm" variant="ghost">
							<Button.Label>Plan with Viya</Button.Label>
						</Button>
					</Link>
				</View>
			</View>
		</Container>
	);
}
