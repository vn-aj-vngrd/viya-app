import type { Href } from "expo-router";
import { Button, Chip, Text } from "heroui-native";
import { View } from "react-native";

import { VIYA_ROUTES } from "@/src/constants/routes";

import {
	EmptyCopy,
	InfoRow,
	LinkButton,
	Section,
} from "./trip-dashboard-components";
import type { TripDashboardModel, TripTab } from "./trip-dashboard-types";
import { formatMoney, formatStatus } from "./trip-dashboard-utils";

const updateDateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "short",
});

const getTimeRange = ({
	endTime,
	startTime,
}: {
	endTime?: string;
	startTime?: string;
}) => {
	if (startTime && endTime) {
		return `${startTime} - ${endTime}`;
	}

	return startTime || "Time TBD";
};

function MissingList({
	items,
	limit = 4,
}: {
	items: TripDashboardModel["missingItems"];
	limit?: number;
}) {
	if (items.length === 0) {
		return (
			<EmptyCopy icon="checkmark-circle-outline">
				No critical gaps right now.
			</EmptyCopy>
		);
	}

	return (
		<View className="gap-2">
			{items.slice(0, limit).map((item) => (
				<View
					className="flex-row items-center gap-3 rounded-[18px] bg-surface-secondary p-3"
					key={`${item.category}-${item.title}`}
				>
					<View className="min-w-0 flex-1">
						<Text numberOfLines={1} type="body-sm" weight="semibold">
							{item.title}
						</Text>
						<Text color="muted" numberOfLines={1} type="body-xs">
							{item.category}
						</Text>
					</View>
					<LinkButton href={item.href}>Fix</LinkButton>
				</View>
			))}
		</View>
	);
}

function TimelinePreview({ model }: { model: TripDashboardModel }) {
	const { nextScheduledItem, nowScheduledItem } = model;

	return (
		<View className="gap-2">
			<InfoRow
				detail={
					nowScheduledItem
						? `${getTimeRange(nowScheduledItem.item)} - ${
								nowScheduledItem.item.locationName || "Location TBD"
							}`
						: "Add itinerary items to power the trip board."
				}
				icon="play-circle-outline"
				label={nowScheduledItem?.item.title ?? "No current item"}
			/>
			<InfoRow
				detail={
					nextScheduledItem
						? `${getTimeRange(nextScheduledItem.item)} - ${
								nextScheduledItem.item.locationName || "Location TBD"
							}`
						: "Viya will surface the next step once the plan has timing."
				}
				icon="play-forward-outline"
				label={nextScheduledItem?.item.title ?? "No next item"}
			/>
		</View>
	);
}

export function OverviewTab({
	model,
	onSelectTab,
}: {
	model: TripDashboardModel;
	onSelectTab: (tab: TripTab) => void;
}) {
	return (
		<View className="gap-4">
			<Section icon="navigate-outline" title="Now / Next">
				<TimelinePreview model={model} />
				<View className="flex-row flex-wrap gap-2">
					<LinkButton href={VIYA_ROUTES.tripItinerary(model.tripId)}>
						Open itinerary
					</LinkButton>
					<LinkButton href={VIYA_ROUTES.tripTravelMode(model.tripId)}>
						Travel mode
					</LinkButton>
				</View>
			</Section>

			<Section icon="alert-circle-outline" title="Needs Attention">
				<MissingList items={model.missingItems} limit={3} />
				{model.missingItems.length > 3 ? (
					<Button
						onPress={() => onSelectTab("checklist")}
						size="sm"
						variant="secondary"
					>
						<Button.Label>See all gaps</Button.Label>
					</Button>
				) : null}
			</Section>

			<Section icon="wallet-outline" title="Budget">
				<View className="flex-row flex-wrap gap-2">
					<InfoRow
						detail={`${formatMoney(model.budget.dailySafeSpend, model.currency)} safe daily spend`}
						icon="cash-outline"
						label={formatMoney(model.budget.remaining, model.currency)}
						right={model.budget.status}
					/>
				</View>
				<LinkButton href={VIYA_ROUTES.tripBudget(model.tripId)}>
					Manage budget
				</LinkButton>
			</Section>

			<Section icon="time-outline" title="Recent Updates">
				{model.recentUpdates.length === 0 ? (
					<EmptyCopy>Trip changes will appear here.</EmptyCopy>
				) : (
					<View className="gap-2">
						{model.recentUpdates.map((update) => (
							<InfoRow
								detail={updateDateFormatter.format(new Date(update.createdAt))}
								icon={update.icon}
								key={`${update.createdAt}-${update.message}`}
								label={update.message}
							/>
						))}
					</View>
				)}
			</Section>
		</View>
	);
}

