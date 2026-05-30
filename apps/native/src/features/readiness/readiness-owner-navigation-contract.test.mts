import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("readiness owner navigation contract", () => {
	it("keeps assigned readiness tasks connected to the companions module", () => {
		const screenSource = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-screen.tsx"
		);
		const rowSource = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-item-row.tsx"
		);

		expect(screenSource).toContain("VIYA_ROUTES.tripCompanions");
		expect(screenSource).toContain("ownerHref");
		expect(rowSource).toContain("Open owner");
		expect(rowSource).toContain("Link asChild");
	});
});
