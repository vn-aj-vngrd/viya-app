import { useBottomSheetAwareHandlers } from "heroui-native";
import { Platform } from "react-native";

type BottomSheetAwareHandlers = ReturnType<typeof useBottomSheetAwareHandlers>;

const noopInputHandler: BottomSheetAwareHandlers["onBlur"] = () => undefined;
const webInputHandlers: BottomSheetAwareHandlers = {
	onBlur: noopInputHandler,
	onFocus: noopInputHandler,
};

export function useCompatibleBottomSheetAwareHandlers(): BottomSheetAwareHandlers {
	const bottomSheetHandlers = useBottomSheetAwareHandlers();

	if (Platform.OS === "web") {
		return webInputHandlers;
	}

	return bottomSheetHandlers;
}
