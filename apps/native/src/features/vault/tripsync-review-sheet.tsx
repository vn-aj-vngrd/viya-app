import { Ionicons } from "@expo/vector-icons";
import { BottomSheet, Button, Spinner, Surface, Text } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { ScrollView, View } from "react-native";

import type { PendingTripSyncReview } from "./tripsync-types";

interface TripSyncReviewSheetProps {
	isConfirming: boolean;
	isOpen: boolean;
	onConfirm: () => void;
	onDiscard: () => void;
	onOpenChange: (isOpen: boolean) => void;
	review: PendingTripSyncReview | null;
}

const tripSyncAccentColor = "#0A84FF";

const formatTypeLabel = (value: string) => {
	const normalizedValue = value.trim();

	if (!normalizedValue) {
		return normalizedValue;
	}

	return `${normalizedValue.charAt(0).toUpperCase()}${normalizedValue.slice(1)}`;
};

function ReviewPill({ children }: { children: ReactNode }) {
	return (
		<View className="rounded-full bg-surface px-2.5 py-1">
			<Text color="muted" type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
	);
}

function ReviewSection({
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
			<View>{children}</View>
		</View>
	);
}

function ReviewDivider() {
	return <View className="mx-1 h-px bg-border" />;
}

function ReviewDetailRow({
	detail,
	icon,
	meta,
	title,
}: {
	detail?: string | null;
	icon: ComponentProps<typeof Ionicons>["name"];
	meta?: string | null;
	title: string;
}) {
	const hasSupportingContent = Boolean(detail || meta);

	return (
		<View
			className="flex-row gap-3 px-1 py-3"
			style={{ alignItems: hasSupportingContent ? "flex-start" : "center" }}
		>
			<View className="h-9 w-9 items-center justify-center rounded-full bg-accent-soft">
				<Ionicons color={tripSyncAccentColor} name={icon} size={17} />
			</View>
			<View className="min-w-0 flex-1 gap-0.5">
				<View className="flex-row items-start justify-between gap-3">
					<Text
						className="min-w-0 flex-1"
						numberOfLines={2}
						type="body-sm"
						weight="semibold"
					>
						{title}
					</Text>
					{meta ? (
						<Text color="muted" numberOfLines={1} type="body-sm">
							{meta}
						</Text>
					) : null}
				</View>
				{detail ? (
					<Text color="muted" numberOfLines={2} type="body-xs">
						{detail}
					</Text>
				) : null}
			</View>
		</View>
	);
}

const formatExtractedAmount = (
	amount?: number | null,
	currency?: string | null
) =>
	typeof amount === "number"
		? `${currency ?? "PHP"} ${amount.toLocaleString()}`
		: null;

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
	const expenseAmountLabel = extraction?.expense
		? formatExtractedAmount(
				extraction.expense.amount,
				extraction.expense.currency
			)
		: null;

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					className="rounded-t-[34px] border border-border bg-surface px-5 pt-4 pb-8"
					enablePanDownToClose={true}
					snapPoints={["88%"]}
				>
					<View className="gap-4">
						<View className="gap-1">
							<BottomSheet.Title>Review TripSync</BottomSheet.Title>
							<BottomSheet.Description>
								Confirm the extracted trip updates before saving them.
							</BottomSheet.Description>
						</View>

						{extraction ? (
							<ScrollView
								contentContainerStyle={{ gap: 18, paddingBottom: 4 }}
								showsVerticalScrollIndicator={false}
								style={{ maxHeight: 560 }}
							>
								<Surface className="gap-3 rounded-[28px] border border-border bg-surface-secondary p-4">
									<View className="flex-row flex-wrap gap-2">
										<ReviewPill>
											{formatTypeLabel(review.upload.kind)}
										</ReviewPill>
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

								<ReviewSection title="EXTRACTED UPDATES">
									{extraction.booking ? (
										<>
											<ReviewDetailRow
												detail={[
													extraction.booking.provider ??
														"Provider not detected",
													extraction.booking.confirmationCode ??
														"Confirmation code not detected",
												].join(" · ")}
												icon="ticket-outline"
												meta={bookingAmountLabel}
												title={extraction.booking.title}
											/>
											<ReviewDivider />
										</>
									) : null}

									{extraction.expense ? (
										<>
											<ReviewDetailRow
												detail={formatTypeLabel(extraction.expense.category)}
												icon="wallet-outline"
												meta={expenseAmountLabel}
												title={extraction.expense.title}
											/>
											<ReviewDivider />
										</>
									) : null}

									<ReviewDetailRow
										icon="document-text-outline"
										title={formatTypeLabel(extraction.documentType)}
									/>
								</ReviewSection>

								{extraction.readinessSuggestions.length > 0 ? (
									<ReviewSection title="READINESS">
										{extraction.readinessSuggestions.map((suggestion) => (
											<ReviewDetailRow
												detail={suggestion.reason}
												icon="checkmark-circle-outline"
												key={suggestion.title}
												title={suggestion.title}
											/>
										))}
									</ReviewSection>
								) : null}
							</ScrollView>
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
