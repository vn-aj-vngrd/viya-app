import {
	Text as NativeText,
	type StyleProp,
	type TextStyle,
	View,
} from "react-native";

import {
	parseInlineMarkdown,
	parseMarkdownBlocks,
} from "./viya-chat-markdown-parser";

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
				{headers.map((header, headerIndex) => (
					<View
						className="flex-1 px-3 py-2"
						key={header}
						style={{
							borderLeftColor: "rgba(24, 24, 27, 0.08)",
							borderLeftWidth: headerIndex === 0 ? 0 : 1,
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
					{headers.map((header, headerIndex) => (
						<View
							className="flex-1 px-3 py-2"
							key={header}
							style={{
								borderLeftColor: "rgba(24, 24, 27, 0.08)",
								borderLeftWidth: headerIndex === 0 ? 0 : 1,
							}}
						>
							<InlineMarkdownText color="#3F3F46" size={13}>
								{row[headerIndex] ?? ""}
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
							{block.items.map((item, itemIndex) => (
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
										{block.type === "numberedList" ? `${itemIndex + 1}.` : "•"}
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
