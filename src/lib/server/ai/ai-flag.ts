// Single gate for every AI assist endpoint/service. AI is off unless BOTH an
// ANTHROPIC_API_KEY is configured AND an admin has flipped the AI_ASSIST_ENABLED
// platform Setting on. This lets us dark-launch and kill instantly, and combined
// with completeJSON() returning null on a missing key, the platform degrades
// cleanly with no AI key at all.

import { getSetting } from '../settings';

export const AI_ASSIST_ENABLED_KEY = 'AI_ASSIST_ENABLED';

export async function isAiEnabled(): Promise<boolean> {
	if (!process.env.ANTHROPIC_API_KEY) return false;
	const value = await getSetting<{ enabled: boolean }>(AI_ASSIST_ENABLED_KEY);
	return value?.enabled === true;
}
