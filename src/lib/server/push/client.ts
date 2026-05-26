import webpush from 'web-push';
import { env } from '$env/dynamic/private';

export type PushPayload = {
	title: string;
	body?: string;
	url?: string;
	tag?: string;
};

const subject = env.VAPID_SUBJECT;
const publicKey = env.VAPID_PUBLIC_KEY;
const privateKey = env.VAPID_PRIVATE_KEY;

export const pushEnabled = Boolean(subject && publicKey && privateKey);

if (pushEnabled) {
	webpush.setVapidDetails(subject!, publicKey!, privateKey!);
} else {
	console.warn(
		'[push] VAPID keys not configured — push disabled. Run `npx web-push generate-vapid-keys` and populate .env.'
	);
}

export { webpush };
