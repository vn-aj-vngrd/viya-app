import { BottomSheet } from "heroui-native";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	AppText,
	Card,
	Chip,
	PrimaryButton,
	SecondaryButton,
	SheetHeader,
	spacing,
} from "@/src/components/ui";

import type { PendingTripSyncReview } from "./tripsync-types";

interface TripSyncReviewSheetProps {
	isConfirming: boolean;
	isOpen: boolean;
	onConfirm: () => void;
	onDiscard: () => void;
	onOpenChange: (isOpen: boolean) => void;
	review: PendingTripSyncReview | null;
}

function ReviewSection({
	children,
	eyebrow,
}: {
	children: ReactNode;
	eyebrow: string;
}) {
	return (
		<Card padding="md">
			<View style={{ gap: spacing.xs }}>
				<AppText tone="secondary" variant="eyebrow">
					{eyebrow}
				</AppText>
				{children}
			</View>
		</Card>
	);
}

const formatExtractedAmount = (
	amount?: number | null,
	currency?: string | null
) => (amount ? `${currency ?? "PHP"} ${amount.toLocaleString()}` : null);

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
	const bookingAmountLabel = extraction?.booking
		? formatExtractedAmount(
				extraction.booking.cost,
				extraction.booking.currency
			)
		: null;

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[32px] bg-background"
					enablePanDownToClose={!isConfirming}
					snapPoints={["78%"]}
				>
					<SheetHeader
						onClose={isConfirming ? undefined : onDiscard}
						subtitle="Confirm the extracted trip updates before saving them."
						title="Review TripSync"
					/>
					<View
						style={{
							gap: spacing.lg,
							paddingBottom: Math.max(insets.bottom, spacing.lg),
							paddingHorizontal: spacing.screen,
							paddingTop: spacing.sm,
						}}
					>
						<ScrollView
							contentContainerStyle={{ gap: spacing.md }}
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 420 }}
						>
							{extraction ? (
								<>
									<Card padding="md">
										<View style={{ gap: spacing.sm }}>
											<View
												style={{
													flexDirection: "row",
													flexWrap: "wrap",
													gap: spacing.sm,
												}}
											>
												<Chip label={review.upload.kind} />
												<Chip
													label={`${Math.round(extraction.confidence * 100)}% confidence`}
												/>
											</View>
											<AppText variant="headline">
												{extraction.extractedTitle}
											</AppText>
											<AppText tone="secondary" variant="subhead">
												{extraction.summary}
											</AppText>
										</View>
									</Card>

									{extraction.booking ? (
										<ReviewSection eyebrow="Booking">
											<AppText variant="headline">
												{extraction.booking.title}
											</AppText>
											<AppText tone="secondary" variant="footnote">
												{extraction.booking.provider ?? "Provider not detected"}
											</AppText>
											<AppText tone="secondary" variant="footnote">
												{extraction.booking.confirmationCode ??
													"Confirmation code not detected"}
											</AppText>
											{bookingAmountLabel ? (
												<AppText tone="secondary" variant="footnote">
													{bookingAmountLabel}
												</AppText>
											) : null}
										</ReviewSection>
									) : null}

									{extraction.expense ? (
										<ReviewSection eyebrow="Budget">
											<AppText variant="headline">
												{extraction.expense.title}
											</AppText>
											<AppText tone="secondary" variant="footnote">
												{extraction.expense.currency}{" "}
												{extraction.expense.amount}
											</AppText>
											<AppText tone="secondary" variant="footnote">
												{extraction.expense.category}
											</AppText>
										</ReviewSection>
									) : null}

									<ReviewSection eyebrow="Document">
										<AppText variant="headline">
											{extraction.documentType}
										</AppText>
									</ReviewSection>

									{extraction.readinessSuggestions.length > 0 ? (
										<ReviewSection eyebrow="Readiness">
											<View style={{ gap: spacing.md }}>
												{extraction.readinessSuggestions.map((suggestion) => (
													<View key={suggestion.title} style={{ gap: 2 }}>
														<AppText variant="headline">
															{suggestion.title}
														</AppText>
														<AppText tone="secondary" variant="footnote">
															{suggestion.reason}
														</AppText>
													</View>
												))}
											</View>
										</ReviewSection>
									) : null}
								</>
							) : null}
						</ScrollView>

						<View style={{ gap: spacing.sm }}>
							<PrimaryButton
								disabled={!review}
								isPending={isConfirming}
								label="Confirm and sync"
								onPress={onConfirm}
							/>
							<SecondaryButton
								disabled={isConfirming}
								label="Discard"
								onPress={onDiscard}
								variant="plain"
							/>
						</View>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
