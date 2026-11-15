import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Menu } from "heroui-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Container } from "@/components/container";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import {
	AppText,
	Card,
	Chip,
	EmptyState,
	LoadingState,
	PrimaryButton,
	radius,
	SecondaryButton,
	SectionHeader,
	spacing,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import {
	ChoiceChips,
	FormSheet,
	InlineMessage,
	MenuDivider,
	MenuIcon,
	MenuTrigger,
	menuContentClassName,
	menuItemClassName,
	SheetField,
	SheetTextArea,
	TagRow,
} from "./trip-module-form-kit";
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

function CompanionRolePicker({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<ChoiceChips label="Role">
			{companionRoleOptions.map((role) => (
				<Chip
					key={role}
					label={formatCompanionRoleLabel(role)}
					onPress={() => onChange(role)}
					selected={value === role}
				/>
			))}
		</ChoiceChips>
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
	return (
		<FormSheet
			description="Save traveler, emergency contact, or coordinator details."
			errorMessage={errorMessage}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			saveLabel={mode === "edit" ? "Save companion" : "Add companion"}
			title={mode === "edit" ? "Edit companion" : "Add companion"}
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
				autoCapitalize="none"
				keyboardType="email-address"
				label="Email"
				onChangeText={(value) => onUpdateForm("email", value)}
				placeholder="name@example.com"
				value={form.email}
			/>
			<SheetField
				keyboardType="phone-pad"
				label="Phone"
				onChangeText={(value) => onUpdateForm("phone", value)}
				placeholder="+63..."
				value={form.phone}
			/>
			<SheetTextArea
				label="Notes"
				onChangeText={(value) => onUpdateForm("notes", value)}
				placeholder="Dietary needs, emergency instructions, assigned tasks"
				value={form.notes}
			/>
		</FormSheet>
	);
}

function ContactActions({
	email,
	labels,
	onOpen,
	phone,
}: {
	email?: string;
	labels: { call: string; email: string; message: string };
	onOpen: (url: string) => void;
	phone?: string;
}) {
	if (!(phone || email)) {
		return null;
	}

	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
			{phone ? (
				<>
					<SecondaryButton
						fullWidth={false}
						icon="call-outline"
						label={labels.call}
						onPress={() => onOpen(getPhoneContactUrl("tel", phone))}
					/>
					<SecondaryButton
						fullWidth={false}
						icon="chatbubble-outline"
						label={labels.message}
						onPress={() => onOpen(getPhoneContactUrl("sms", phone))}
					/>
				</>
			) : null}
			{email ? (
				<SecondaryButton
					fullWidth={false}
					icon="mail-outline"
					label={labels.email}
					onPress={() => onOpen(getEmailContactUrl(email))}
				/>
			) : null}
		</View>
	);
}

function LeadContactSummary({
	leadCompanion,
	onAddLead,
	onOpenContact,
	onReview,
}: {
	leadCompanion: Doc<"tripCompanions"> | null;
	onAddLead: () => void;
	onOpenContact: (url: string) => void;
	onReview: () => void;
}) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.group,
				gap: spacing.md,
				padding: spacing.lg,
			}}
		>
			<View style={{ gap: 2 }}>
				<AppText tone="secondary" variant="eyebrow">
					Lead contact
				</AppText>
				<AppText numberOfLines={1} variant="headline">
					{leadCompanion?.name ?? "No lead contact yet"}
				</AppText>
			</View>
			<AppText numberOfLines={2} tone="secondary" variant="subhead">
				{leadCompanion
					? `${formatCompanionRoleLabel(leadCompanion.role)} · ${
							[leadCompanion.email, leadCompanion.phone]
								.filter(Boolean)
								.join(" · ") || "No contact detail saved"
						}`
					: "Add a traveler or organizer so the group has a clear coordination anchor."}
			</AppText>
			{leadCompanion?.notes ? (
				<AppText tone="secondary" variant="subhead">
					{leadCompanion.notes}
				</AppText>
			) : null}
			{leadCompanion ? (
				<View style={{ gap: spacing.sm }}>
					<SecondaryButton
						icon="create-outline"
						label="Review lead"
						onPress={onReview}
					/>
					<ContactActions
						email={leadCompanion.email}
						labels={{
							call: "Call lead",
							email: "Email lead",
							message: "Message lead",
						}}
						onOpen={onOpenContact}
						phone={leadCompanion.phone}
					/>
				</View>
			) : (
				<PrimaryButton
					fullWidth={false}
					icon="person-add-outline"
					label="Add lead contact"
					onPress={onAddLead}
				/>
			)}
		</View>
	);
}

