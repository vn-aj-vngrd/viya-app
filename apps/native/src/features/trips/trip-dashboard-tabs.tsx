import type { Href } from "expo-router";
import { View } from "react-native";

import { AppText, SecondaryButton } from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";

import {
	EmptyCopy,
	InfoRow,
	LinkButton,
	Section,
} from "./trip-dashboard-components";
import type {
	IoniconName,
	TripDashboardModel,
	TripTab,
} from "./trip-dashboard-types";
import { formatMoney, formatStatus } from "./trip-dashboard-utils";
import {
	getTripRelatedEntityHref,
	getTripRelatedEntityLabel,
	getTripRelatedEntityLabelByKey,
} from "./trip-related-entities";

const updateDateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "short",
});
const dashboardPreviewLimit = 4;

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

const getCompanionDetail = ({
	email,
	phone,
}: {
	email?: string | null;
	phone?: string | null;
}) => {
	const detail = [email, phone].filter(Boolean).join(" - ");

	return detail || "Contact details not added yet";
};

const getNotePreview = ({
	body,
	category,
}: {
	body?: string | null;
	category: string;
}) => {
	const trimmedBody = body?.trim();

	return (
		trimmedBody || `No note body yet. Category: ${formatStatus(category)}.`
	);
};

const getNoteRelatedLabel = (
	note: TripDashboardModel["workspace"]["notes"][number],
	relatedEntityLabelByKey: Map<string, string>
) =>
	getTripRelatedEntityLabel(
		{
			relatedEntityId: note.relatedEntityId,
			relatedEntityType: note.relatedEntityType,
		},
		relatedEntityLabelByKey
	);

const getRiskRelatedLabel = (
	risk: TripDashboardModel["workspace"]["risks"][number],
	relatedEntityLabelByKey: Map<string, string>
) =>
	getTripRelatedEntityLabel(
		{
			relatedEntityId: risk.relatedEntityId,
			relatedEntityType: risk.relatedEntityType,
		},
		relatedEntityLabelByKey
	);

const getRiskDetail = (
	risk: TripDashboardModel["workspace"]["risks"][number],
	relatedEntityLabelByKey: Map<string, string>
) =>
	[
		formatStatus(risk.type),
		getRiskRelatedLabel(risk, relatedEntityLabelByKey),
		risk.suggestedAction,
	]
		.filter(Boolean)
		.join(" - ");

const getMomentPreview = ({
	caption,
	locationName,
	note,
}: {
	caption?: string | null;
	locationName?: string | null;
	note?: string | null;
}) => {
	const preview = note?.trim() || caption?.trim() || locationName?.trim();

	return preview || "Add a caption or note to give this memory context.";
};

const getTripSummaryPreview = ({
	destination,
	summary,
}: {
	destination: string;
	summary?: string | null;
}) => {
	const trimmedSummary = summary?.trim();

	return (
		trimmedSummary ||
		`Review highlights, spend, bookings, and files before wrapping ${destination}.`
	);
};

function DashboardPreviewActionRow({
	actionLabel,
	detail,
	href,
	icon,
	label,
	right,
}: {
	actionLabel: string;
	detail: string;
	href: Href;
	icon: IoniconName;
	label: string;
	right?: string;
}) {
	return (
		<View className="gap-2 rounded-[18px] bg-surface-secondary p-3">
			<InfoRow detail={detail} icon={icon} label={label} right={right} />
			<LinkButton href={href} icon="open-outline">
				{actionLabel}
			</LinkButton>
		</View>
	);
}

function TravelAlertRow({
	actionLabel,
	detail,
	href,
	icon,
	label,
	right,
}: {
	actionLabel: string;
	detail: string;
	href: Href;
	icon: IoniconName;
	label: string;
	right?: string;
}) {
	return (
		<DashboardPreviewActionRow
			actionLabel={actionLabel}
			detail={detail}
			href={href}
			icon={icon}
			label={label}
			right={right}
		/>
	);
}

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
						<AppText bold numberOfLines={1} variant="subhead">
							{item.title}
						</AppText>
						<AppText numberOfLines={1} tone="secondary" variant="footnote">
							{item.category}
						</AppText>
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
						: "Add timed itinerary items to surface the next step."
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
					<SecondaryButton
						label="See all gaps"
						onPress={() => onSelectTab("checklist")}
					/>
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
		</View>
	);
}

