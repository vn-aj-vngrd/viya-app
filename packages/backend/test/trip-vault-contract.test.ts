import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const linkedEntityPatchHelperPattern =
	/getLinkedTripEntityLinkUpdatePatch\(\{\s*linkedEntityId,\s*linkedEntityType,\s*\}\)/;
const linkedEntityCreateHelperPattern =
	/getLinkedTripEntityLinkFields\(\{\s*linkedEntityId: args\.linkedEntityId,\s*linkedEntityType: args\.linkedEntityType,\s*\}\)/;
const linkedEntityClearPatchPattern =
	/interface LinkedEntityClearPatch \{\s*linkedEntityId: undefined;\s*linkedEntityType: undefined;\s*\}/;
const vaultLinkedMutationFieldsPattern = /getLinkedEntityMutationFields\(\{/;
const reverseLinkSyncFunctionPattern =
	/syncVaultLinkedEntityReferences = async/;
const updateReverseLinkSyncPattern =
	/updateVaultItem[\s\S]*await syncVaultLinkedEntityReferences\(\s*ctx,\s*item,\s*\{\s*linkedEntityId,\s*linkedEntityType,\s*vaultItemId,\s*\}/;
const linkReverseLinkSyncPattern =
	/linkVaultItem[\s\S]*await syncVaultLinkedEntityReferences\(\s*ctx,\s*item,\s*\{\s*linkedEntityId: args\.linkedEntityId,\s*linkedEntityType: args\.linkedEntityType,\s*vaultItemId: args\.vaultItemId,\s*\}/;
const sortedVaultItemsPattern =
	/sortedItems\s*=\s*\[\.\.\.items\]\.sort\([\s\S]*secondItem\.createdAt\s*-\s*firstItem\.createdAt/;
const returnedSortedVaultItemsPattern = /sortedItems\.map/;
const receiptExpenseValidatorPattern =
	/const receiptExpenseValidator = v\.object/;
const extractionExpensePattern =
	/expense: v\.optional\(receiptExpenseValidator\)/;
const insertExpensePattern = /ctx\.db\.insert\("expenses"/;
const linkedExpensePattern = /linkedEntityType: "expense"/;
const bookingCostPatchPattern = /cost: booking\.cost \?\? undefined/;
const bookingCurrencyPatchPattern = /currency: toOptional\(booking\.currency\)/;
const bookingItineraryLinkHelperPattern =
	/linkMatchingItineraryItemsToBooking = async/;
const bookingItineraryScorePattern =
	/getBookingItineraryMatchScore\(\{\s*booking,/;
const bookingItineraryLinkPatchPattern =
	/ctx\.db\.patch\(item\._id, \{ bookingId \}\)/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip vault contract", () => {
	it("updates Vault item links using linked entity fields", () => {
		const vaultSource = readWorkspaceFile("packages/backend/convex/vault.ts");
		const tripLinksSource = readWorkspaceFile(
			"packages/backend/convex/lib/tripLinks.ts"
		);
		const vaultScreenSource = readWorkspaceFile(
			"apps/native/src/features/vault/trip-vault-screen.tsx"
		);

		assert.match(
			tripLinksSource,
			linkedEntityClearPatchPattern,
			"trip link helpers should support clearing linkedEntity fields"
		);
		assert.match(
			vaultSource,
			linkedEntityPatchHelperPattern,
			"updateVaultItem should patch linkedEntityId and linkedEntityType, not relatedEntity fields"
		);
		assert.match(
			vaultSource,
			linkedEntityCreateHelperPattern,
			"saveVaultItem should create linkedEntityId and linkedEntityType fields"
		);
		assert.match(
			vaultScreenSource,
			vaultLinkedMutationFieldsPattern,
			"the Vault edit sheet should send linkedEntity fields to updateVaultItem"
		);
	});

	it("keeps target records aligned when Vault links change", () => {
		const vaultSource = readWorkspaceFile("packages/backend/convex/vault.ts");

		assert.match(
			vaultSource,
			reverseLinkSyncFunctionPattern,
			"Vault link mutations should share reverse-link synchronization"
		);
		assert.match(
			vaultSource,
			updateReverseLinkSyncPattern,
			"updateVaultItem should sync booking, document, and expense vaultItemId fields"
		);
		assert.match(
			vaultSource,
			linkReverseLinkSyncPattern,
			"linkVaultItem should sync booking, document, and expense vaultItemId fields"
		);
	});

	it("lists Vault files newest first for latest-file surfaces", () => {
		const vaultSource = readWorkspaceFile("packages/backend/convex/vault.ts");

		assert.match(
			vaultSource,
			sortedVaultItemsPattern,
			"listTripVaultItems should sort files by newest upload before returning them"
		);
		assert.match(
			vaultSource,
			returnedSortedVaultItemsPattern,
			"listTripVaultItems should hydrate URLs from the sorted file list"
		);
	});

	it("can turn extracted receipt expenses into linked budget records", () => {
		const vaultSource = readWorkspaceFile("packages/backend/convex/vault.ts");

		assert.match(
			vaultSource,
			receiptExpenseValidatorPattern,
			"TripSync review should validate receipt expense details"
		);
		assert.match(
			vaultSource,
			extractionExpensePattern,
			"TripSync review should accept optional extracted expense details"
		);
		assert.match(
			vaultSource,
			insertExpensePattern,
			"TripSync review should create a budget expense from extracted receipt details"
		);
		assert.match(
			vaultSource,
			linkedExpensePattern,
			"TripSync review should link the Vault item to the created expense"
		);
	});

	it("syncs extracted booking amounts into booking records", () => {
		const vaultSource = readWorkspaceFile("packages/backend/convex/vault.ts");

		assert.match(
			vaultSource,
			bookingCostPatchPattern,
			"TripSync review should preserve detected booking costs"
		);
		assert.match(
			vaultSource,
			bookingCurrencyPatchPattern,
			"TripSync review should preserve detected booking currencies"
		);
	});

	it("links extracted bookings to matching itinerary items", () => {
		const vaultSource = readWorkspaceFile("packages/backend/convex/vault.ts");

		assert.match(
			vaultSource,
			bookingItineraryLinkHelperPattern,
			"TripSync review should link matched itinerary items to extracted bookings"
		);
		assert.match(
			vaultSource,
			bookingItineraryScorePattern,
			"TripSync review should score booking-to-itinerary matches"
		);
		assert.match(
			vaultSource,
			bookingItineraryLinkPatchPattern,
			"TripSync review should write bookingId onto matched itinerary items"
		);
	});
});
