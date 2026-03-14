/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as appSettings from "../appSettings.js";
import type * as conversations from "../conversations.js";
import type * as credits from "../credits.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_credits from "../lib/credits.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_roleConstants from "../lib/roleConstants.js";
import type * as lib_roles from "../lib/roles.js";
import type * as llmTraces from "../llmTraces.js";
import type * as llm_generate from "../llm/generate.js";
import type * as llm_memory from "../llm/memory.js";
import type * as llm_moves from "../llm/moves.js";
import type * as llm_openrouter from "../llm/openrouter.js";
import type * as llm_prompt from "../llm/prompt.js";
import type * as llm_scoring from "../llm/scoring.js";
import type * as llm_testChat from "../llm/testChat.js";
import type * as llm_workHours from "../llm/workHours.js";
import type * as stats from "../stats.js";
import type * as stripe from "../stripe.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  appSettings: typeof appSettings;
  conversations: typeof conversations;
  credits: typeof credits;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/credits": typeof lib_credits;
  "lib/dates": typeof lib_dates;
  "lib/roleConstants": typeof lib_roleConstants;
  "lib/roles": typeof lib_roles;
  llmTraces: typeof llmTraces;
  "llm/generate": typeof llm_generate;
  "llm/memory": typeof llm_memory;
  "llm/moves": typeof llm_moves;
  "llm/openrouter": typeof llm_openrouter;
  "llm/prompt": typeof llm_prompt;
  "llm/scoring": typeof llm_scoring;
  "llm/testChat": typeof llm_testChat;
  "llm/workHours": typeof llm_workHours;
  stats: typeof stats;
  stripe: typeof stripe;
  stripeWebhook: typeof stripeWebhook;
  users: typeof users;
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

export declare const components: {};