export function ItineraryTab({ model }: { model: TripDashboardModel }) {
	const visibleDays = model.workspace.itineraryDays.slice(
		0,
		dashboardPreviewLimit
	);

	return (
		<View className="gap-4">
			<Section icon="calendar-outline" title="Trip Plan">
				<AppText tone="secondary" variant="subhead">
					Daily schedule, timing, locations, costs, notes, and linked bookings.
				</AppText>
				<LinkButton href={VIYA_ROUTES.tripItinerary(model.tripId)}>
					Add or edit items
				</LinkButton>
			</Section>
			{model.workspace.itineraryDays.length === 0 ? (
				<EmptyCopy
					actionHref={VIYA_ROUTES.tripItinerary(model.tripId)}
					actionLabel="Add first day"
					icon="calendar-outline"
				>
					No itinerary days yet.
				</EmptyCopy>
			) : (
				<>
					{visibleDays.map((day) => {
						const dayItems = model.workspace.itineraryItems.filter(
							(item) => item.dayId === day._id
						);
						const visibleDayItems = dayItems.slice(0, dashboardPreviewLimit);

						return (
							<Section
								icon="map-outline"
								key={day._id}
								title={`Day ${day.dayNumber}: ${day.title}`}
							>
								<AppText tone="secondary" variant="subhead">
									{day.date} - {day.theme} -{" "}
									{formatMoney(day.estimatedCost, model.currency)}
								</AppText>
								{dayItems.length === 0 ? (
									<EmptyCopy
										actionHref={VIYA_ROUTES.tripItinerary(model.tripId)}
										actionLabel="Add item"
									>
										No scheduled items for this day.
									</EmptyCopy>
								) : (
									<View className="gap-2">
										{visibleDayItems.map((item) => (
											<DashboardPreviewActionRow
												actionLabel="Open itinerary item"
												detail={`${getTimeRange(item)} - ${
													item.locationName || "Location TBD"
												}`}
												href={VIYA_ROUTES.tripItinerary(model.tripId)}
												icon="ellipse-outline"
												key={item._id}
												label={item.title}
												right={formatMoney(item.estimatedCost, model.currency)}
											/>
										))}
										{dayItems.length > visibleDayItems.length ? (
											<LinkButton
												href={VIYA_ROUTES.tripItinerary(model.tripId)}
											>
												Open full day
											</LinkButton>
										) : null}
									</View>
								)}
							</Section>
						);
					})}
					{model.workspace.itineraryDays.length > visibleDays.length ? (
						<LinkButton href={VIYA_ROUTES.tripItinerary(model.tripId)}>
							Open all days
						</LinkButton>
					) : null}
				</>
			)}
		</View>
	);
}

export function PlacesTab({ model }: { model: TripDashboardModel }) {
	const itineraryPlaceCount = model.workspace.itineraryItems.filter((item) =>
		Boolean(item.locationName)
	).length;
	const savedPlacePreview = model.workspace.savedPlaces.slice(
		0,
		dashboardPreviewLimit
	);
	const itineraryStopPreview = model.workspace.itineraryItems
		.filter((item) => Boolean(item.locationName))
		.slice(0, dashboardPreviewLimit);
	const hasPlacePreview =
		savedPlacePreview.length > 0 || itineraryStopPreview.length > 0;

	return (
		<View className="gap-4">
			<Section icon="map-outline" title="Map / Places">
				<AppText tone="secondary" variant="subhead">
					Review saved places and itinerary stops before assigning them to days.
				</AppText>
				<LinkButton href={VIYA_ROUTES.tripPlaces(model.tripId)}>
					Open places
				</LinkButton>
			</Section>
			<Section icon="location-outline" title="Route Context">
				<View className="gap-2">
					<InfoRow
						detail="Saved by the traveler"
						icon="bookmark-outline"
						label={`${model.workspace.savedPlaces.length} saved places`}
					/>
					<InfoRow
						detail="From itinerary item locations"
						icon="calendar-outline"
						label={`${itineraryPlaceCount} itinerary stops`}
					/>
				</View>
			</Section>
			{hasPlacePreview ? (
				<Section icon="pin-outline" title="Saved Route Notes">
					<View className="gap-2">
						{savedPlacePreview.map((place) => (
							<DashboardPreviewActionRow
								actionLabel="Open saved place"
								detail={`${place.locationName} - ${formatStatus(place.category)}`}
								href={VIYA_ROUTES.tripPlaces(model.tripId)}
								icon="bookmark-outline"
								key={place._id}
								label={place.title}
								right="Saved"
							/>
						))}
						{itineraryStopPreview.map((item) => (
							<DashboardPreviewActionRow
								actionLabel="Open itinerary stop"
								detail={item.locationName ?? "Location TBD"}
								href={VIYA_ROUTES.tripItinerary(model.tripId)}
								icon="calendar-outline"
								key={item._id}
								label={item.title}
								right="Itinerary"
							/>
						))}
					</View>
				</Section>
			) : (
				<EmptyCopy
					actionHref={VIYA_ROUTES.tripPlaces(model.tripId)}
					actionLabel="Add place"
					icon="map-outline"
				>
					Add saved places or itinerary stops to build route context.
				</EmptyCopy>
			)}
		</View>
	);
}

