import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const notesScreenSource = readFileSync(
	"apps/native/src/features/trips/trip-notes-screen.tsx",
	"utf8"
);
const risksScreenSource = readFileSync(
	"apps/native/app/(app)/trips/[tripId]/risks.tsx",
	"utf8"
);
const limitedOptionsLabelMapPattern =
	/relatedEntityLabelByKey\s*=\s*new Map\(\s*relatedEntityOptions\.map/;

describe("trip linked entity labels", () => {
	it("uses the full workspace label map instead of limited picker options", () => {
		for (const source of [notesScreenSource, risksScreenSource]) {
			expect(source).toContain("getTripRelatedEntityLabelByKey");
			expect(source).not.toMatch(limitedOptionsLabelMapPattern);
		}
	});
});
