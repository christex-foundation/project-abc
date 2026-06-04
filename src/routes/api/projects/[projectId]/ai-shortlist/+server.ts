import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as proposalRankService from '$lib/server/services/proposal-rank.service';
import type { RequestHandler } from './$types';

// Owner/admin-guarded AI shortlist for a project's proposals. Role + ownership
// are enforced inside the service (via proposalService.listForProject), so a
// freelancer hitting this endpoint gets FORBIDDEN. Degrades to embedding order
// when AI is disabled — the result's `rankedBy` flag tells the UI which path ran.
export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const caller = requireAuth(locals);
		const result = await proposalRankService.rankProposals(caller, params.projectId);
		return json({ result });
	} catch (e) {
		return respondError(e);
	}
};
