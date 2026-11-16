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

const compactOrderedMarkerPattern =
	/(^|\s)(\(?\d{1,2}[.)]\)?|\d{1,2}\uFE0F?\u20E3)\s+/gu;
const digitPattern = /\d+/;

interface CompactOrderedMarker {
	endIndex: number;
	number: number;
	startIndex: number;
}

const isTableSeparator = (line: string) =>
	tableSeparatorPattern.test(line.trim());

const splitTableCells = (line: string) => {
	const trimmedLine = line
		.trim()
		.replace(pipeStartPattern, "")
		.replace(pipeEndPattern, "");
	return trimmedLine.split("|").map((cell) => cell.trim());
};

// Ids must not depend on the text: while a reply streams, content changes on
// every tick and a text-based id would remount the block each time (flicker).
const createMarkdownBlockId = (
	type: MarkdownBlock["type"],
	_source: string,
	blockCount: number
) => `${type}-${blockCount}`;

const shouldStartNewMarkdownBlock = (line: string, nextLine: string) =>
	!line ||
	headingLinePattern.test(line) ||
	ruleLinePattern.test(line) ||
	bulletLinePattern.test(line) ||
	numberedLinePattern.test(line) ||
	(line.includes("|") && isTableSeparator(nextLine));

const parseCompactOrderedMarker = (
	match: RegExpExecArray
): CompactOrderedMarker | null => {
	const boundary = match[1] ?? "";
	const marker = match[2] ?? "";
	const numberMatch = digitPattern.exec(marker);

	if (!numberMatch) {
		return null;
	}

	return {
		endIndex: (match.index ?? 0) + match[0].length,
		number: Number(numberMatch[0]),
		startIndex: (match.index ?? 0) + boundary.length,
	};
};

const getCompactOrderedMarkers = (line: string) => {
	const markers: CompactOrderedMarker[] = [];

	for (const match of line.matchAll(compactOrderedMarkerPattern)) {
		const marker = parseCompactOrderedMarker(match);

		if (marker) {
			markers.push(marker);
		}
	}

	return markers;
};

const hasSequentialMarkers = (markers: CompactOrderedMarker[]) => {
	if (markers.length < 2 || markers[0]?.number !== 1) {
		return false;
	}

	return markers.every((marker, index) => marker.number === index + 1);
};

const normalizeCompactOrderedListLine = (line: string) => {
	const markers = getCompactOrderedMarkers(line);

	if (!hasSequentialMarkers(markers)) {
		return line;
	}

	const prefix = line.slice(0, markers[0].startIndex).trim();
	const listLines = markers.map((marker, index) => {
		const nextMarker = markers[index + 1];
		const item = line
			.slice(marker.endIndex, nextMarker?.startIndex ?? line.length)
			.trim();
		return `${index + 1}. ${item}`;
	});

	return [prefix, ...listLines].filter(Boolean).join("\n");
};

const normalizeMarkdownInput = (value: string) =>
	value
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => normalizeCompactOrderedListLine(line))
		.join("\n");

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
		const line = lines[nextIndex].trim();
		const itemMatch = line.match(pattern);

		if (itemMatch) {
			items.push(itemMatch[1]);
			nextIndex += 1;
			continue;
		}

		const nextLine = lines[nextIndex + 1]?.trim() ?? "";

		if (shouldStartNewMarkdownBlock(line, nextLine) || items.length === 0) {
			break;
		}

		items[items.length - 1] = `${items.at(-1)} ${line}`.trim();
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

export const parseInlineMarkdown = (value: string): InlineMarkdownPart[] => {
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
		} else if (token.startsWith("**") || token.startsWith("__")) {
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

export const parseMarkdownBlocks = (value: string): MarkdownBlock[] => {
	const blocks: MarkdownBlock[] = [];
	const lines = normalizeMarkdownInput(value).split("\n");
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
