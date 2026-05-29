import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { type Href, Link } from "expo-router";
import { Button, Spinner, Surface, Text } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { VIYA_ROUTES } from "@/src/constants/routes";

export type ViyaTripAgentModule =
	| "itinerary"
	| "places"
	| "bookings"
	| "documents"
	| "budget"
	| "readiness"
	| "risks"
	| "travel"
	| "recap";

type ViyaTripAgentAction = "audit" | "explain" | "generate" | "refine";

const shouldUseFallbackDraft = process.env.NODE_ENV !== "production";

interface TripModuleViyaAssistCardProps {
	action?: ViyaTripAgentAction;
	agentModule?: ViyaTripAgentModule;
	description: string;
	moduleLabel: string;
	prompt?: string;
	tripId: Id<"trips">;
}

export function TripModuleViyaAssistCard({
	action = "generate",
	agentModule,
	description,
	moduleLabel,
	prompt,
	tripId,
}: TripModuleViyaAssistCardProps) {
	const generateDraft = useAction(api.ai.tripAgent.generateTripAgentDraft);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isDraftReady, setIsDraftReady] = useState(false);
	const askPrompt =
		prompt ?? `Help me with the ${moduleLabel} module for this trip.`;
	const viyaHref = {
		params: {
			mode: "trip",
			prompt: askPrompt,
			tripId,
		},
		pathname: VIYA_ROUTES.viya,
	} as Href;

	const handleGenerateDraft = async () => {
		if (!agentModule || isGenerating) {
			return;
		}

		setErrorMessage(null);
		setIsDraftReady(false);
		setIsGenerating(true);
		try {
			await generateDraft({
				action,
				module: agentModule,
				prompt,
				tripId,
				useFallback: shouldUseFallbackDraft,
			});
			setIsDraftReady(true);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Viya could not generate a draft right now."
			);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<Surface className="gap-4 rounded-[28px] border border-border bg-surface p-4">
			<View className="flex-row items-start gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="sparkles-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						VIYA AI
					</Text>
					<Text type="body" weight="bold">
						Help with {moduleLabel}
					</Text>
					<Text color="muted" type="body-sm">
						{description}
					</Text>
				</View>
			</View>

			<View className="flex-row flex-wrap gap-2">
				<Link asChild href={viyaHref}>
					<Button size="sm" variant="primary">
						<Ionicons color="#FFFFFF" name="chatbubble-outline" size={16} />
						<Button.Label>Ask Viya</Button.Label>
					</Button>
				</Link>
				{agentModule ? (
					<Button
						isDisabled={isGenerating}
						onPress={handleGenerateDraft}
						size="sm"
						variant="secondary"
					>
						{isGenerating ? <Spinner size="sm" /> : null}
						<Button.Label>
							{isGenerating ? "Generating..." : "Generate draft"}
						</Button.Label>
					</Button>
				) : null}
				{isDraftReady ? (
					<Link asChild href={VIYA_ROUTES.tripDashboard(tripId)}>
						<Button size="sm" variant="secondary">
							<Button.Label>Review draft</Button.Label>
						</Button>
					</Link>
				) : null}
			</View>

			{errorMessage ? (
				<Text className="text-danger" type="body-sm">
					{errorMessage}
				</Text>
			) : null}
		</Surface>
	);
}
