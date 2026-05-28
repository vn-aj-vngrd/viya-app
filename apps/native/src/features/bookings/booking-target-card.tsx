import { Ionicons } from "@expo/vector-icons";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import { Button, Chip, Spinner, Surface, Text } from "heroui-native";
import { Linking, View } from "react-native";

import { formatReadableTripDateRange } from "@/src/components/date/date-format-utils";

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

interface BookingTargetCardProps {
	booking: Doc<"bookings">;
	isUpdating: boolean;
	onMarkBooked: (booking: Doc<"bookings">) => void;
	onMarkConfirmed: (booking: Doc<"bookings">) => void;
	onUploadConfirmation: () => void;
}

export function BookingTargetCard({
	booking,
	isUpdating,
	onMarkBooked,
	onMarkConfirmed,
	onUploadConfirmation,
}: BookingTargetCardProps) {
	const cost = formatCost(booking.cost, booking.currency);
	const bookingWindow = formatReadableTripDateRange({
		endDate: booking.endDateTime,
		fallbackLabel: "",
		startDate: booking.startDateTime,
	});

	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<View className="flex-row items-start gap-3">
				<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="calendar-outline" size={20} />
				</View>
				<View className="flex-1 gap-2">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>{booking.type}</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{statusLabels[booking.status] ?? booking.status}
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
					{bookingWindow ? (
						<Text color="muted" type="body-xs">
							{bookingWindow}
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

			<View className="flex-row flex-wrap gap-2">
				{booking.externalUrl ? (
					<Button
						className="flex-1"
						onPress={() => {
							Linking.openURL(booking.externalUrl ?? "").catch(() => undefined);
						}}
						size="sm"
						variant="secondary"
					>
						<Button.Label>Open provider</Button.Label>
					</Button>
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
					variant="ghost"
				>
					<Button.Label>Upload confirmation</Button.Label>
				</Button>
			</View>
		</Surface>
	);
}