function CompanionCard({
	companion,
	isPending,
	onDelete,
	onEdit,
	onOpenContact,
}: {
	companion: Doc<"tripCompanions">;
	isPending: boolean;
	onDelete: () => void;
	onEdit: () => void;
	onOpenContact: (url: string) => void;
}) {
	const { palette } = useUITheme();
	const contactLine = [companion.email, companion.phone]
		.filter(Boolean)
		.join(" · ");

	return (
		<Animated.View
			entering={FadeInDown.duration(220)}
			style={{ opacity: isPending ? 0.6 : 1 }}
		>
			<Card padding="md">
				<View
					style={{
						alignItems: "flex-start",
						flexDirection: "row",
						gap: spacing.md,
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
						<AppText bold={true} tone="secondary" variant="headline">
							{companion.name.trim().charAt(0).toUpperCase()}
						</AppText>
					</View>
					<View style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
						<View style={{ gap: 2 }}>
							<AppText variant="headline">{companion.name}</AppText>
							<AppText tone="secondary" variant="footnote">
								{formatCompanionRoleLabel(companion.role)}
							</AppText>
						</View>
						{contactLine ? (
							<AppText tone="secondary" variant="subhead">
								{contactLine}
							</AppText>
						) : null}
						{companion.notes ? (
							<AppText tone="secondary" variant="subhead">
								{companion.notes}
							</AppText>
						) : null}
						<ContactActions
							email={companion.email}
							labels={{ call: "Call", email: "Email", message: "Message" }}
							onOpen={onOpenContact}
							phone={companion.phone}
						/>
					</View>
					<Menu>
						<Menu.Trigger asChild={true}>
							<MenuTrigger label="Companion options" />
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Overlay />
							<Menu.Content
								align="end"
								className={menuContentClassName}
								offset={8}
								placement="bottom"
								presentation="popover"
								width={200}
							>
								<Menu.Item
									accessibilityLabel="Edit companion"
									className={menuItemClassName}
									isAnimatedStyleActive={false}
									onPress={onEdit}
								>
									<MenuIcon name="create-outline" />
									<Menu.ItemTitle className="text-base">
										Edit companion
									</Menu.ItemTitle>
								</Menu.Item>
								<MenuDivider />
								<Menu.Item
									accessibilityLabel="Delete companion"
									className={menuItemClassName}
									isAnimatedStyleActive={false}
									isDisabled={isPending}
									onPress={onDelete}
								>
									<MenuIcon destructive={true} name="trash-outline" />
									<Menu.ItemTitle className="text-base text-danger">
										Delete companion
									</Menu.ItemTitle>
								</Menu.Item>
							</Menu.Content>
						</Menu.Portal>
					</Menu>
				</View>
			</Card>
		</Animated.View>
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
	const { confirm } = useFeedback();
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
		return <LoadingState title="Loading companions" />;
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

	const confirmDeleteCompanion = async (companion: Doc<"tripCompanions">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete",
			destructive: true,
			message: "This person will be removed from the trip.",
			title: `Delete ${companion.name}?`,
		});
		if (confirmed) {
			await handleDeleteCompanion(companion._id);
		}
	};
	const openContact = (url: string) => {
		handleOpenContact(url).catch(() => undefined);
	};

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
				<View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
					<TripModuleManualEntryCard
						description="Save traveler roles, contact details, emergency contacts, and coordination notes."
						moduleLabel="companions"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="people-outline"
						primaryActionLabel="Add companion"
					/>
					<InlineMessage message={contactErrorMessage} />
					<InlineMessage message={companionErrorMessage} />

					<Card>
						<View style={{ gap: spacing.lg }}>
							<SectionHeader eyebrow="Group coordination" title="Travelers" />
							<AppText tone="secondary" variant="subhead">
								Keep travelers, contacts, and responsibilities easy to scan.
							</AppText>
							<TagRow
								labels={[
									`${companions.length} people`,
									`${contactReadyCount} reachable`,
									`${emergencyContactCount} emergency contacts`,
								]}
							/>
							<LeadContactSummary
								leadCompanion={leadCompanion}
								onAddLead={openLeadContactSheet}
								onOpenContact={openContact}
								onReview={() => {
									if (leadCompanion) {
										openEditSheet(leadCompanion);
									}
								}}
							/>
						</View>
					</Card>

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
						<View style={{ gap: spacing.md }}>
							{companions.map((companion) => (
								<CompanionCard
									companion={companion}
									isPending={pendingCompanionId === companion._id}
									key={companion._id}
									onDelete={() => {
										confirmDeleteCompanion(companion).catch(() => undefined);
									}}
									onEdit={() => openEditSheet(companion)}
									onOpenContact={openContact}
								/>
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
