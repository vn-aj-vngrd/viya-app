import {
	Text as NativeText,
	type StyleProp,
	type TextStyle,
	View,
} from "react-native";

import { radius, spacing, typeScale, useUITheme } from "@/src/components/ui";

import {
	parseInlineMarkdown,
	parseMarkdownBlocks,
} from "./viya-chat-markdown-parser";

const bodyType = { fontSize: 17, lineHeight: 25 } as const;
const tableType = { fontSize: 14, lineHeight: 19 } as const;

function InlineMarkdownText({
	children,
	color,
	size = bodyType.fontSize,
	lineHeight = bodyType.lineHeight,
	style,
}: {
	children: string;
	color?: string;
	lineHeight?: number;
	size?: number;
	style?: StyleProp<TextStyle>;
}) {
	const { palette } = useUITheme();

	return (
		<NativeText
			selectable={true}
			style={[
				{
					color: color ?? palette.ink,
					fontSize: size,
					fontWeight: "400",
					lineHeight,
				},
				style,
			]}
		>
			{parseInlineMarkdown(children).map((part) => (
				<NativeText
					key={part.id}
					style={{
						backgroundColor: part.code ? palette.fill : undefined,
						fontFamily: part.code ? "Menlo" : undefined,
						fontStyle: part.emphasis ? "italic" : "normal",
						fontWeight: part.strong ? "600" : "400",
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
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.surface,
				borderRadius: radius.group,
				overflow: "hidden",
			}}
		>
			<View style={{ backgroundColor: palette.fill, flexDirection: "row" }}>
				{headers.map((header, headerIndex) => (
					<View
						key={positionKey("header", headerIndex)}
						style={{
							flex: 1,
							paddingHorizontal: spacing.md,
							paddingVertical: spacing.sm,
						}}
					>
						<InlineMarkdownText
							lineHeight={tableType.lineHeight}
							size={tableType.fontSize}
							style={{ fontWeight: "600" }}
						>
							{header}
						</InlineMarkdownText>
					</View>
				))}
			</View>
			{rows.map((row, rowIndex) => (
				<View
					key={positionKey("row", rowIndex)}
					style={{
						borderTopColor: palette.separator,
						borderTopWidth: 1,
						flexDirection: "row",
					}}
				>
					{headers.map((_header, headerIndex) => (
						<View
							key={positionKey("cell", headerIndex)}
							style={{
								flex: 1,
								paddingHorizontal: spacing.md,
								paddingVertical: spacing.sm,
							}}
						>
							<InlineMarkdownText
								color={palette.inkSecondary}
								lineHeight={tableType.lineHeight}
								size={tableType.fontSize}
							>
								{row[headerIndex] ?? ""}
							</InlineMarkdownText>
						</View>
					))}
				</View>
			))}
		</View>
	);
}

/**
 * Rows, cells and items are keyed by position. Their text changes on every
 * streamed token, so a text key would remount them each tick and flicker.
 */
const positionKey = (prefix: string, index: number) => `${prefix}-${index}`;

export function MarkdownContent({ text }: { text: string }) {
	const { palette } = useUITheme();
	const blocks = parseMarkdownBlocks(text);

	return (
		<View style={{ gap: spacing.md }}>
			{blocks.map((block) => {
				if (block.type === "heading") {
					const isMajor = block.level <= 2;

					return (
						<InlineMarkdownText
							key={block.id}
							lineHeight={isMajor ? typeScale.heading.lineHeight : 24}
							size={isMajor ? 20 : 17}
							style={{ fontWeight: "600", marginTop: spacing.xs }}
						>
							{block.text}
						</InlineMarkdownText>
					);
				}

				if (block.type === "rule") {
					return (
						<View
							key={block.id}
							style={{ backgroundColor: palette.separator, height: 1 }}
						/>
					);
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
						<View key={block.id} style={{ gap: spacing.sm }}>
							{block.items.map((item, itemIndex) => (
								<View
									key={positionKey(block.id, itemIndex)}
									style={{ flexDirection: "row", gap: spacing.sm }}
								>
									<NativeText
										style={{
											color: palette.inkSecondary,
											fontSize: bodyType.fontSize,
											fontVariant: ["tabular-nums"],
											lineHeight: bodyType.lineHeight,
											minWidth: 22,
										}}
									>
										{block.type === "numberedList" ? `${itemIndex + 1}.` : "•"}
									</NativeText>
									<View style={{ flex: 1 }}>
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