export function BookingsTab({ model }: { model: TripDashboardModel }) {
	const visibleBookingGroups = model.bookingsByType.slice(
		0,
		dashboardPreviewLimit
	);
	const hasMoreBookings =
		model.bookingsByType.length > visibleBookingGroups.length ||
		visibleBookingGroups.some(
			(group) => group.items.length > dashboardPreviewLimit
		);

	return (
		<View className="gap-4">
			<Section icon="briefcase-outline" title="Bookings">
				<AppText tone="secondary" variant="subhead">
					Confirm external bookings, upload confirmations, and keep references
					linked to itinerary and budget.
				</AppText>
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
				<EmptyCopy
					actionHref={VIYA_ROUTES.tripBookings(model.tripId)}
					actionLabel="Add booking target"
					icon="ticket-outline"
				>
					No booking targets yet.
				</EmptyCopy>
			) : (
				<>
					{visibleBookingGroups.map((group) => (
						<Section
							icon="ticket-outline"
							key={group.type}
							title={formatStatus(group.type)}
						>
							<View className="gap-2">
								{group.items.slice(0, dashboardPreviewLimit).map((booking) => (
									<DashboardPreviewActionRow
										actionLabel="Open booking"
										detail={`${booking.provider ?? "Provider TBD"} - Ref ${
											booking.confirmationCode ?? "TBD"
										}`}
										href={VIYA_ROUTES.tripBookings(model.tripId)}
										icon="briefcase-outline"
										key={booking._id}
										label={booking.title}
										right={formatStatus(booking.status)}
									/>
								))}
							</View>
						</Section>
					))}
					{hasMoreBookings ? (
						<LinkButton href={VIYA_ROUTES.tripBookings(model.tripId)}>
							Open all bookings
						</LinkButton>
					) : null}
				</>
			)}
		</View>
	);
}

export function DocumentsTab({ model }: { model: TripDashboardModel }) {
	const relatedEntityLabelByKey = getTripRelatedEntityLabelByKey(
		model.workspace
	);
	const visibleDocuments = model.workspace.documents.slice(
		0,
		dashboardPreviewLimit
	);
	const visibleVaultItems = model.workspace.vaultItems.slice(
		0,
		dashboardPreviewLimit
	);
	const visibleDocumentCount =
		visibleDocuments.length + visibleVaultItems.length;
	const totalDocumentCount =
		model.workspace.documents.length + model.workspace.vaultItems.length;
	const hasDocuments =
		model.workspace.documents.length > 0 ||
		model.workspace.vaultItems.length > 0;

	return (
		<View className="gap-4">
			<Section icon="folder-open-outline" title="Documents">
				<AppText tone="secondary" variant="subhead">
					Upload confirmations, IDs, receipts, QR codes, maps, and screenshots.
					TripSync reviews extracted details before saving.
				</AppText>
				<LinkButton href={VIYA_ROUTES.tripVault(model.tripId)}>
					Upload document
				</LinkButton>
			</Section>
			{hasDocuments ? (
				<Section icon="document-text-outline" title="Saved">
					<View className="gap-2">
						{visibleDocuments.map((document) => (
							<DashboardPreviewActionRow
								actionLabel="Open document"
								detail={`${formatStatus(document.type)} - ${document.status}`}
								href={VIYA_ROUTES.tripVault(model.tripId)}
								icon="document-outline"
								key={document._id}
								label={document.title}
							/>
						))}
						{visibleVaultItems.map((item) => {
							const linkedEntityLabel = getTripRelatedEntityLabel(
								{
									relatedEntityId: item.linkedEntityId,
									relatedEntityType: item.linkedEntityType,
								},
								relatedEntityLabelByKey
							);
							const detail = linkedEntityLabel
								? `${formatStatus(item.kind)} - ${linkedEntityLabel}`
								: `${formatStatus(item.kind)} - ${item.fileName}`;
							const linkedEntityHref = getTripRelatedEntityHref({
								relatedEntityType: item.linkedEntityType,
								tripId: model.tripId,
							});

							return (
								<DashboardPreviewActionRow
									actionLabel={
										linkedEntityHref ? "Open linked item" : "Open file"
									}
									detail={detail}
									href={linkedEntityHref ?? VIYA_ROUTES.tripVault(model.tripId)}
									icon="document-attach-outline"
									key={item._id}
									label={item.title}
									right={formatStatus(item.status)}
								/>
							);
						})}
						{totalDocumentCount > visibleDocumentCount ? (
							<LinkButton href={VIYA_ROUTES.tripVault(model.tripId)}>
								Open all documents
							</LinkButton>
						) : null}
					</View>
				</Section>
			) : (
				<EmptyCopy
					actionHref={VIYA_ROUTES.tripVault(model.tripId)}
					actionLabel="Upload document"
					icon="folder-open-outline"
				>
					No documents uploaded yet.
				</EmptyCopy>
			)}
		</View>
	);
}

