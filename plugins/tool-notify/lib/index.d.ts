import type { Context } from '@deepseek-ai/cordis';
import { buildNotifyCommand } from './notify.js';
export declare const name = "tool-notify";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
export { buildNotifyCommand };
