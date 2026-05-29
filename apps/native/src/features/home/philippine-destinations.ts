import type { PreferenceCountrySuggestion } from "@viya-app/domain";

const buildPrompt = (name: string, duration: string) =>
	`Plan a ${duration} trip to ${name}, Philippines that fits my saved travel preferences. Include a day-by-day outline, getting-around tips, and budget guidance in PHP.`;

/**
 * Curated local Philippine destinations for the home "Closer to home" carousel.
 * `country` doubles as the Wikipedia lookup title for the photo (see
 * useDestinationImages), so names must match a resolvable Wikipedia page.
 */
export const philippineDestinations: PreferenceCountrySuggestion[] = [
	{
		accent: "#0A84FF",
		country: "Palawan",
		detail: "Lagoons, limestone cliffs, island hopping",
		duration: "4-6 days",
		icon: "boat-outline",
		prompt: buildPrompt("Palawan", "4-6 day"),
	},
	{
		accent: "#0F766E",
		country: "Siargao",
		detail: "Surf breaks, palm roads, quiet lagoons",
		duration: "3-5 days",
		icon: "sunny-outline",
		prompt: buildPrompt("Siargao", "3-5 day"),
	},
	{
		accent: "#059669",
		country: "Bohol",
		detail: "Chocolate Hills, tarsiers, white sand",
		duration: "3-4 days",
		icon: "leaf-outline",
		prompt: buildPrompt("Bohol", "3-4 day"),
	},
	{
		accent: "#E97816",
		country: "Cebu",
		detail: "City energy, waterfalls, whale sharks",
		duration: "4-6 days",
		icon: "business-outline",
		prompt: buildPrompt("Cebu", "4-6 day"),
	},
	{
		accent: "#DB2777",
		country: "Boracay",
		detail: "Powder sand, sunsets, easy nightlife",
		duration: "3-4 days",
		icon: "umbrella-outline",
		prompt: buildPrompt("Boracay", "3-4 day"),
	},
	{
		accent: "#7C3AED",
		country: "Batanes",
		detail: "Rolling hills, stone houses, sea cliffs",
		duration: "3-4 days",
		icon: "navigate-outline",
		prompt: buildPrompt("Batanes", "3-4 day"),
	},
	{
		accent: "#16A34A",
		country: "Baguio",
		detail: "Cool air, pine ridges, market finds",
		duration: "2-3 days",
		icon: "pint-outline",
		prompt: buildPrompt("Baguio", "2-3 day"),
	},
	{
		accent: "#C2410C",
		country: "Vigan",
		detail: "Heritage streets, food, slow mornings",
		duration: "2-3 days",
		icon: "map-outline",
		prompt: buildPrompt("Vigan", "2-3 day"),
	},
];
