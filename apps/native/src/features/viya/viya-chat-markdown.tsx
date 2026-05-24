import {
	Text as NativeText,
	type StyleProp,
	type TextStyle,
	View,
} from "react-native";

import {
	bulletLinePattern,
	headingLinePattern,
	inlineMarkdownTokenPattern,
	numberedLinePattern,
	pipeEndPattern,
	pipeStartPattern,
	ruleLinePattern,
	tableSeparatorPattern,
} from "./viya-chat-constants";
import type {
	InlineMarkdownPart,
	MarkdownBlock,
	ParsedMarkdownBlock,
} from "./viya-chat-types";

const isTableSeparator = (line: string) =>
	tableSeparatorPattern.test(line.trim());

const splitTableCells = (line: string) => {
	const trimmedLine = line
		.trim()
		.replace(pipeStartPattern, "")
		.replace(pipeEndPattern, "");
	return trimmedLine.split("|").map((cell) => cell.trim());
};

const createMarkdownBlockId = (
	type: MarkdownBlock["type"],
	source: string,
	blockCount: number
) => `${type}-${blockCount}-${source.slice(0, 32)}`;

const shouldStartNewMarkdownBlock = (line: string, nextLine: string) =>
	!line ||
	headingLinePattern.test(line) ||
	ruleLinePattern.test(line) ||
	bulletLinePattern.test(line) ||
	numberedLinePattern.test(line) ||
	(line.includes("|") && isTableSeparator(nextLine));

const parseHeadingBlock = (
	line: string,
	blockCount: number
): MarkdownBlock | null => {
	const headingMatch = line.match(headingLinePattern);

	if (!headingMatch) {
		return null;
	}

	return {
		id: createMarkdownBlockId("heading", line, blockCount),
		level: headingMatch[1].length,
		text: headingMatch[2],
		type: "heading",
	};
};

const parseListBlock = ({
	blockCount,
	lines,
	startIndex,
	type,
}: {
	blockCount: number;
	lines: string[];
	startIndex: number;
	type: "bulletList" | "numberedList";
}): ParsedMarkdownBlock => {
	const items: string[] = [];
	const pattern =
		type === "bulletList" ? bulletLinePattern : numberedLinePattern;
	let nextIndex = startIndex;

	while (nextIndex < lines.length) {
		const itemMatch = lines[nextIndex].trim().match(pattern);

		if (!itemMatch) {
			break;
		}

		items.push(itemMatch[1]);
		nextIndex += 1;
	}

	return {
		block: {
			id: createMarkdownBlockId(type, items.join(" "), blockCount),
			items,
			type,
		},
		nextIndex,
	};
};

const parseTableBlock = (
	lines: string[],
	startIndex: number,
	blockCount: number
): ParsedMarkdownBlock => {
	const headers = splitTableCells(lines[startIndex]);
	const rows: string[][] = [];
	let nextIndex = startIndex + 2;

	while (nextIndex < lines.length && lines[nextIndex].trim().includes("|")) {
		rows.push(splitTableCells(lines[nextIndex]));
		nextIndex += 1;
	}

	return {
		block: {
			headers,
			id: createMarkdownBlockId("table", headers.join(" "), blockCount),
			rows,
			type: "table",
		},
		nextIndex,
	};
};

const parseParagraphBlock = (
	lines: string[],
	startIndex: number,
	blockCount: number
): ParsedMarkdownBlock => {
	const paragraphLines = [lines[startIndex].trim()];
	let nextIndex = startIndex + 1;

	while (nextIndex < lines.length) {
		const line = lines[nextIndex].trim();
		const nextLine = lines[nextIndex + 1]?.trim() ?? "";

		if (shouldStartNewMarkdownBlock(line, nextLine)) {
			break;
		}

		paragraphLines.push(line);
		nextIndex += 1;
	}

	const text = paragraphLines.join(" ");

	return {
		block: {
			id: createMarkdownBlockId("paragraph", text, blockCount),
			text,
			type: "paragraph",
		},
		nextIndex,
	};
};

const parseInlineMarkdown = (value: string): InlineMarkdownPart[] => {
	const parts: InlineMarkdownPart[] = [];
	let currentIndex = 0;

	for (const match of value.matchAll(inlineMarkdownTokenPattern)) {
		const matchIndex = match.index ?? 0;

		if (matchIndex > currentIndex) {
			parts.push({
				id: `text-${currentIndex}`,
				text: value.slice(currentIndex, matchIndex),
			});
		}

		const token = match[0];

		if (token.startsWith("`")) {
			parts.push({
				code: true,
				id: `code-${matchIndex}`,
				text: token.slice(1, -1),
			});
		} else if (token.startsWith("**")) {
			parts.push({
				id: `strong-${matchIndex}`,
				strong: true,
				text: token.slice(2, -2),
			});
		} else {
			parts.push({
				emphasis: true,
				id: `emphasis-${matchIndex}`,
				text: token.slice(1, -1),
			});
		}

		currentIndex = matchIndex + token.length;
	}

	if (currentIndex < value.length) {
		parts.push({
			id: `text-${currentIndex}`,
			text: value.slice(currentIndex),
		});
	}

	return parts.length > 0 ? parts : [{ id: "text-0", text: value }];
};

