import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
	BottomSheet,
	Button,
	Chip,
	CloseButton,
	Input,
	Label,
	Menu,
	Spinner,
	Surface,
	Text,
	TextArea,
	TextField,
} from "heroui-native";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import { TripModuleManualEntryCard } from "./trip-module-manual-entry-card";
import { useTripIdParam } from "./use-trip-id-param";

interface CompanionForm {
	email: string;
	name: string;
	notes: string;
	phone: string;
	role: string;
}

const initialCompanionForm: CompanionForm = {
	email: "",
	name: "",
	notes: "",
	phone: "",
	role: "traveler",
};

const initialLeadCompanionForm: CompanionForm = {
	...initialCompanionForm,
	role: "organizer",
};

const companionRoleOptions = [
	"traveler",
	"organizer",
	"emergencyContact",
	"driver",
	"payer",
	"localContact",
	"child",
	"other",
] as const;

const unsafePhoneUriCharactersPattern = /[^\d+]/g;

const formatCompanionRoleLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.replaceAll(/([a-z])([A-Z])/g, "$1 $2")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

const getPhoneContactUrl = (scheme: "sms" | "tel", phone: string) =>
	`${scheme}:${phone.replace(unsafePhoneUriCharactersPattern, "")}`;

const getEmailContactUrl = (email: string) => `mailto:${email.trim()}`;

