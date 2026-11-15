import type { Href } from "expo-router";

type ContentTab = "(discover)" | "(trips)" | "(vault)" | "(profile)";

let lastContentTab: ContentTab = "(discover)";

export const rememberContentTab = (name: string) => {
	if (name !== "viya") {
		lastContentTab = name as ContentTab;
	}
};

export const getLastContentTab = () => lastContentTab;

export const contentTabHref: Record<ContentTab, Href> = {
	"(discover)": "/" as Href,
	"(profile)": "/profile" as Href,
	"(trips)": "/trips" as Href,
	"(vault)": "/vault" as Href,
};