const parseMarkdownBlocks = (value: string): MarkdownBlock[] => {
	const blocks: MarkdownBlock[] = [];
	const lines = value.replace(/\r\n/g, "\n").split("\n");
	let index = 0;

	while (index < lines.length) {
		const line = lines[index].trim();
		const nextLine = lines[index + 1]?.trim() ?? "";

		if (!line) {
			index += 1;
			continue;
		}

		const headingBlock = parseHeadingBlock(line, blocks.length);

		if (headingBlock) {
			blocks.push(headingBlock);
			index += 1;
			continue;
		}

		if (ruleLinePattern.test(line)) {
			blocks.push({
				id: createMarkdownBlockId("rule", line, blocks.length),
				type: "rule",
			});
			index += 1;
			continue;
		}

		if (line.includes("|") && isTableSeparator(nextLine)) {
			const parsedTable = parseTableBlock(lines, index, blocks.length);
			blocks.push(parsedTable.block);
			index = parsedTable.nextIndex;
			continue;
		}

		if (bulletLinePattern.test(line)) {
			const parsedList = parseListBlock({
				blockCount: blocks.length,
				lines,
				startIndex: index,
				type: "bulletList",
			});
			blocks.push(parsedList.block);
			index = parsedList.nextIndex;
			continue;
		}

		if (numberedLinePattern.test(line)) {
			const parsedList = parseListBlock({
				blockCount: blocks.length,
				lines,
				startIndex: index,
				type: "numberedList",
			});
			blocks.push(parsedList.block);
			index = parsedList.nextIndex;
			continue;
		}

		const parsedParagraph = parseParagraphBlock(lines, index, blocks.length);
		blocks.push(parsedParagraph.block);
		index = parsedParagraph.nextIndex;
	}

	return blocks;
};

function InlineMarkdownText({
	children,
	color = "#18181B",
	size = 15,
	style,
}: {
	children: string;
	color?: string;
	size?: number;
	style?: StyleProp<TextStyle>;
}) {
	return (
		<NativeText
			style={[
				{
					color,
					fontSize: size,
					fontWeight: "500",
					lineHeight: size + 8,
				},
				style,
			]}
		>
			{parseInlineMarkdown(children).map((part) => (
				<NativeText
					key={part.id}
					style={{
						backgroundColor: part.code ? "rgba(24, 24, 27, 0.06)" : undefined,
						borderRadius: part.code ? 6 : undefined,
						fontFamily: part.code ? "Menlo" : undefined,
						fontStyle: part.emphasis ? "italic" : "normal",
						fontWeight: part.strong ? "800" : "500",
					}}
				>
					{part.text}
				</NativeText>
			))}
		</NativeText>
	);
}

function MarkdownTable({
	headers,
	rows,
}: {
	headers: string[];
	rows: string[][];
}) {
	return (
		<View
			className="overflow-hidden rounded-2xl border border-border"
			style={{ backgroundColor: "#FAFAFA" }}
		>
			<View className="flex-row" style={{ backgroundColor: "#F4F4F5" }}>
				{headers.map((header) => (
					<View
						className="flex-1 px-3 py-2"
						key={header}
						style={{
							borderLeftColor: "rgba(24, 24, 27, 0.08)",
							borderLeftWidth: header === headers[0] ? 0 : 1,
						}}
					>
						<InlineMarkdownText size={13} style={{ fontWeight: "800" }}>
							{header}
						</InlineMarkdownText>
					</View>
				))}
			</View>
			{rows.map((row) => (
				<View className="flex-row border-border border-t" key={row.join("-")}>
					{headers.map((header) => (
						<View
							className="flex-1 px-3 py-2"
							key={header}
							style={{
								borderLeftColor: "rgba(24, 24, 27, 0.08)",
								borderLeftWidth: header === headers[0] ? 0 : 1,
							}}
						>
							<InlineMarkdownText color="#3F3F46" size={13}>
								{row[headers.indexOf(header)] ?? ""}
							</InlineMarkdownText>
						</View>
					))}
				</View>
			))}
		</View>
	);
}

export function MarkdownContent({ text }: { text: string }) {
	const blocks = parseMarkdownBlocks(text);

	return (
		<View className="gap-3">
			{blocks.map((block) => {
				if (block.type === "heading") {
					const headingSize = block.level <= 2 ? 18 : 16;

					return (
						<InlineMarkdownText
							key={block.id}
							size={headingSize}
							style={{ fontWeight: "800" }}
						>
							{block.text}
						</InlineMarkdownText>
					);
				}

				if (block.type === "rule") {
					return <View className="h-px bg-border" key={block.id} />;
				}

				if (block.type === "table") {
					return (
						<MarkdownTable
							headers={block.headers}
							key={block.id}
							rows={block.rows}
						/>
					);
				}

				if (block.type === "bulletList" || block.type === "numberedList") {
					return (
						<View className="gap-2" key={block.id}>
							{block.items.map((item) => (
								<View className="flex-row gap-2" key={item}>
									<NativeText
										style={{
											color: "#71717A",
											fontSize: 15,
											fontWeight: "700",
											lineHeight: 23,
											width: 22,
										}}
									>
										{block.type === "numberedList"
											? `${block.items.indexOf(item) + 1}.`
											: "•"}
									</NativeText>
									<View className="flex-1">
										<InlineMarkdownText>{item}</InlineMarkdownText>
									</View>
								</View>
							))}
						</View>
					);
				}

				if (block.type === "paragraph") {
					return (
						<InlineMarkdownText key={block.id}>{block.text}</InlineMarkdownText>
					);
				}

				return null;
			})}
		</View>
	);
}
