const numberedOptionPattern = /^\s*(?:[-*]\s*)?\d+[.)]\s+.+/;
const lineBreakPattern = /\r\n|\r|\n/g;

export const shouldUseQuestionFocusMode = ({
	hasPendingQuestion,
	shouldShowSlashCommandMenu,
}: {
	hasPendingQuestion: boolean;
	shouldShowSlashCommandMenu: boolean;
}) => hasPendingQuestion && !shouldShowSlashCommandMenu;

export const getQuestionDockContainerClassName = (
	isQuestionFocusMode: boolean
) => (isQuestionFocusMode ? "relative z-30" : "relative z-10");

export const getQuestionPromptOnlyDisplayText = (text: string) => {
	const lines = text.split(lineBreakPattern);
	const firstOptionIndex = lines.findIndex((line) =>
		numberedOptionPattern.test(line)
	);

	if (firstOptionIndex < 0) {
		return text;
	}

	const optionCount = lines
		.slice(firstOptionIndex)
		.filter((line) => numberedOptionPattern.test(line)).length;

	if (optionCount < 2) {
		return text;
	}

	return lines.slice(0, firstOptionIndex).join("\n").trim();
};
