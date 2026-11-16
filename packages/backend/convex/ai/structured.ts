import { generateObject, type LanguageModel, streamObject } from "ai";
import type { z } from "zod";

interface StructuredOptions<TSchema extends z.ZodType> {
	fallback: z.infer<TSchema>;
	model: LanguageModel;
	prompt: string;
	schema: TSchema;
	schemaName: string;
	/** Rethrow model errors instead of returning the fallback. */
	strict?: boolean;
}

export const generateStructuredObject = async <TSchema extends z.ZodType>({
	fallback,
	model,
	prompt,
	schema,
	schemaName,
	strict,
}: StructuredOptions<TSchema>): Promise<z.infer<TSchema>> => {
	try {
		const result = await generateObject({
			model,
			prompt,
			schema,
			schemaName,
		});

		return result.object as z.infer<TSchema>;
	} catch (error) {
		console.error(`Structured generation failed (${schemaName})`, error);

		if (strict) {
			throw error;
		}

		return fallback;
	}
};

export const streamStructuredObject = <TSchema extends z.ZodType>({
	fallback,
	model,
	prompt,
	schema,
	schemaName,
}: StructuredOptions<TSchema>) => {
	try {
		return streamObject({
			model,
			prompt,
			schema,
			schemaName,
		});
	} catch {
		return {
			object: Promise.resolve(fallback),
			partialObjectStream: (async function* () {
				await Promise.resolve();
				yield fallback;
			})(),
		};
	}
};
