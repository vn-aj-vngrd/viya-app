import { z } from "zod";

export const budgetSuggestionSchema = z.object({
	amount: z.number().positive(),
	rationale: z.string().min(1).max(180),
});

export type BudgetSuggestion = z.infer<typeof budgetSuggestionSchema>;
