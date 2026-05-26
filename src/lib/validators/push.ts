import { z } from 'zod';

export const pushSubscribeInput = z.object({
	endpoint: z.string().url().max(2048),
	keys: z.object({
		p256dh: z.string().min(1).max(256),
		auth: z.string().min(1).max(64)
	}),
	userAgent: z.string().max(512).optional()
});

export type PushSubscribeInput = z.infer<typeof pushSubscribeInput>;

export const pushUnsubscribeInput = z.object({
	endpoint: z.string().url().max(2048)
});

export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeInput>;
