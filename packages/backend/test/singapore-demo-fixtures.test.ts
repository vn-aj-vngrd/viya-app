import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	getSingaporeDemoVaultExtraction,
	isSingaporeDemoFixtureFile,
} from "../src/ai/singapore-demo-fixtures";

const marinaBaySandsPattern = /Marina Bay Sands/;
const singaporeDollarReceiptPattern = /SGD 82/;
const sgArrivalCardPattern = /SG Arrival Card/;

describe("Singapore demo fixture extraction", () => {
	it("recognizes all local Singapore demo fixture files", () => {
		const fixtureFiles = [
			"singapore-flight-confirmation.txt",
			"singapore-hotel-voucher.txt",
			"singapore-tech-week-pass.txt",
			"singapore-expense-receipt.txt",
			"singapore-readiness-note.txt",
		];

		for (const fileName of fixtureFiles) {
			assert.equal(isSingaporeDemoFixtureFile(fileName), true, fileName);
		}
	});

	it("returns deterministic flight, hotel, event, receipt, and readiness extractions", () => {
		const flight = getSingaporeDemoVaultExtraction(
			"singapore-flight-confirmation.txt"
		);
		const hotel = getSingaporeDemoVaultExtraction(
			"singapore-hotel-voucher.txt"
		);
		const eventPass = getSingaporeDemoVaultExtraction(
			"singapore-tech-week-pass.txt"
		);
		const receipt = getSingaporeDemoVaultExtraction(
			"singapore-expense-receipt.txt"
		);
		const note = getSingaporeDemoVaultExtraction(
			"singapore-readiness-note.txt"
		);

		assert.equal(flight?.booking?.confirmationCode, "VIYA-SIN-2026");
		assert.equal(flight?.booking?.type, "flight");
		assert.equal(flight?.booking?.cost, 21_800);
		assert.equal(flight?.booking?.currency, "PHP");
		assert.equal(hotel?.booking?.confirmationCode, "HOTEL-SIN-WIN");
		assert.equal(hotel?.booking?.type, "hotel");
		assert.equal(hotel?.booking?.cost, 32_400);
		assert.equal(hotel?.booking?.currency, "PHP");
		assert.equal(eventPass?.documentType, "permit");
		assert.match(eventPass?.summary ?? "", marinaBaySandsPattern);
		assert.equal(receipt?.documentType, "receipt");
		assert.match(receipt?.summary ?? "", singaporeDollarReceiptPattern);
		assert.equal(note?.booking, null);
		assert.match(note?.summary ?? "", sgArrivalCardPattern);
	});
});