export function ItineraryTab({ model }: { model: TripDashboardModel }) {
	return (
		<View className="gap-4">
			<Section icon="calendar-outline" title="Trip Plan">
				<Text color="muted" type="body-sm">
					Daily schedule, timing, locations, costs, notes, and linked bookings.
				</Text>
				<LinkButton href={VIYA_ROUTES.tripItinerary(model.tripId)}>
					Add or edit items
				</LinkButton>
			</Section>
			{model.workspace.itineraryDays.length === 0 ? (
				<EmptyCopy icon="calendar-outline">No itinerary days yet.</EmptyCopy>
			) : (
				model.workspace.itineraryDays.map((day) => {
					const dayItems = model.workspace.itineraryItems.filter(
						(item) => item.dayId === day._id
					);

					return (
						<Section
							icon="map-outline"
							key={day._id}
							title={`Day ${day.dayNumber}: ${day.title}`}
						>
							<Text color="muted" type="body-sm">
								{day.date} - {day.theme} -{" "}
								{formatMoney(day.estimatedCost, model.currency)}
							</Text>
							{dayItems.length === 0 ? (
								<EmptyCopy>No scheduled items for this day.</EmptyCopy>
							) : (
								<View className="gap-2">
									{dayItems.map((item) => (
										<InfoRow
											detail={`${getTimeRange(item)} - ${
												item.locationName || "Location TBD"
											}`}
											icon="ellipse-outline"
											key={item._id}
											label={item.title}
											right={formatMoney(item.estimatedCost, model.currency)}
										/>
									))}
								</View>
							)}
						</Section>
					);
				})
			)}
		</View>
	);
}

export function BookingsTab({ model }: { model: TripDashboardModel }) {
	return (
		<View className="gap-4">
			<Section icon="briefcase-outline" title="Bookings">
				<Text color="muted" type="body-sm">
					Confirm external bookings, upload confirmations, and keep references
					linked to itinerary and budget.
				</Text>
				<View className="flex-row flex-wrap gap-2">
					<LinkButton href={VIYA_ROUTES.tripBookings(model.tripId)}>
						Manage bookings
					</LinkButton>
					<LinkButton href={VIYA_ROUTES.tripVault(model.tripId)}>
						Upload confirmation
					</LinkButton>
				</View>
			</Section>
			{model.bookingsByType.length === 0 ? (
				<EmptyCopy icon="ticket-outline">No booking targets yet.</EmptyCopy>
			) : (
				model.bookingsByType.map((group) => (
					<Section
						icon="ticket-outline"
						key={group.type}
						title={formatStatus(group.type)}
					>
						<View className="gap-2">
							{group.items.map((booking) => (
								<InfoRow
									detail={`${booking.provider ?? "Provider TBD"} - Ref ${
										booking.confirmationCode ?? "TBD"
									}`}
									icon="briefcase-outline"
									key={booking._id}
									label={booking.title}
									right={formatStatus(booking.status)}
								/>
							))}
						</View>
					</Section>
				))
			)}
		</View>
	);
}

export function DocumentsTab({ model }: { model: TripDashboardModel }) {
	const hasDocuments =
		model.workspace.documents.length > 0 ||
		model.workspace.vaultItems.length > 0;

	return (
		<View className="gap-4">
			<Section icon="folder-open-outline" title="Documents">
				<Text color="muted" type="body-sm">
					Upload confirmations, IDs, receipts, QR codes, maps, and screenshots.
					TripSync reviews extracted details before saving.
				</Text>
				<LinkButton href={VIYA_ROUTES.tripVault(model.tripId)}>
					Upload document
				</LinkButton>
			</Section>
			{hasDocuments ? (
				<Section icon="document-text-outline" title="Saved">
					<View className="gap-2">
						{model.workspace.documents.map((document) => (
							<InfoRow
								detail={`${formatStatus(document.type)} - ${document.status}`}
								icon="document-outline"
								key={document._id}
								label={document.title}
							/>
						))}
						{model.workspace.vaultItems.map((item) => (
							<InfoRow
								detail={`${formatStatus(item.kind)} - ${item.fileName}`}
								icon="document-attach-outline"
								key={item._id}
								label={item.title}
								right={formatStatus(item.status)}
							/>
						))}
					</View>
				</Section>
			) : (
				<EmptyCopy icon="folder-open-outline">
					No documents uploaded yet.
				</EmptyCopy>
			)}
		</View>
	);
}

