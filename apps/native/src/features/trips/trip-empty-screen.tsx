import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { VIYA_ROUTES } from "@/src/constants/routes";

interface TripEmptyScreenProps {
	icon: React.ComponentProps<typeof Ionicons>["name"];
	subtitle: string;
	title: string;
}

export function TripEmptyScreen({
	icon,
	subtitle,
	title,
}: TripEmptyScreenProps) {
	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4">
				<View>
					<Text.Heading type="h2" weight="semibold">
						{title}
					</Text.Heading>
					<Text.Paragraph className="mt-1" color="muted" type="body-sm">
						{subtitle}
					</Text.Paragraph>
				</View>
				<Surface className="items-center gap-4 rounded-[30px] border border-border bg-surface p-6">
					<View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft">
						<Ionicons color="#0A84FF" name={icon} size={30} />
					</View>
					<View className="items-center gap-2">
						<Text.Heading align="center" type="h3" weight="semibold">
							Start a trip first
						</Text.Heading>
						<Text.Paragraph
							align="center"
							className="max-w-xs leading-5"
							color="muted"
							type="body-sm"
						>
							This space fills in after Viya creates your first blueprint and
							you sync bookings or travel details.
						</Text.Paragraph>
					</View>
					<Link asChild href={VIYA_ROUTES.viya}>
						<Button>
							<Button.Label>Plan with Viya</Button.Label>
						</Button>
					</Link>
				</Surface>
			</View>
		</Container>
	);
}