function SheetField({
	label,
	onChangeText,
	placeholder,
	value,
}: {
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<Input
				className="h-12 border border-border bg-surface px-4"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

function CompanionRolePicker({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				ROLE
			</Text>
			<View className="flex-row flex-wrap gap-2">
				{companionRoleOptions.map((role) => (
					<Button
						key={role}
						onPress={() => onChange(role)}
						size="sm"
						variant={value === role ? "primary" : "secondary"}
					>
						<Button.Label>{formatCompanionRoleLabel(role)}</Button.Label>
					</Button>
				))}
			</View>
		</View>
	);
}

function CompanionSheet({
	errorMessage,
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	errorMessage: string | null;
	form: CompanionForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof CompanionForm, value: string) => void;
}) {
	const insets = useSafeAreaInsets();
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["82%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>
									{mode === "edit" ? "Edit companion" : "Add companion"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Save traveler, emergency contact, or coordinator details.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close companion form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<ScrollView
							contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 500 }}
						>
							<SheetField
								label="Name"
								onChangeText={(value) => onUpdateForm("name", value)}
								placeholder="Alex Reyes"
								value={form.name}
							/>
							<CompanionRolePicker
								onChange={(value) => onUpdateForm("role", value)}
								value={form.role}
							/>
							<SheetField
								label="Email"
								onChangeText={(value) => onUpdateForm("email", value)}
								placeholder="name@example.com"
								value={form.email}
							/>
							<SheetField
								label="Phone"
								onChangeText={(value) => onUpdateForm("phone", value)}
								placeholder="+63..."
								value={form.phone}
							/>
							<TextField className="gap-2">
								<Label>
									<Label.Text>Notes</Label.Text>
								</Label>
								<TextArea
									className="min-h-20 rounded-[18px] border border-border bg-surface px-4 py-3"
									onBlur={onBlur}
									onChangeText={(value) => onUpdateForm("notes", value)}
									onFocus={onFocus}
									placeholder="Dietary needs, emergency instructions, assigned tasks"
									value={form.notes}
									variant="secondary"
								/>
							</TextField>
						</ScrollView>
						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>
								{mode === "edit" ? "Save companion" : "Add companion"}
							</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function CompanionContactButton({
	icon,
	label,
	onPress,
}: {
	icon: ComponentProps<typeof Ionicons>["name"];
	label: string;
	onPress: () => void;
}) {
	return (
		<Button className="min-w-[30%] flex-1" onPress={onPress} size="sm">
			<Ionicons color="#FFFFFF" name={icon} size={15} />
			<Button.Label>{label}</Button.Label>
		</Button>
	);
}

export function TripCompanionsScreen() {
	const tripId = useTripIdParam();
	const companions = useQuery(
		api.companions.listTripCompanions,
		tripId ? { tripId } : "skip"
	);
	const createCompanion = useMutation(api.companions.createTripCompanion);
	const updateCompanion = useMutation(api.companions.updateTripCompanion);
	const deleteCompanion = useMutation(api.companions.deleteTripCompanion);
	const [form, setForm] = useState<CompanionForm>(initialCompanionForm);
	const [editingCompanionId, setEditingCompanionId] =
		useState<Id<"tripCompanions"> | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [pendingCompanionId, setPendingCompanionId] =
		useState<Id<"tripCompanions"> | null>(null);
	const [companionErrorMessage, setCompanionErrorMessage] = useState<
		string | null
	>(null);
	const [contactErrorMessage, setContactErrorMessage] = useState<string | null>(
		null
	);

	const updateForm = (key: keyof CompanionForm, value: string) => {
		setCompanionErrorMessage(null);
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCompanionSheet = (nextForm: CompanionForm) => {
		setCompanionErrorMessage(null);
		setContactErrorMessage(null);
		setEditingCompanionId(null);
		setForm(nextForm);
		setIsSheetOpen(true);
	};
	const openCreateSheet = () => {
		openCompanionSheet(initialCompanionForm);
	};
	const openLeadContactSheet = () => {
		openCompanionSheet(initialLeadCompanionForm);
	};
	const openEditSheet = (companion: Doc<"tripCompanions">) => {
		setCompanionErrorMessage(null);
		setContactErrorMessage(null);
		setEditingCompanionId(companion._id);
		setForm({
			email: companion.email ?? "",
			name: companion.name,
			notes: companion.notes ?? "",
			phone: companion.phone ?? "",
			role: companion.role,
		});
		setIsSheetOpen(true);
	};

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before adding companions."
					icon="people-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	const handleSaveCompanion = async () => {
		const name = form.name.trim();

		if (!name) {
			setCompanionErrorMessage("Add a companion name.");
			return;
		}

		setCompanionErrorMessage(null);
		setIsSaving(true);
		try {
			const companionPatch = {
				email: form.email.trim() || undefined,
				name,
				notes: form.notes.trim() || undefined,
				phone: form.phone.trim() || undefined,
				role: form.role.trim() || "traveler",
			};

			if (editingCompanionId) {
				await updateCompanion({
					...companionPatch,
					companionId: editingCompanionId,
				});
			} else {
				await createCompanion({
					...companionPatch,
					tripId,
				});
			}
			setEditingCompanionId(null);
			setForm(initialCompanionForm);
			setIsSheetOpen(false);
		} catch {
			setCompanionErrorMessage("Could not save companion.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleOpenContact = async (url: string) => {
		setContactErrorMessage(null);
		try {
			await Linking.openURL(url);
		} catch {
			setContactErrorMessage("Could not open this contact action.");
		}
	};

	const handleDeleteCompanion = async (companionId: Id<"tripCompanions">) => {
		setPendingCompanionId(companionId);
		try {
			await deleteCompanion({ companionId });
		} catch {
			setCompanionErrorMessage("Could not delete companion.");
		} finally {
			setPendingCompanionId(null);
		}
	};

	if (companions === undefined) {
		return <ScreenLoadingState />;
	}

	const contactReadyCount = companions.filter(
		(companion) => companion.email || companion.phone
	).length;
	const emergencyContactCount = companions.filter(
		(companion) => companion.role === "emergencyContact"
	).length;
	const leadCompanion =
		companions.find((companion) => companion.role === "organizer") ??
		companions.at(0) ??
		null;

	return (
		<TripModuleScreenFrame
			activeTab="companions"
			headerAction={
				<NavigationIconButton
					accessibilityLabel="Add companion"
					icon="add"
					onPress={openCreateSheet}
				/>
			}
			tripId={tripId}
		>
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<TripModuleManualEntryCard
						description="Save traveler roles, contact details, emergency contacts, and coordination notes."
						moduleLabel="companions"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="people-outline"
						primaryActionLabel="Add companion"
					/>
					{contactErrorMessage ? (
						<Text className="px-1 text-danger" type="body-sm">
							{contactErrorMessage}
						</Text>
					) : null}

					<View className="gap-4 rounded-[30px] bg-surface-secondary p-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="min-w-0 flex-1 gap-1">
								<Text.Heading type="h5" weight="semibold">
									Group coordination
								</Text.Heading>
								<Text color="muted" type="body-sm">
									Keep travelers, contacts, and responsibilities easy to scan.
								</Text>
							</View>
							<View className="h-11 w-11 items-center justify-center rounded-full bg-surface-secondary">
								<Ionicons color="#FF2D55" name="people-outline" size={20} />
							</View>
						</View>
						<View className="flex-row flex-wrap gap-2">
							<Chip size="sm" variant="secondary">
								<Chip.Label>{companions.length} people</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{contactReadyCount} reachable</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>
									{emergencyContactCount} emergency contacts
								</Chip.Label>
							</Chip>
						</View>
						<View className="gap-3 rounded-[24px] bg-surface p-4">
							<View className="flex-row items-center gap-3">
								<View className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary">
									<Ionicons color="#FF2D55" name="person-outline" size={18} />
								</View>
								<View className="min-w-0 flex-1 gap-1">
									<Text color="muted" type="body-xs" weight="semibold">
										LEAD CONTACT
									</Text>
									<Text numberOfLines={1} type="body-sm" weight="bold">
										{leadCompanion?.name ?? "No lead contact yet"}
									</Text>
								</View>
							</View>
							<Text color="muted" numberOfLines={2} type="body-sm">
								{leadCompanion
									? `${formatCompanionRoleLabel(leadCompanion.role)} · ${
											[leadCompanion.email, leadCompanion.phone]
												.filter(Boolean)
												.join(" · ") || "No contact detail saved"
										}`
									: "Add a traveler or organizer so the group has a clear coordination anchor."}
							</Text>
							{leadCompanion?.notes ? (
								<Text.Paragraph color="muted" type="body-sm">
									{leadCompanion.notes}
								</Text.Paragraph>
							) : null}
							{leadCompanion ? (
								<View className="flex-row flex-wrap gap-2">
									<Button
										className="min-w-[30%] flex-1"
										onPress={() => openEditSheet(leadCompanion)}
										size="sm"
										variant="secondary"
									>
										<Ionicons color="#0A84FF" name="create-outline" size={15} />
										<Button.Label>Review lead</Button.Label>
									</Button>
									{leadCompanion.phone ? (
										<>
											<CompanionContactButton
												icon="call-outline"
												label="Call lead"
												onPress={() => {
													handleOpenContact(
														getPhoneContactUrl("tel", leadCompanion.phone ?? "")
													).catch(() => undefined);
												}}
											/>
											<CompanionContactButton
												icon="chatbubble-outline"
												label="Message lead"
												onPress={() => {
													handleOpenContact(
														getPhoneContactUrl("sms", leadCompanion.phone ?? "")
													).catch(() => undefined);
												}}
											/>
										</>
									) : null}
									{leadCompanion.email ? (
										<CompanionContactButton
											icon="mail-outline"
											label="Email lead"
											onPress={() => {
												handleOpenContact(
													getEmailContactUrl(leadCompanion.email ?? "")
												).catch(() => undefined);
											}}
										/>
									) : null}
								</View>
							) : (
								<Button
									onPress={openLeadContactSheet}
									size="sm"
									variant="secondary"
								>
									<Ionicons
										color="#0A84FF"
										name="person-add-outline"
										size={16}
									/>
									<Button.Label>Add lead contact</Button.Label>
								</Button>
							)}
						</View>
					</View>

					{companions.length === 0 ? (
						<EmptyState
							action={{
								label: "Add companion",
								onPress: openCreateSheet,
							}}
							description="Add travelers, coordinators, or emergency contacts."
							icon="people-outline"
							title="No companions yet"
						/>
					) : (
						<View className="gap-3">
							{companions.map((companion) => (
								<Surface
									className="gap-3 rounded-[28px] border border-border bg-surface p-5"
									key={companion._id}
								>
									<View className="flex-row items-start gap-3">
										<View className="min-w-0 flex-1 gap-3">
											<View className="flex-row flex-wrap gap-2">
												<Chip size="sm" variant="secondary">
													<Chip.Label>{companion.role}</Chip.Label>
												</Chip>
											</View>
											<Text type="body" weight="bold">
												{companion.name}
											</Text>
											{companion.email || companion.phone ? (
												<Text color="muted" type="body-sm">
													{[companion.email, companion.phone]
														.filter(Boolean)
														.join(" · ")}
												</Text>
											) : null}
											{companion.notes ? (
												<Text.Paragraph color="muted" type="body-sm">
													{companion.notes}
												</Text.Paragraph>
											) : null}
											{companion.phone || companion.email ? (
												<View className="flex-row flex-wrap gap-2">
													{companion.phone ? (
														<>
															<CompanionContactButton
																icon="call-outline"
																label="Call"
																onPress={() => {
																	handleOpenContact(
																		getPhoneContactUrl(
																			"tel",
																			companion.phone ?? ""
																		)
																	).catch(() => undefined);
																}}
															/>
															<CompanionContactButton
																icon="chatbubble-outline"
																label="Message"
																onPress={() => {
																	handleOpenContact(
																		getPhoneContactUrl(
																			"sms",
																			companion.phone ?? ""
																		)
																	).catch(() => undefined);
																}}
															/>
														</>
													) : null}
													{companion.email ? (
														<CompanionContactButton
															icon="mail-outline"
															label="Email"
															onPress={() => {
																handleOpenContact(
																	getEmailContactUrl(companion.email ?? "")
																).catch(() => undefined);
															}}
														/>
													) : null}
												</View>
											) : null}
										</View>
										<Menu>
											<Menu.Trigger asChild={true}>
												<Pressable
													accessibilityLabel="Companion options"
													accessibilityRole="button"
													className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary"
													style={({ pressed }) => ({
														transform: [{ scale: pressed ? 0.94 : 1 }],
													})}
												>
													<Ionicons
														color="#71717A"
														name="ellipsis-horizontal"
														size={17}
													/>
												</Pressable>
											</Menu.Trigger>
											<Menu.Portal>
												<Menu.Overlay />
												<Menu.Content
													align="end"
													className="rounded-[24px] border border-border bg-surface p-2"
													offset={8}
													placement="bottom"
													presentation="popover"
													width={200}
												>
													<Menu.Item
														accessibilityLabel="Edit companion"
														className="flex-row items-center gap-3 rounded-[18px] p-2.5"
														isAnimatedStyleActive={false}
														onPress={() => openEditSheet(companion)}
													>
														<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
															<Ionicons
																color="#0A84FF"
																name="create-outline"
																size={16}
															/>
														</View>
														<Menu.ItemTitle className="font-semibold text-sm">
															Edit companion
														</Menu.ItemTitle>
													</Menu.Item>
													<View className="mx-2 my-1 h-px bg-border" />
													<Menu.Item
														accessibilityLabel="Delete companion"
														className="flex-row items-center gap-3 rounded-[18px] p-2.5"
														isAnimatedStyleActive={false}
														isDisabled={pendingCompanionId === companion._id}
														onPress={() => {
															handleDeleteCompanion(companion._id).catch(
																() => undefined
															);
														}}
													>
														<View className="h-8 w-8 items-center justify-center rounded-full bg-danger/10">
															<Ionicons
																color="#FF3B30"
																name="trash-outline"
																size={16}
															/>
														</View>
														<Menu.ItemTitle className="font-semibold text-danger text-sm">
															Delete companion
														</Menu.ItemTitle>
													</Menu.Item>
												</Menu.Content>
											</Menu.Portal>
										</Menu>
									</View>
								</Surface>
							))}
						</View>
					)}
				</View>
				<CompanionSheet
					errorMessage={companionErrorMessage}
					form={form}
					isOpen={isSheetOpen}
					isSaving={isSaving}
					mode={editingCompanionId ? "edit" : "create"}
					onOpenChange={(isOpen) => {
						setIsSheetOpen(isOpen);
						if (!isOpen) {
							setEditingCompanionId(null);
							setCompanionErrorMessage(null);
							setForm(initialCompanionForm);
						}
					}}
					onSubmit={() => {
						handleSaveCompanion().catch(() => undefined);
					}}
					onUpdateForm={updateForm}
				/>
			</Container>
		</TripModuleScreenFrame>
	);
}