export function ChecklistTab({ model }: { model: TripDashboardModel }) {
	return (
		<View className="gap-4">
			<Section icon="checkbox-outline" title="Checklist">
				<Text color="muted" type="body-sm">
					Preparation tasks drive the readiness score. Finish blockers first.
				</Text>
				<LinkButton href={VIYA_ROUTES.tripReadiness(model.tripId)}>
					Manage checklist
				</LinkButton>
			</Section>
			<Section icon="alert-circle-outline" title="Open Items">
				<MissingList items={model.missingItems} limit={8} />
			</Section>
			{model.readinessByCategory.map((group) => (
				<Section
					icon="list-outline"
					key={group.category}
					title={formatStatus(group.category)}
				>
					<View className="gap-2">
						{group.items.map((item) => (
							<InfoRow
								detail={`${formatStatus(item.priority)} - ${
									item.dueDate || "No due date"
								}`}
								icon={
									item.status === "done"
										? "checkmark-circle-outline"
										: "ellipse-outline"
								}
								key={item._id}
								label={item.title}
								right={formatStatus(item.status)}
							/>
						))}
					</View>
				</Section>
			))}
		</View>
	);
}

export function BudgetTab({ model }: { model: TripDashboardModel }) {
	return (
		<View className="gap-4">
			<Section icon="wallet-outline" title="Budget">
				<View className="gap-2">
					<InfoRow
						detail="Remaining"
						icon="wallet-outline"
						label={formatMoney(model.budget.remaining, model.currency)}
						right={model.budget.status}
					/>
					<InfoRow
						detail="Confirmed bookings"
						icon="briefcase-outline"
						label={formatMoney(model.budget.booked, model.currency)}
					/>
					<InfoRow
						detail="Manual expenses"
						icon="receipt-outline"
						label={formatMoney(model.budget.spent, model.currency)}
					/>
				</View>
				<LinkButton href={VIYA_ROUTES.tripBudget(model.tripId)}>
					Log or edit spend
				</LinkButton>
			</Section>
			<Section icon="pie-chart-outline" title="Categories">
				{model.budget.categoryBreakdown.length === 0 ? (
					<EmptyCopy>No booked costs or expenses yet.</EmptyCopy>
				) : (
					<View className="gap-2">
						{model.budget.categoryBreakdown.map((item) => (
							<InfoRow
								key={item.category}
								label={formatStatus(item.category)}
								right={formatMoney(item.amount, model.currency)}
							/>
						))}
					</View>
				)}
			</Section>
		</View>
	);
}

export function ViyaTab() {
	const prompts = [
		"What am I missing?",
		"Check my readiness.",
		"What should I do next?",
		"Can I still afford this?",
		"Create my recap.",
	];

	return (
		<View className="gap-4">
			<Section icon="sparkles-outline" title="Viya">
				<Text color="muted" type="body-sm">
					Viya should answer from this trip context and ask before applying
					changes.
				</Text>
				<LinkButton href={VIYA_ROUTES.viya as Href} variant="primary">
					Open Viya chat
				</LinkButton>
			</Section>
			<Section icon="chatbubble-ellipses-outline" title="Useful Prompts">
				<View className="flex-row flex-wrap gap-2">
					{prompts.map((prompt) => (
						<LinkButton href={VIYA_ROUTES.viya as Href} key={prompt}>
							{prompt}
						</LinkButton>
					))}
				</View>
			</Section>
		</View>
	);
}

