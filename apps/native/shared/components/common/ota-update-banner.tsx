import { Ionicons } from "@expo/vector-icons";
import {
	checkForUpdateAsync,
	fetchUpdateAsync,
	reloadAsync,
} from "expo-updates";
import { Button, Spinner, Surface, Text } from "heroui-native";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

type UpdateStatus = "checking" | "downloading" | "ready" | "error" | "idle";

export function OTAUpdateBanner() {
	const [status, setStatus] = useState<UpdateStatus>("idle");

	const checkForUpdate = useCallback(async () => {
		try {
			setStatus("checking");
			const update = await checkForUpdateAsync();

			if (update.isAvailable) {
				setStatus("downloading");
				await fetchUpdateAsync();
				setStatus("ready");
			} else {
				setStatus("idle");
			}
		} catch {
			setStatus("error");
		}
	}, []);

	useEffect(() => {
		checkForUpdate();
	}, [checkForUpdate]);

	async function handleRestart() {
		await reloadAsync();
	}

	if (status === "idle" || status === "error") {
		return null;
	}

	return (
		<View className="absolute inset-0 z-50 items-center justify-center bg-background/95">
			<Surface
				className="mx-8 w-full max-w-sm items-center rounded-2xl p-6"
				variant="secondary"
			>
				<View className="h-14 w-14 items-center justify-center rounded-full bg-[#0A84FF]/10">
					<Ionicons color="#0A84FF" name="cloud-download" size={28} />
				</View>

				<Text.Heading
					align="center"
					className="mt-4"
					type="h5"
					weight="semibold"
				>
					Update Available
				</Text.Heading>

				<Text.Paragraph
					align="center"
					className="mt-2 leading-5"
					color="muted"
					type="body-sm"
				>
					{status === "checking" && "Checking for updates..."}
					{status === "downloading" && "Downloading update..."}
					{status === "ready" &&
						"A new version of Viya is ready. Restart to apply the update."}
				</Text.Paragraph>

				{status === "checking" || status === "downloading" ? (
					<View className="mt-6">
						<Spinner />
					</View>
				) : null}

				{status === "ready" ? (
					<Button
						className="mt-6 w-full"
						onPress={handleRestart}
						size="md"
						variant="primary"
					>
						<Button.Label>Restart Now</Button.Label>
					</Button>
				) : null}
			</Surface>
		</View>
	);
}
