import { Ionicons } from "@expo/vector-icons";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { useState } from "react";
import { Linking, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { formatReadableTripDateRange } from "@/src/components/date/date-format-utils";
import {
	AppText,
	Card,
	Chip,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "@/src/features/trips/trip-map-link-utils";

import { PillAction } from "./pill-action";

const statusLabels: Record<string, string> = {
	bookedExternally: "Booked externally",
	cancelled: "Cancelled",
	confirmed: "Confirmed",
	missing: "Missing",
	target: "Target",
};

const formatCost = (cost?: number, currency = "PHP") => {
	if (typeof cost !== "number") {
		return null;
	}

	return new Intl.NumberFormat("en-PH", {
		currency,
		maximumFractionDigits: 0,
		style: "currency",
	}).format(cost);
};

const formatBookingTypeLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

interface BookingTargetCardProps {
	booking: Doc<"bookings">;
	isUpdating: boolean;
	itineraryHref?: Href | null;
	itineraryUsageLabel?: string;
	linkedVaultItemLabel?: string;
	onDelete: (booking: Doc<"bookings">) => void;
	onEdit: (booking: Doc<"bookings">) => void;
	onMarkBooked: (booking: Doc<"bookings">) => void;
	onMarkConfirmed: (booking: Doc<"bookings">) => void;
	onUploadConfirmation: () => void;
	proofUrl?: string | null;
}

function BookingTargetActions({
	booking,
	canOpenMaps,
	isUpdating,
	itineraryHref,
	linkedVaultItemLabel,
	onDelete,
	onEdit,
	onMarkBooked,
	onMarkConfirmed,
	onOpenMaps,
	onOpenProof,
	onOpenProvider,
	onUploadConfirmation,
	proofUrl,
}: {
	booking: Doc<"bookings">;
	canOpenMaps: boolean;
	isUpdating: boolean;
	itineraryHref?: Href | null;
	linkedVaultItemLabel?: string;
	onDelete: (booking: Doc<"bookings">) => void;
	onEdit: (booking: Doc<"bookings">) => void;
	onMarkBooked: (booking: Doc<"bookings">) => void;
	onMarkConfirmed: (booking: Doc<"bookings">) => void;
	onOpenMaps: () => void;
	onOpenProof: () => void;
	onOpenProvider: () => void;
	onUploadConfirmation: () => void;
	proofUrl?: string | null;
}) {
	return (
		<View style={{ gap: spacing.sm }}>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				<PillAction
					disabled={booking.status === "confirmed"}
					isPending={isUpdating}
					label="Confirm"
					onPress={() => onMarkConfirmed(booking)}
					tone="primary"
				/>
				<PillAction
					disabled={booking.status === "bookedExternally"}
					isPending={isUpdating}
					label="Mark booked externally"
					onPress={() => onMarkBooked(booking)}
				/>
			</View>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				{canOpenMaps ? (
					<PillAction
						icon="map-outline"
						label="Open Maps"
						onPress={onOpenMaps}
					/>
				) : null}
				{booking.externalUrl ? (
					<PillAction
						icon="open-outline"
						label="Open provider"
						onPress={onOpenProvider}
					/>
				) : null}
				{proofUrl ? (
					<PillAction
						icon="document-attach-outline"
						label="Open proof"
						onPress={onOpenProof}
					/>
				) : null}
				{itineraryHref ? (
					<Link asChild href={itineraryHref}>
						<PillAction icon="calendar-outline" label="Open itinerary" />
					</Link>
				) : null}
				<PillAction
					icon="cloud-upload-outline"
					label={
						linkedVaultItemLabel ? "Manage confirmation" : "Upload confirmation"
					}
					onPress={onUploadConfirmation}
				/>
			</View>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				<PillAction
					disabled={isUpdating}
					icon="create-outline"
					label="Edit target"
					onPress={() => onEdit(booking)}
				/>
				<PillAction
					disabled={isUpdating}
					icon="trash-outline"
					label="Delete target"
					onPress={() => onDelete(booking)}
					tone="danger"
				/>
			</View>
		</View>
	);
}

export function BookingTargetCard({
	booking,
	itineraryHref,
	itineraryUsageLabel,
	isUpdating,
	linkedVaultItemLabel,
	onDelete,
	onEdit,
	onMarkBooked,
	onMarkConfirmed,
	onUploadConfirmation,
	proofUrl,
}: BookingTargetCardProps) {
	const { palette } = useUITheme();
	const cost = formatCost(booking.cost, booking.currency);
	const [providerErrorMessage, setProviderErrorMessage] = useState<
		string | null
	>(null);
	const [proofErrorMessage, setProofErrorMessage] = useState<string | null>(
		null
	);
	const bookingWindow = formatReadableTripDateRange({
		endDate: booking.endDateTime,
		fallbackLabel: "",
		startDate: booking.startDateTime,
	});
	const openProvider = async () => {
		if (!booking.externalUrl) {
			return;
		}

		setProofErrorMessage(null);
		setProviderErrorMessage(null);
		try {
			await Linking.openURL(booking.externalUrl);
		} catch {
			setProviderErrorMessage("Could not open provider link.");
		}
	};
	const openMaps = async () => {
		setProofErrorMessage(null);
		setProviderErrorMessage(null);
		try {
			await Linking.openURL(
				getTripMapSearchUrl({
					address: booking.address,
					label: booking.title,
					locationName: booking.locationName,
				})
			);
		} catch {
			setProviderErrorMessage("Could not open Maps for this booking.");
		}
	};
	const onOpenProof = async () => {
		if (!proofUrl) {
			setProofErrorMessage("Confirmation file is not available yet.");
			return;
		}

		setProofErrorMessage(null);
		setProviderErrorMessage(null);
		try {
			await Linking.openURL(proofUrl);
		} catch {
			setProofErrorMessage("Could not open this confirmation.");
		}
	};
	const canOpenMaps = hasTripMapSearchTarget({
		address: booking.address,
		label: booking.title,
		locationName: booking.locationName,
	});

	return (
		<Animated.View entering={FadeInDown.springify().damping(20)}>
			<Card padding="lg" style={{ gap: spacing.lg }}>
				<View
					style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}
				>
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
						<Ionicons
							color={palette.accent}
							name="calendar-outline"
							size={19}
						/>
					</View>
					<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
						<AppText variant="headline">{booking.title}</AppText>
						{booking.provider ? (
							<AppText tone="secondary" variant="subhead">
								{booking.provider}
							</AppText>
						) : null}
						{bookingWindow ? (
							<AppText tone="secondary" variant="footnote">
								{bookingWindow}
							</AppText>
						) : null}
					</View>
					{cost ? (
						<AppText bold={true} variant="subhead">
							{cost}
						</AppText>
					) : null}
				</View>

				<View
					style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
				>
					<Chip label={formatBookingTypeLabel(booking.type)} />
					<Chip label={statusLabels[booking.status] ?? booking.status} />
					<Chip label={linkedVaultItemLabel ? "Proof linked" : "Needs proof"} />
					<Chip label={itineraryUsageLabel ? "On route" : "Not scheduled"} />
				</View>

				{booking.confirmationCode ||
				linkedVaultItemLabel ||
				itineraryUsageLabel ||
				booking.locationName ||
				booking.notes ? (
					<View style={{ gap: 4 }}>
						{booking.confirmationCode ? (
							<AppText tone="secondary" variant="footnote">
								Confirmation {booking.confirmationCode}
							</AppText>
						) : null}
						{linkedVaultItemLabel ? (
							<AppText tone="secondary" variant="footnote">
								Proof {linkedVaultItemLabel}
							</AppText>
						) : null}
						{itineraryUsageLabel ? (
							<AppText tone="secondary" variant="footnote">
								Route {itineraryUsageLabel}
							</AppText>
						) : null}
						{booking.locationName ? (
							<AppText tone="secondary" variant="footnote">
								{booking.locationName}
							</AppText>
						) : null}
						{booking.notes ? (
							<AppText tone="secondary" variant="subhead">
								{booking.notes}
							</AppText>
						) : null}
					</View>
				) : null}

				<BookingTargetActions
					booking={booking}
					canOpenMaps={canOpenMaps}
					isUpdating={isUpdating}
					itineraryHref={itineraryHref}
					linkedVaultItemLabel={linkedVaultItemLabel}
					onDelete={onDelete}
					onEdit={onEdit}
					onMarkBooked={onMarkBooked}
					onMarkConfirmed={onMarkConfirmed}
					onOpenMaps={() => {
						openMaps().catch(() => undefined);
					}}
					onOpenProof={() => {
						onOpenProof().catch(() => undefined);
					}}
					onOpenProvider={() => {
						openProvider().catch(() => undefined);
					}}
					onUploadConfirmation={onUploadConfirmation}
					proofUrl={proofUrl}
				/>
				{providerErrorMessage ? (
					<Animated.View entering={FadeIn}>
						<AppText accessibilityRole="alert" tone="danger" variant="subhead">
							{providerErrorMessage}
						</AppText>
					</Animated.View>
				) : null}
				{proofErrorMessage ? (
					<Animated.View entering={FadeIn}>
						<AppText accessibilityRole="alert" tone="danger" variant="subhead">
							{proofErrorMessage}
						</AppText>
					</Animated.View>
				) : null}
			</Card>
		</Animated.View>
	);
}
