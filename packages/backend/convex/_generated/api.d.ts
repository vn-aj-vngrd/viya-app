/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as ai_fallbacks from "../ai/fallbacks.js";
import type * as ai_features from "../ai/features.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as ai_provider from "../ai/provider.js";
import type * as ai_structured from "../ai/structured.js";
import type * as bookings from "../bookings.js";
import type * as chat from "../chat.js";
import type * as healthCheck from "../healthCheck.js";
import type * as lib_auth from "../lib/auth.js";
import type * as preferences from "../preferences.js";
import type * as privateData from "../privateData.js";
import type * as readiness from "../readiness.js";
import type * as risks from "../risks.js";
import type * as tripWorkspace from "../tripWorkspace.js";
import type * as trips from "../trips.js";
import type * as users from "../users.js";
import type * as vault from "../vault.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  "ai/fallbacks": typeof ai_fallbacks;
  "ai/features": typeof ai_features;
  "ai/prompts": typeof ai_prompts;
  "ai/provider": typeof ai_provider;
  "ai/structured": typeof ai_structured;
  bookings: typeof bookings;
  chat: typeof chat;
  healthCheck: typeof healthCheck;
  "lib/auth": typeof lib_auth;
  preferences: typeof preferences;
  privateData: typeof privateData;
  readiness: typeof readiness;
  risks: typeof risks;
  tripWorkspace: typeof tripWorkspace;
  trips: typeof trips;
  users: typeof users;
  vault: typeof vault;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
