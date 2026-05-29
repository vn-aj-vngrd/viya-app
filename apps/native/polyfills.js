import structuredClone from "@ungap/structured-clone";
import { Platform } from "react-native";

if (Platform.OS !== "web") {
	const setupPolyfills = async () => {
		const { polyfillGlobal } = await import(
			"react-native/Libraries/Utilities/PolyfillFunctions"
		);

		const { TextEncoderStream, TextDecoderStream } = await import(
			"@stardazed/streams-text-encoding"
		);

		if (!("structuredClone" in global)) {
			polyfillGlobal("structuredClone", () => structuredClone);
		}

		polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
		polyfillGlobal("TextDecoderStream", () => TextDecoderStream);
	};

	setupPolyfills();
}

if (Platform.OS === "web") {
	const originalConsoleError = console.error;

	console.error = (...args) => {
		const [firstArg] = args;
		if (
			typeof firstArg === "string" &&
			firstArg.includes("BackHandler is not supported on web")
		) {
			return;
		}

		originalConsoleError(...args);
	};
}
