import type { VaultExtraction } from "@viya-app/domain";

export const fallbackVaultExtraction: VaultExtraction = {
	booking: null,
	confidence: 0.4,
	documentType: "other",
	extractedTitle: "Uploaded travel file",
	readinessSuggestions: [
		{
			category: "documents",
			priority: "medium",
			reason:
				"A new Vault file was added and should be reviewed before departure.",
			title: "Review uploaded travel file",
		},
	],
	summary:
		"Viya saved this file to the trip Vault. Review it to confirm whether it is a booking, ID, voucher, or note.",
};
