import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("viya chat composer spacing contract", () => {
	it("keeps the conversation scroll area from bleeding under the composer", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/viya/viya-chat-screen.tsx"
		);

		expect(source).toContain("const chatComposerGap = 12");
		expect(source).toContain(
			"paddingBottom: Math.max(insets.bottom, spacing.sm)"
		);
		expect(source).toContain("paddingBottom: chatScrollContentBottomPadding");
		expect(source).toContain("includeBottomInset={false}");
		expect(source).not.toContain("isComposerSheetOpen");
		expect(source).not.toContain("chatScrollShadowBottomBleed");
	});
});