export function TravelTab({ model }: { model: TripDashboardModel }) {
	return (
		<View className="gap-4">
			<Section icon="navigate-outline" title="Travel Mode">
				<TimelinePreview model={model} />
			</Section>
			<Section icon="warning-outline" title="Watch Out">
				{model.watchOutItems.length === 0 ? (
					<EmptyCopy icon="checkmark-circle-outline">
						No active warnings.
					</EmptyCopy>
				) : (
					<View className="gap-2">
						{model.watchOutItems.map((item) => (
							<InfoRow icon="warning-outline" key={item} label={item} />
						))}
					</View>
				)}
			</Section>
			<Section icon="cash-outline" title="Today's Budget">
				<InfoRow
					detail="Safe daily spend"
					icon="cash-outline"
					label={formatMoney(model.budget.dailySafeSpend, model.currency)}
					right={model.budget.status}
				/>
			</Section>
			<Section icon="documents-outline" title="Important Documents">
				{model.activeDocuments.length === 0 ? (
					<EmptyCopy>No important documents uploaded yet.</EmptyCopy>
				) : (
					<View className="gap-2">
						{model.activeDocuments.map((document) => (
							<InfoRow
								icon="document-outline"
								key={document}
								label={document}
							/>
						))}
					</View>
				)}
			</Section>
		</View>
	);
}

export function MemoriesTab({ model }: { model: TripDashboardModel }) {
	return (
		<View className="gap-4">
			<Section icon="images-outline" title="Memories">
				<Text color="muted" type="body-sm">
					Capture moments during the trip. They become the recap source.
				</Text>
				<LinkButton href={VIYA_ROUTES.viya as Href}>Add with Viya</LinkButton>
			</Section>
			{model.workspace.moments.length === 0 ? (
				<EmptyCopy icon="images-outline">No memories yet.</EmptyCopy>
			) : (
				model.workspace.moments.map((moment) => (
					<Section icon="image-outline" key={moment._id} title={moment.title}>
						<Text color="muted" type="body-sm">
							{moment.locationName || "Location TBD"} -{" "}
							{updateDateFormatter.format(new Date(moment.createdAt))}
						</Text>
						<Text.Paragraph color="muted" type="body-sm">
							{moment.note || moment.caption}
						</Text.Paragraph>
						{moment.isHighlight ? (
							<Chip size="sm" variant="secondary">
								<Chip.Label>Highlight</Chip.Label>
							</Chip>
						) : null}
					</Section>
				))
			)}
		</View>
	);
}

export function RecapTab({ model }: { model: TripDashboardModel }) {
	return (
		<View className="gap-4">
			<Section icon="share-social-outline" title="Recap">
				<Text.Paragraph color="muted" type="body-sm">
					{model.workspace.trip.summary}
				</Text.Paragraph>
				<View className="flex-row flex-wrap gap-2">
					<LinkButton href={VIYA_ROUTES.viya as Href}>
						Generate with Viya
					</LinkButton>
					<LinkButton href={VIYA_ROUTES.viya as Href}>
						Draft captions
					</LinkButton>
				</View>
			</Section>
			<Section icon="star-outline" title="Highlights">
				{model.highlights.length === 0 ? (
					<EmptyCopy>Highlights will come from saved memories.</EmptyCopy>
				) : (
					<View className="gap-2">
						{model.highlights.map((highlight) => (
							<InfoRow icon="star-outline" key={highlight} label={highlight} />
						))}
					</View>
				)}
			</Section>
			<Section icon="cash-outline" title="Spend Summary">
				<InfoRow
					detail="Tracked spend"
					icon="cash-outline"
					label={formatMoney(model.budget.totalTrackedSpend, model.currency)}
				/>
			</Section>
		</View>
	);
}

export function TripTabContent({
	activeTab,
	model,
	onSelectTab,
}: {
	activeTab: TripTab;
	model: TripDashboardModel;
	onSelectTab: (tab: TripTab) => void;
}) {
	if (activeTab === "overview") {
		return <OverviewTab model={model} onSelectTab={onSelectTab} />;
	}

	if (activeTab === "itinerary") {
		return <ItineraryTab model={model} />;
	}

	if (activeTab === "bookings") {
		return <BookingsTab model={model} />;
	}

	if (activeTab === "documents") {
		return <DocumentsTab model={model} />;
	}

	if (activeTab === "checklist") {
		return <ChecklistTab model={model} />;
	}

	if (activeTab === "budget") {
		return <BudgetTab model={model} />;
	}

	if (activeTab === "viya") {
		return <ViyaTab />;
	}

	if (activeTab === "travel") {
		return <TravelTab model={model} />;
	}

	if (activeTab === "memories") {
		return <MemoriesTab model={model} />;
	}

	return <RecapTab model={model} />;
}
