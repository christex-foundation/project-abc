import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as disputeRepo from '../repositories/dispute.repo';
import * as bountyRepo from '../repositories/bounty.repo';
import * as submissionRepo from '../repositories/submission.repo';
import * as userRepo from '../repositories/user.repo';
import * as companyRepo from '../repositories/company.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as notification from './notification.service';
import {
	raiseDisputeInput,
	updateDisputeInput,
	DISPUTE_STATUSES,
	type DisputeStatus
} from '$lib/validators/dispute';

function appUrl(): string {
	return process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:5173';
}

function stripHtml(input: string): string {
	return input.replace(/<[^>]*>/g, '').trim();
}

function excerpt(s: string, max = 200): string {
	return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export async function raiseDispute(caller: AuthedUser, raw: unknown) {
	if (!caller.isActive) {
		throw new AppError('FORBIDDEN', 'This account is deactivated.');
	}
	const parsed = raiseDisputeInput.parse(raw);
	const reason = stripHtml(parsed.reason);
	if (reason.length < 10) {
		throw new AppError('BAD_REQUEST', 'Reason is too short.');
	}

	const bounty = await bountyRepo.findBountyById(parsed.bountyId);
	if (!bounty) throw new AppError('NOT_FOUND', 'Bounty not found.');

	if (parsed.submissionId) {
		const sub = await submissionRepo.findByIdForSponsor(parsed.submissionId);
		if (!sub || sub.bountyId !== bounty.id) {
			throw new AppError('NOT_FOUND', 'Submission not found on this bounty.');
		}
		// Submission-level disputes require ownership: either the submitter, the
		// bounty's company owner, or an admin.
		if (caller.role !== 'ADMIN') {
			const [freelancer, company] = await Promise.all([
				caller.role === 'FREELANCER' ? freelancerRepo.findByUserId(caller.id) : null,
				caller.role === 'COMPANY' ? companyRepo.findByUserId(caller.id) : null
			]);
			const isSubmitter =
				caller.role === 'FREELANCER' &&
				freelancer != null &&
				sub.freelancerProfileId === freelancer.id;
			const isBountyOwner =
				caller.role === 'COMPANY' && company != null && company.id === bounty.companyProfileId;
			if (!isSubmitter && !isBountyOwner) {
				throw new AppError('FORBIDDEN', 'You cannot raise a dispute on this submission.');
			}
		}
	}

	const dispute = await disputeRepo.create({
		bountyId: bounty.id,
		raisedById: caller.id,
		reason
	});

	// Fan out to active admins via the in-app + email channels.
	const admins = await userRepo.listActiveAdmins();
	const disputeUrl = `${appUrl()}/admin/disputes`;
	const reasonExcerpt = excerpt(reason);
	await Promise.all(
		admins.map((a) =>
			notification.dispatch(a.id, 'DISPUTE_RAISED', {
				title: 'Dispute raised',
				message: `${caller.name ?? caller.email} raised a dispute on "${bounty.title}".`,
				link: '/admin/disputes',
				email: {
					bountyTitle: bounty.title,
					raisedByName: caller.name ?? caller.email,
					raisedByEmail: caller.email,
					reasonExcerpt,
					disputeUrl
				}
			})
		)
	);

	return dispute;
}

export async function getById(caller: AuthedUser, id: string) {
	const dispute = await disputeRepo.findById(id);
	if (!dispute) throw new AppError('NOT_FOUND', 'Dispute not found.');
	if (caller.role !== 'ADMIN' && dispute.raisedById !== caller.id) {
		throw new AppError('FORBIDDEN', 'You do not have access to this dispute.');
	}
	return dispute;
}

export async function listForAdmin(caller: AuthedUser, filter: { status?: string } = {}) {
	requireRole(caller, 'ADMIN');
	const status =
		filter.status && DISPUTE_STATUSES.includes(filter.status as DisputeStatus)
			? filter.status
			: undefined;
	return disputeRepo.listForAdmin({ status });
}

export async function update(caller: AuthedUser, id: string, raw: unknown) {
	requireRole(caller, 'ADMIN');
	const parsed = updateDisputeInput.parse(raw);
	const dispute = await disputeRepo.findById(id);
	if (!dispute) throw new AppError('NOT_FOUND', 'Dispute not found.');

	let updated;
	if (parsed.resolution !== undefined && parsed.resolution.trim().length > 0) {
		const nextStatus = parsed.status ?? 'RESOLVED';
		updated = await disputeRepo.setResolution(id, parsed.resolution.trim(), nextStatus);
		// Notify the raiser when transitioning to RESOLVED.
		if (nextStatus === 'RESOLVED') {
			await notification.dispatch(dispute.raisedById, 'DISPUTE_RESOLVED', {
				title: 'Dispute resolved',
				message: `Your dispute on "${dispute.bounty.title}" has been resolved.`,
				link: `/bounties/${dispute.bounty.slug}`,
				email: {
					bountyTitle: dispute.bounty.title,
					resolution: parsed.resolution.trim()
				}
			});
		}
	} else if (parsed.status) {
		updated = await disputeRepo.updateStatus(id, parsed.status);
	} else {
		throw new AppError('BAD_REQUEST', 'Provide at least one of status or resolution.');
	}

	return updated;
}
