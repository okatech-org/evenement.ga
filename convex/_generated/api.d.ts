/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as events from "../events.js";
import type * as globalConfig from "../globalConfig.js";
import type * as modules from "../modules.js";
import type * as qr from "../qr.js";
import type * as rsvp from "../rsvp.js";
import type * as seedDemo from "../seedDemo.js";
import type * as themes from "../themes.js";
import type * as users from "../users.js";
import type * as venues from "../venues.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  chat: typeof chat;
  events: typeof events;
  globalConfig: typeof globalConfig;
  modules: typeof modules;
  qr: typeof qr;
  rsvp: typeof rsvp;
  seedDemo: typeof seedDemo;
  themes: typeof themes;
  users: typeof users;
  venues: typeof venues;
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