export function ChecklistTab({ model }: { model: TripDashboardModel }) {
	const visibleReadinessGroups = model.readinessByCategory.slice(
		0,
		dashboardPreviewLimit
	);
	const hasMoreReadinessItems =
		model.readinessByCategory.length > visibleReadinessGroups.length ||
		visibleReadinessGroups.some(
			(group) => group.items.length > dashboardPreviewLimit
		);

	return (
		<View className="gap-4">
			<Section icon="checkbox-outline" title="Checklist">
				<AppText tone="secondary" variant="subhead">
					Preparation tasks drive the readiness score. Finish blockers first.
				</AppText>
				<LinkButton href={VIYA_ROUTES.tripReadiness(model.tripId)}>
					Manage checklist
				</LinkButton>
			</Section>
			<Section icon="alert-circle-outline" title="Open Items">
				<MissingList items={model.missingItems} limit={8} />
			</Section>
			{visibleReadinessGroups.map((group) => (
				<Section
					icon="list-outline"
					key={group.category}
					title={formatStatus(group.category)}
				>
					<View className="gap-2">
						{group.items.slice(0, dashboardPreviewLimit).map((item) => (
							<DashboardPreviewActionRow
								actionLabel="Open checklist item"
								detail={`${formatStatus(item.priority)} - ${
									item.dueDate || "No due date"
								}`}
								href={VIYA_ROUTES.tripReadiness(model.tripId)}
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
			{hasMoreReadinessItems ? (
				<LinkButton href={VIYA_ROUTES.tripReadiness(model.tripId)}>
					Open full checklist
				</LinkButton>
			) : null}
		</View>
	);
}

export function BudgetTab({ model }: { model: TripDashboardModel }) {
	const visibleBudgetCategories = model.budget.categoryBreakdown.slice(
		0,
		dashboardPreviewLimit
	);

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
					<EmptyCopy
						actionHref={VIYA_ROUTES.tripBudget(model.tripId)}
						actionLabel="Log expense"
					>
						No booked costs or expenses yet.
					</EmptyCopy>
				) : (
					<View className="gap-2">
						{visibleBudgetCategories.map((item) => (
							<DashboardPreviewActionRow
								actionLabel="Review category spend"
								detail="Tracked category"
								href={VIYA_ROUTES.tripBudget(model.tripId)}
								icon="pie-chart-outline"
								key={item.category}
								label={formatStatus(item.category)}
								right={formatMoney(item.amount, model.currency)}
							/>
						))}
						{model.budget.categoryBreakdown.length >
						visibleBudgetCategories.length ? (
							<LinkButton href={VIYA_ROUTES.tripBudget(model.tripId)}>
								Open full budget
							</LinkButton>
						) : null}
					</View>
				)}
			</Section>
		</View>
	);
}

export function TravelTab({ model }: { model: TripDashboardModel }) {
	const relatedEntityLabelByKey = getTripRelatedEntityLabelByKey(
		model.workspace
	);
	const openRisks = model.workspace.risks.filter(
		(risk) => risk.status === "open"
	);
	const visibleTravelRisks = openRisks.slice(0, dashboardPreviewLimit);
	const visibleMissingAlerts = model.missingItems.slice(
		0,
		Math.max(0, dashboardPreviewLimit - visibleTravelRisks.length)
	);
	const visibleActiveDocuments = model.activeDocuments.slice(
		0,
		dashboardPreviewLimit
	);
	const travelAlertCount = openRisks.length + model.missingItems.length;

	return (
		<View className="gap-4">
			<Section icon="navigate-outline" title="Travel Mode">
				<TimelinePreview model={model} />
				<View className="flex-row flex-wrap gap-2">
					<LinkButton href={VIYA_ROUTES.tripTravelMode(model.tripId)}>
						Open travel mode
					</LinkButton>
					<LinkButton href={VIYA_ROUTES.tripItinerary(model.tripId)}>
						Adjust timeline
					</LinkButton>
				</View>
			</Section>
			<Section icon="warning-outline" title="Risk Alerts">
				{travelAlertCount === 0 ? (
					<EmptyCopy
						actionHref={VIYA_ROUTES.tripRisks(model.tripId)}
						actionLabel="Add risk"
						icon="checkmark-circle-outline"
					>
						No active risks.
					</EmptyCopy>
				) : (
					<View className="gap-2">
						{visibleTravelRisks.map((risk) => (
							<TravelAlertRow
								actionLabel="Review risk"
								detail={getRiskDetail(risk, relatedEntityLabelByKey)}
								href={VIYA_ROUTES.tripRisks(model.tripId)}
								icon="warning-outline"
								key={risk._id}
								label={risk.title}
								right={formatStatus(risk.severity)}
							/>
						))}
						{visibleMissingAlerts.map((item) => (
							<TravelAlertRow
								actionLabel="Fix gap"
								detail={item.category}
								href={item.href}
								icon="flag-outline"
								key={`${item.category}-${item.title}`}
								label={item.title}
							/>
						))}
						{travelAlertCount >
						visibleTravelRisks.length + visibleMissingAlerts.length ? (
							<LinkButton href={VIYA_ROUTES.tripRisks(model.tripId)}>
								Open all alerts
							</LinkButton>
						) : null}
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
					<EmptyCopy
						actionHref={VIYA_ROUTES.tripVault(model.tripId)}
						actionLabel="Upload document"
					>
						No important documents uploaded yet.
					</EmptyCopy>
				) : (
					<View className="gap-2">
						{visibleActiveDocuments.map((document) => (
							<InfoRow
								icon="document-outline"
								key={document}
								label={document}
							/>
						))}
						{model.activeDocuments.length > visibleActiveDocuments.length ? (
							<LinkButton href={VIYA_ROUTES.tripVault(model.tripId)}>
								Open all documents
							</LinkButton>
						) : null}
					</View>
				)}
			</Section>
		</View>
	);
}

export function RisksTab({ model }: { model: TripDashboardModel }) {
	const relatedEntityLabelByKey = getTripRelatedEntityLabelByKey(
		model.workspace
	);
	const openRisks = model.workspace.risks.filter(
		(risk) => risk.status === "open"
	);
	const visibleOpenRisks = openRisks.slice(0, dashboardPreviewLimit);
	const resolvedRisks = model.workspace.risks.filter(
		(risk) => risk.status !== "open"
	);
	const visibleResolvedRisks = resolvedRisks.slice(0, dashboardPreviewLimit);

	return (
		<View className="gap-4">
			<Section icon="warning-outline" title="Risks">
				<AppText tone="secondary" variant="subhead">
					Track schedule, booking, budget, document, safety, and transport risks
					before they affect the trip.
				</AppText>
				<LinkButton href={VIYA_ROUTES.tripRisks(model.tripId)}>
					Manage risks
				</LinkButton>
			</Section>
			<Section icon="alert-circle-outline" title="Open Risks">
				{openRisks.length === 0 ? (
					<EmptyCopy
						actionHref={VIYA_ROUTES.tripRisks(model.tripId)}
						actionLabel="Add risk"
						icon="checkmark-circle-outline"
					>
						No open risks right now.
					</EmptyCopy>
				) : (
					<View className="gap-2">
						{visibleOpenRisks.map((risk) => (
							<DashboardPreviewActionRow
								actionLabel="Open risk"
								detail={getRiskDetail(risk, relatedEntityLabelByKey)}
								href={VIYA_ROUTES.tripRisks(model.tripId)}
								icon="warning-outline"
								key={risk._id}
								label={risk.title}
								right={formatStatus(risk.severity)}
							/>
						))}
						{openRisks.length > visibleOpenRisks.length ? (
							<LinkButton href={VIYA_ROUTES.tripRisks(model.tripId)}>
								Open all risks
							</LinkButton>
						) : null}
					</View>
				)}
			</Section>
			{resolvedRisks.length > 0 ? (
				<Section icon="checkmark-done-outline" title="Resolved">
					<View className="gap-2">
						{visibleResolvedRisks.map((risk) => (
							<DashboardPreviewActionRow
								actionLabel="Review resolved risk"
								detail={getRiskDetail(risk, relatedEntityLabelByKey)}
								href={VIYA_ROUTES.tripRisks(model.tripId)}
								icon="checkmark-circle-outline"
								key={risk._id}
								label={risk.title}
								right={formatStatus(risk.status)}
							/>
						))}
						{resolvedRisks.length > visibleResolvedRisks.length ? (
							<LinkButton href={VIYA_ROUTES.tripRisks(model.tripId)}>
								Review resolved risks
							</LinkButton>
						) : null}
					</View>
				</Section>
			) : null}
		</View>
	);
}

export function CompanionsTab({ model }: { model: TripDashboardModel }) {
	const visibleCompanions = model.workspace.companions.slice(
		0,
		dashboardPreviewLimit
	);

	return (
		<View className="gap-4">
			<Section icon="people-outline" title="Companions">
				<AppText tone="secondary" variant="subhead">
					Keep travelers, organizers, emergency contacts, and role notes close
					to the plan.
				</AppText>
				<LinkButton href={VIYA_ROUTES.tripCompanions(model.tripId)}>
					Manage companions
				</LinkButton>
			</Section>
			{model.workspace.companions.length === 0 ? (
				<EmptyCopy
					actionHref={VIYA_ROUTES.tripCompanions(model.tripId)}
					actionLabel="Add companion"
					icon="people-outline"
				>
					No companions added yet.
				</EmptyCopy>
			) : (
				<Section icon="person-circle-outline" title="Travel Party">
					<View className="gap-2">
						{visibleCompanions.map((companion) => (
							<DashboardPreviewActionRow
								actionLabel="Open companion"
								detail={getCompanionDetail(companion)}
								href={VIYA_ROUTES.tripCompanions(model.tripId)}
								icon="person-outline"
								key={companion._id}
								label={companion.name}
								right={formatStatus(companion.role)}
							/>
						))}
						{model.workspace.companions.length > visibleCompanions.length ? (
							<LinkButton href={VIYA_ROUTES.tripCompanions(model.tripId)}>
								Open all companions
							</LinkButton>
						) : null}
					</View>
				</Section>
			)}
		</View>
	);
}

export function NotesTab({ model }: { model: TripDashboardModel }) {
	const visibleNotes = model.workspace.notes.slice(0, dashboardPreviewLimit);
	const relatedEntityLabelByKey = getTripRelatedEntityLabelByKey(
		model.workspace
	);

	return (
		<View className="gap-4">
			<Section icon="document-text-outline" title="Notes">
				<AppText tone="secondary" variant="subhead">
					Save decisions, reminders, constraints, and shared planning context
					for the whole trip.
				</AppText>
				<LinkButton href={VIYA_ROUTES.tripNotes(model.tripId)}>
					Manage notes
				</LinkButton>
			</Section>
			{model.workspace.notes.length === 0 ? (
				<EmptyCopy
					actionHref={VIYA_ROUTES.tripNotes(model.tripId)}
					actionLabel="Add note"
					icon="document-text-outline"
				>
					No notes saved yet.
				</EmptyCopy>
			) : (
				<View className="gap-2">
					{visibleNotes.map((note) => {
						const relatedLabel = getNoteRelatedLabel(
							note,
							relatedEntityLabelByKey
						);

						return (
							<DashboardPreviewActionRow
								actionLabel="Open note"
								detail={[relatedLabel, getNotePreview(note)]
									.filter(Boolean)
									.join(" - ")}
								href={VIYA_ROUTES.tripNotes(model.tripId)}
								icon="reader-outline"
								key={note._id}
								label={note.title}
								right={formatStatus(note.category)}
							/>
						);
					})}
					{model.workspace.notes.length > visibleNotes.length ? (
						<LinkButton href={VIYA_ROUTES.tripNotes(model.tripId)}>
							Open all notes
						</LinkButton>
					) : null}
				</View>
			)}
		</View>
	);
}

export function MemoriesTab({ model }: { model: TripDashboardModel }) {
	const visibleMoments = model.workspace.moments.slice(
		0,
		dashboardPreviewLimit
	);

	return (
		<View className="gap-4">
			<Section icon="images-outline" title="Memories">
				<AppText tone="secondary" variant="subhead">
					Capture moments during the trip. They become the recap source.
				</AppText>
				<LinkButton href={VIYA_ROUTES.tripMoments(model.tripId)}>
					Add memory
				</LinkButton>
			</Section>
			{model.workspace.moments.length === 0 ? (
				<EmptyCopy
					actionHref={VIYA_ROUTES.tripMoments(model.tripId)}
					actionLabel="Add memory"
					icon="images-outline"
				>
					No memories yet.
				</EmptyCopy>
			) : (
				<View className="gap-2">
					{visibleMoments.map((moment) => (
						<DashboardPreviewActionRow
							actionLabel="Open memory"
							detail={[
								moment.locationName || "Location TBD",
								updateDateFormatter.format(new Date(moment.createdAt)),
								getMomentPreview(moment),
							].join(" - ")}
							href={VIYA_ROUTES.tripMoments(model.tripId)}
							icon="image-outline"
							key={moment._id}
							label={moment.title}
							right={moment.isHighlight ? "Highlight" : undefined}
						/>
					))}
					{model.workspace.moments.length > visibleMoments.length ? (
						<LinkButton href={VIYA_ROUTES.tripMoments(model.tripId)}>
							Open all memories
						</LinkButton>
					) : null}
				</View>
			)}
		</View>
	);
}

export function RecapTab({ model }: { model: TripDashboardModel }) {
	const visibleHighlights = model.highlights.slice(0, dashboardPreviewLimit);

	return (
		<View className="gap-4">
			<Section icon="share-social-outline" title="Recap">
				<AppText tone="secondary" variant="subhead">
					{getTripSummaryPreview(model.workspace.trip)}
				</AppText>
				<View className="flex-row flex-wrap gap-2">
					<LinkButton href={VIYA_ROUTES.tripMoments(model.tripId)}>
						Edit moments
					</LinkButton>
					<LinkButton href={VIYA_ROUTES.tripWrapped(model.tripId)}>
						Open recap
					</LinkButton>
				</View>
			</Section>
			<Section icon="star-outline" title="Highlights">
				{model.highlights.length === 0 ? (
					<EmptyCopy
						actionHref={VIYA_ROUTES.tripMoments(model.tripId)}
						actionLabel="Add highlight"
					>
						Highlights will come from saved memories.
					</EmptyCopy>
				) : (
					<View className="gap-2">
						{visibleHighlights.map((highlight) => (
							<DashboardPreviewActionRow
								actionLabel="Open highlight"
								detail="Included in the trip recap"
								href={VIYA_ROUTES.tripWrapped(model.tripId)}
								icon="star-outline"
								key={highlight}
								label={highlight}
							/>
						))}
						{model.highlights.length > visibleHighlights.length ? (
							<LinkButton href={VIYA_ROUTES.tripWrapped(model.tripId)}>
								Open full recap
							</LinkButton>
						) : null}
					</View>
				)}
			</Section>
			<Section icon="cash-outline" title="Spend Summary">
				<DashboardPreviewActionRow
					actionLabel="Review recap spend"
					detail="Tracked spend"
					href={VIYA_ROUTES.tripBudget(model.tripId)}
					icon="cash-outline"
					label={formatMoney(model.budget.totalTrackedSpend, model.currency)}
					right={model.budget.status}
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

	if (activeTab === "places") {
		return <PlacesTab model={model} />;
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

	if (activeTab === "risks") {
		return <RisksTab model={model} />;
	}

	if (activeTab === "companions") {
		return <CompanionsTab model={model} />;
	}

	if (activeTab === "notes") {
		return <NotesTab model={model} />;
	}

	if (activeTab === "travel") {
		return <TravelTab model={model} />;
	}

	if (activeTab === "memories") {
		return <MemoriesTab model={model} />;
	}

	return <RecapTab model={model} />;
}
