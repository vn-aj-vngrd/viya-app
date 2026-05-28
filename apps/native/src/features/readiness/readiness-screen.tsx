import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	calculateReadinessScore,
	getMissingRequiredReadinessCategories,
	type Priority,
	type ReadinessCategory,
	type ReadinessItem,
	type WorkStatus,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { Link } from "expo-router";
import { Button, Chip, Spinner, Surface, Text } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

import { ReadinessCategoryCard } from "./readiness-category-card";
import { ReadinessItemRow } from "./readiness-item-row";

const priorityRank: Record<Priority, number> = {
	critical: 4,
	high: 3,
	medium: 2,
	low: 1,
};

const toDomainReadinessItem = (item: Doc<"readinessItems">): ReadinessItem => ({
	aiReason: item.aiReason,
	assignedToMemberId: item.assignedToMemberId ?? null,
	category: item.category as ReadinessCategory,
	description: item.description,
	dueDate: item.dueDate,
	id: item._id,
	priority: item.priority as Priority,
	source: item.source as ReadinessItem["source"],
	status: item.status as WorkStatus,
	title: item.title,
	tripId: item.tripId,
});

const getHighestPriority = (items: ReadinessItem[]) =>
	items.reduce<Priority | null>((highest, item) => {
		if (item.status === "done" || item.status === "ignored") {
			return highest;
		}

		if (!highest || priorityRank[item.priority] > priorityRank[highest]) {
			return item.priority;
		}

		return highest;
	}, null);

export function ReadinessScreen() {
	const tripId = useTripIdParam();
	const readinessItems = useQuery(
		api.readiness.listReadinessItems,
		tripId ? { tripId } : "skip"
	);
	const ensureBaselineReadinessItems = useMutation(
		api.readiness.ensureBaselineReadinessItems
	);
	const updateReadinessItem = useMutation(api.readiness.updateReadinessItem);
	const [baselineRequestedTripId, setBaselineRequestedTripId] =
		useState<Id<"trips"> | null>(null);

	useEffect(() => {
		if (!(tripId && readinessItems)) {
			return;
		}

		const missingCategories = getMissingRequiredReadinessCategories(
			readinessItems.map(toDomainReadinessItem)
		);

		if (missingCategories.length > 0 && baselineRequestedTripId !== tripId) {
			setBaselineRequestedTripId(tripId);
			ensureBaselineReadinessItems({ tripId }).catch(() => undefined);
		}
	}, [
		baselineRequestedTripId,
		ensureBaselineReadinessItems,
		readinessItems,
		tripId,
	]);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before checking readiness."
					icon="shield-checkmark-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (readinessItems === undefined) {
		return (
			<Container className="px-4 pb-28">
				<View className="items-center py-12">
					<Spinner />
				</View>
			</Container>
		);
	}

	const domainItems = readinessItems.map(toDomainReadinessItem);
	const score = calculateReadinessScore(domainItems);
	const categories = Object.entries(score.categoryScores) as [
		ReadinessCategory,
		number,
	][];
	const openItems = domainItems
		.filter((item) => item.status !== "done" && item.status !== "ignored")
		.sort(
			(left, right) =>
				priorityRank[right.priority] - priorityRank[left.priority]
		);

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Check"
					icon="shield-checkmark-outline"
					subtitle="Resolve booking, document, budget, packing, schedule, safety, and backup gaps before travel."
					title="Readiness"
				/>

				<Surface className="gap-4 rounded-[34px] border border-border bg-surface p-5">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>Check</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>{openItems.length} open</Chip.Label>
						</Chip>
					</View>
					<View className="flex-row items-end justify-between gap-4">
						<View className="flex-1 gap-1">
							<Text.Heading type="h3" weight="semibold">
								Readiness
							</Text.Heading>
							<Text.Paragraph color="muted" type="body-sm">
								{score.summary}
							</Text.Paragraph>
						</View>
						<Text.Heading className="text-5xl" type="h1" weight="semibold">
							{score.overallScore}
						</Text.Heading>
					</View>
					{score.overallScore >= 90 ? (
						<Link asChild href={VIYA_ROUTES.tripTravelMode(tripId)}>
							<Button>
								<Button.Label>Open travel mode</Button.Label>
							</Button>
						</Link>
					) : (
						<Button variant="secondary">
							<Button.Label>Fix highest-priority gap</Button.Label>
						</Button>
					)}
				</Surface>

				<View className="flex-row flex-wrap gap-3">
					{categories.map(([category, categoryScore]) => {
						const categoryItems = domainItems.filter(
							(item) => item.category === category
						);
						const categoryOpenItems = categoryItems.filter(
							(item) => item.status !== "done" && item.status !== "ignored"
						);

						return (
							<ReadinessCategoryCard
								category={category}
								highestPriority={getHighestPriority(categoryItems)}
								key={category}
								openCount={categoryOpenItems.length}
								score={categoryScore}
							/>
						);
					})}
				</View>

				<View className="gap-3">
					<Text.Heading type="h5" weight="semibold">
						Checklist
					</Text.Heading>
					{readinessItems.map((item) => (
						<ReadinessItemRow
							item={item}
							key={item._id}
							onStatusChange={(readinessItemId, status) => {
								updateReadinessItem({ readinessItemId, status }).catch(
									() => undefined
								);
							}}
						/>
					))}
				</View>
			</View>
		</Container>
	);
}
