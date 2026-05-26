import { json } from '@sveltejs/kit';
import { respondError } from '$lib/server/http';
import * as escrowService from '$lib/server/services/escrow.service';
import type { RequestHandler } from './$types';

// SvelteKit's origin CSRF check only triggers for form-encoded / multipart /
// plain-text bodies; Monime delivers `application/json` so this handler is
// reachable cross-origin without a bypass. HMAC + the shared secret are the
// real trust boundary — see `verifyWebhookSignature` in monime/client.ts.
export const POST: RequestHandler = async ({ request }) => {
	try {
		const raw = await request.text();
		const signature =
			request.headers.get('monime-signature') ?? request.headers.get('x-monime-signature');
		await escrowService.handleWebhook(raw, signature);
		return json({ ok: true });
	} catch (e) {
		return respondError(e);
	}
};
