import { Ionicons } from "@expo/vector-icons";
import {
	checkForUpdateAsync,
	fetchUpdateAsync,
	reloadAsync,
} from "expo-updates";
import { Button, Spinner, Surface, Text } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UpdateStatus = "downloading" | "ready" | "idle";

const updateAccentColor = "#0A84FF";
const isDevelopment = process.env.NODE_ENV === "development";

const getStatusCopy = (status: UpdateStatus) => {
	switch (status) {
		case "downloading":
			return {
				description: "Downloading in the background.",
				title: "Updating Viya",
			};
		case "ready":
			return {
				description: "Restart to apply the latest version.",
				title: "Update ready",
			};
		default:
			return null;
	}
};

export function OTAUpdateBanner() {
	const [status, setStatus] = useState<UpdateStatus>("idle");
	const insets = useSafeAreaInsets();
	const isChecking = useRef(false);

	useEffect(() => {
		if (isDevelopment || isChecking.current) {
			return;
		}

		isChecking.current = true;
		let isMounted = true;

		const checkForUpdate = async () => {
			try {
				const update = await checkForUpdateAsync();

				if (!(isMounted && update.isAvailable)) {
					return;
				}

				setStatus("downloading");
				await fetchUpdateAsync();

				if (isMounted) {
					setStatus("ready");
				}
			} catch {
				// expo-updates can throw when unavailable; launch should continue.
			}
		};

		checkForUpdate().catch(() => {
			// Launch should continue if update checks are unavailable.
		});

		return () => {
			isMounted = false;
		};
	}, []);

	async function handleRestart() {
		await reloadAsync();
	}

	const statusCopy = getStatusCopy(status);

	if (!statusCopy) {
		return null;
	}

	const isBusy = status === "downloading";

	return (
		<View
			className="absolute inset-x-0 z-50 px-4"
			pointerEvents="box-none"
			style={{ top: Math.max(insets.top, 12) + 8 }}
		>
			<Surface
				className="flex-row items-center gap-3 rounded-[24px] border border-border bg-surface p-3"
				style={{
					shadowColor: "#18181B",
					shadowOffset: { height: 8, width: 0 },
					shadowOpacity: 0.08,
					shadowRadius: 18,
				}}
			>
				<View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
					<Ionicons
						color={updateAccentColor}
						name={status === "ready" ? "cloud-done" : "cloud-download"}
						size={20}
					/>
				</View>

				<View className="min-w-0 flex-1 gap-0.5">
					<Text numberOfLines={1} type="body-sm" weight="semibold">
						{statusCopy.title}
					</Text>
					<Text color="muted" numberOfLines={1} type="body-xs">
						{statusCopy.description}
					</Text>
				</View>

				{isBusy ? <Spinner size="sm" /> : null}
				{status === "ready" ? (
					<Button onPress={handleRestart} size="sm">
						<Button.Label>Restart</Button.Label>
					</Button>
				) : null}
			</Surface>
		</View>
	);
}
