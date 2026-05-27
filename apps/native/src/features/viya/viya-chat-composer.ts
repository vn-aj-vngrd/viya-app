export const getComposerInputLayout = ({
	contentHeight,
	maxHeight,
	minHeight,
}: {
	contentHeight: number;
	maxHeight: number;
	minHeight: number;
}) => {
	const isOverflowing = contentHeight > maxHeight;
	const isAtMaxHeight = contentHeight >= maxHeight;

	return {
		height: Math.min(maxHeight, Math.max(minHeight, contentHeight)),
		isScrollable: isOverflowing,
		shouldShowExpand: isAtMaxHeight,
	};
};
