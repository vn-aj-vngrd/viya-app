import { Ionicons } from "@expo/vector-icons";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Button, Chip, Spinner, Surface, Text } from "heroui-native";
import { useState } from "react";
import { Linking, View } from "react-native";

import { formatReadableTripDateRange } from "@/src/components/date/date-format-utils";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "@/src/features/trips/trip-map-link-utils";

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
		<View className="flex-row flex-wrap gap-2">
			{canOpenMaps ? (
				<Button
					className="flex-1"
					onPress={onOpenMaps}
					size="sm"
					variant="secondary"
				>
					<Ionicons color="#FF9F0A" name="map-outline" size={16} />
					<Button.Label>Open Maps</Button.Label>
				</Button>
			) : null}
			{booking.externalUrl ? (
				<Button
					className="flex-1"
					onPress={onOpenProvider}
					size="sm"
					variant="secondary"
				>
					<Button.Label>Open provider</Button.Label>
				</Button>
			) : null}
			{proofUrl ? (
				<Button
					className="flex-1"
					onPress={onOpenProof}
					size="sm"
					variant="secondary"
				>
					<Ionicons color="#0A84FF" name="document-attach-outline" size={16} />
					<Button.Label>Open proof</Button.Label>
				</Button>
			) : null}
			{itineraryHref ? (
				<Link asChild href={itineraryHref}>
					<Button className="flex-1" size="sm" variant="secondary">
						<Ionicons color="#0A84FF" name="calendar-outline" size={16} />
						<Button.Label>Open itinerary</Button.Label>
					</Button>
				</Link>
			) : null}
			<Button
				className="flex-1"
				isDisabled={isUpdating || booking.status === "bookedExternally"}
				onPress={() => onMarkBooked(booking)}
				size="sm"
				variant="secondary"
			>
				{isUpdating ? <Spinner size="sm" /> : null}
				<Button.Label>Mark booked externally</Button.Label>
			</Button>
			<Button
				className="flex-1"
				isDisabled={isUpdating || booking.status === "confirmed"}
				onPress={() => onMarkConfirmed(booking)}
				size="sm"
			>
				<Button.Label>Confirm</Button.Label>
			</Button>
			<Button
				className="w-full"
				onPress={onUploadConfirmation}
				size="sm"
				variant="tertiary"
			>
				<Button.Label>
					{linkedVaultItemLabel ? "Manage confirmation" : "Upload confirmation"}
				</Button.Label>
			</Button>
			<Button
				className="flex-1"
				isDisabled={isUpdating}
				onPress={() => onEdit(booking)}
				size="sm"
				variant="secondary"
			>
				<Button.Label>Edit target</Button.Label>
			</Button>
			<Button
				className="flex-1"
				isDisabled={isUpdating}
				onPress={() => onDelete(booking)}
				size="sm"
				variant="tertiary"
			>
				<Button.Label>Delete target</Button.Label>
			</Button>
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
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<View className="flex-row items-start gap-3">
				<View
					className="h-11 w-11 items-center justify-center rounded-full"
					style={{ backgroundColor: "rgba(255, 159, 10, 0.12)" }}
				>
					<Ionicons color="#FF9F0A" name="calendar-outline" size={20} />
				</View>
				<View className="flex-1 gap-2">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>{formatBookingTypeLabel(booking.type)}</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{statusLabels[booking.status] ?? booking.status}
							</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{linkedVaultItemLabel ? "Proof linked" : "Needs proof"}
							</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{itineraryUsageLabel ? "On route" : "Not scheduled"}
							</Chip.Label>
						</Chip>
					</View>
					<Text type="body" weight="bold">
						{booking.title}
					</Text>
					{booking.provider ? (
						<Text color="muted" type="body-sm">
							{booking.provider}
						</Text>
					) : null}
					{booking.confirmationCode ? (
						<Text color="muted" type="body-xs" weight="semibold">
							Confirmation {booking.confirmationCode}
						</Text>
					) : null}
					{linkedVaultItemLabel ? (
						<Text color="muted" type="body-xs" weight="semibold">
							Proof {linkedVaultItemLabel}
						</Text>
					) : null}
					{bookingWindow ? (
						<Text color="muted" type="body-xs">
							{bookingWindow}
						</Text>
					) : null}
					{itineraryUsageLabel ? (
						<Text color="muted" type="body-xs" weight="semibold">
							Route {itineraryUsageLabel}
						</Text>
					) : null}
					{booking.locationName ? (
						<Text color="muted" type="body-xs">
							{booking.locationName}
						</Text>
					) : null}
					{cost ? (
						<Text color="muted" type="body-xs" weight="semibold">
							{cost}
						</Text>
					) : null}
					{booking.notes ? (
						<Text.Paragraph color="muted" type="body-sm">
							{booking.notes}
						</Text.Paragraph>
					) : null}
				</View>
			</View>

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
				<Text className="text-danger" type="body-sm">
					{providerErrorMessage}
				</Text>
			) : null}
			{proofErrorMessage ? (
				<Text className="text-danger" type="body-sm">
					{proofErrorMessage}
				</Text>
			) : null}
		</Surface>
	);
}
