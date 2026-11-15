import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	AppSheet,
	AppText,
	ListGroup,
	ListRow,
	PrimaryButton,
	SheetHeader,
	spacing,
} from "@/src/components/ui";

import { formatEnumLabel, formatMoney } from "@/src/lib/format";
import type { PendingTripSyncReview } from "./tripsync-types";

interface TripSyncReviewSheetProps {
	isConfirming: boolean;
	isOpen: boolean;
	onConfirm: () => void;
	onDiscard: () => void;
	onOpenChange: (isOpen: boolean) => void;
	review: PendingTripSyncReview | null;
}

export function TripSyncReviewSheet({
	isConfirming,
	isOpen,
	onConfirm,
	onDiscard,
	onOpenChange,
	review,
}: TripSyncReviewSheetProps) {
	const insets = useSafeAreaInsets();
	const extraction = review?.extraction;
	const booking = extraction?.booking;
	const expense = extraction?.expense;

	return (
		<AppSheet
			enablePanDownToClose={!isConfirming}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			snapPoints={["88%"]}
		>
			<SheetHeader
				onClose={isConfirming ? undefined : onDiscard}
				title="Review changes"
			/>
			<ScrollView
				contentContainerStyle={{
					gap: spacing.section,
					paddingBottom: spacing.lg,
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.lg,
				}}
				showsVerticalScrollIndicator={false}
				style={{ flexShrink: 1 }}
			>
				{extraction ? (
					<>
						<AppText tone="secondary" variant="subhead">
							Viya read this file and found these updates. Nothing is saved
							until you apply them.
						</AppText>
						<ListGroup header="File">
							<ListRow
								subtitle={extraction.summary}
								title={extraction.extractedTitle}
								value={`${Math.round(extraction.confidence * 100)}% confidence`}
							/>
							<ListRow
								title="Type"
								value={formatEnumLabel(extraction.documentType)}
							/>
						</ListGroup>
						{booking ? (
							<ListGroup header="Booking">
								<ListRow
									subtitle={[
										booking.provider ?? "Provider not found",
										booking.confirmationCode ?? "No confirmation code",
									].join(" · ")}
									title={booking.title}
									value={
										booking.cost
											? formatMoney(booking.cost, booking.currency ?? "PHP")
											: undefined
									}
								/>
							</ListGroup>
						) : null}
						{expense ? (
							<ListGroup header="Expense">
								<ListRow
									subtitle={formatEnumLabel(expense.category)}
									title={expense.title}
									value={formatMoney(expense.amount, expense.currency)}
								/>
							</ListGroup>
						) : null}
						{extraction.readinessSuggestions.length > 0 ? (
							<ListGroup header="Checklist">
								{extraction.readinessSuggestions.map((suggestion) => (
									<ListRow
										key={suggestion.title}
										subtitle={suggestion.reason}
										title={suggestion.title}
									/>
								))}
							</ListGroup>
						) : null}
					</>
				) : null}
			</ScrollView>
			<View
				style={{
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
				}}
			>
				<PrimaryButton
					disabled={!review}
					isPending={isConfirming}
					label="Apply changes"
					onPress={onConfirm}
				/>
			</View>
		</AppSheet>
	);
}
