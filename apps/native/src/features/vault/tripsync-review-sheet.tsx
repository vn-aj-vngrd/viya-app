import { BottomSheet, Button, Spinner, Surface, Text } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import type { PendingTripSyncReview } from "./tripsync-types";

interface TripSyncReviewSheetProps {
	isConfirming: boolean;
	isOpen: boolean;
	onConfirm: () => void;
	onDiscard: () => void;
	onOpenChange: (isOpen: boolean) => void;
	review: PendingTripSyncReview | null;
}

function ReviewPill({ children }: { children: ReactNode }) {
	return (
		<View className="rounded-full bg-surface px-2.5 py-1">
			<Text color="muted" type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
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
					className="rounded-t-[34px] border border-border bg-surface px-5 pt-4 pb-8"
					enableDynamicSizing={true}
				>
					<View className="gap-4">
						<View className="gap-1">
							<BottomSheet.Title>Review TripSync</BottomSheet.Title>
							<BottomSheet.Description>
								Confirm the extracted trip updates before saving them.
							</BottomSheet.Description>
						</View>

						{extraction ? (
							<View className="gap-3">
								<Surface className="gap-2 rounded-[24px] bg-surface-secondary p-4">
									<View className="flex-row flex-wrap gap-2">
										<ReviewPill>{review.upload.kind}</ReviewPill>
										<ReviewPill>
											{Math.round(extraction.confidence * 100)}% confidence
										</ReviewPill>
									</View>
									<Text type="body" weight="bold">
										{extraction.extractedTitle}
									</Text>
									<Text.Paragraph color="muted" type="body-sm">
										{extraction.summary}
									</Text.Paragraph>
								</Surface>

								{extraction.booking ? (
									<Surface className="gap-1 rounded-[24px] bg-surface-secondary p-4">
										<Text color="muted" type="body-xs" weight="semibold">
											BOOKING
										</Text>
										<Text type="body-sm" weight="bold">
											{extraction.booking.title}
										</Text>
										<Text color="muted" type="body-xs">
											{extraction.booking.provider ?? "Provider not detected"}
										</Text>
										<Text color="muted" type="body-xs">
											{extraction.booking.confirmationCode ??
												"Confirmation code not detected"}
										</Text>
										{bookingAmountLabel ? (
											<Text color="muted" type="body-xs">
												{bookingAmountLabel}
											</Text>
										) : null}
									</Surface>
								) : null}

								{extraction.expense ? (
									<Surface className="gap-1 rounded-[24px] bg-surface-secondary p-4">
										<Text color="muted" type="body-xs" weight="semibold">
											BUDGET
										</Text>
										<Text type="body-sm" weight="bold">
											{extraction.expense.title}
										</Text>
										<Text color="muted" type="body-xs">
											{extraction.expense.currency} {extraction.expense.amount}
										</Text>
										<Text color="muted" type="body-xs">
											{extraction.expense.category}
										</Text>
									</Surface>
								) : null}

								<Surface className="gap-1 rounded-[24px] bg-surface-secondary p-4">
									<Text color="muted" type="body-xs" weight="semibold">
										DOCUMENT
									</Text>
									<Text type="body-sm" weight="bold">
										{extraction.documentType}
									</Text>
								</Surface>

								{extraction.readinessSuggestions.length > 0 ? (
									<Surface className="gap-2 rounded-[24px] bg-surface-secondary p-4">
										<Text color="muted" type="body-xs" weight="semibold">
											READINESS
										</Text>
										{extraction.readinessSuggestions.map((suggestion) => (
											<View className="gap-1" key={suggestion.title}>
												<Text type="body-sm" weight="bold">
													{suggestion.title}
												</Text>
												<Text color="muted" type="body-xs">
													{suggestion.reason}
												</Text>
											</View>
										))}
									</Surface>
								) : null}
							</View>
						) : null}

						<View className="gap-2">
							<Button isDisabled={isConfirming || !review} onPress={onConfirm}>
								{isConfirming ? <Spinner size="sm" /> : null}
								<Button.Label>Confirm and sync</Button.Label>
							</Button>
							<Button
								isDisabled={isConfirming}
								onPress={onDiscard}
								variant="secondary"
							>
								<Button.Label>Discard</Button.Label>
							</Button>
						</View>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
