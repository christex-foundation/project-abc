// GDPR account-management service.
//
// Two flows for both self-serve and admin-triggered cases:
//   - exportMyData / adminExportUserData → produces a ZIP with data.json + CSVs
//   - deleteMyAccount / adminDeleteUser  → erases the user, blocked while
//     financial obligations are open (active bounty, pending payment, open
//     dispute, unpaid winner, processing withdrawal).
//
// The schema migration `20260527130000_gdpr_account_deletion` made the FK
// relations from Bounty/Submission/Dispute/CompanyInvite to User nullable
// with SET NULL, so a hard delete here leaves history intact under the
// counterparty (e.g. a deleted freelancer's submission survives under the
// sponsor's bounty, attributed via `freelancerNameSnapshot`).

import JSZip from 'jszip';
import { verifyPassword } from 'better-auth/crypto';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { prisma } from '../db';
import { deleteAccountInput, adminConfirmDeleteInput } from '$lib/validators/account';
import { toCsv } from './_csv';
import type { Prisma, UserRole } from '@prisma/client';

// ─── Blockers ────────────────────────────────────────────────────────────────

export type BlockerCode =
	| 'ACTIVE_BOUNTY'
	| 'PENDING_PAYMENT'
	| 'OPEN_DISPUTE'
	| 'UNPAID_WINNER'
	| 'PROCESSING_WITHDRAWAL';

export type Blocker = {
	code: BlockerCode;
	message: string;
	count: number;
	link?: string;
};

const ACTIVE_BOUNTY_STATUSES = ['DRAFT', 'FUNDED', 'ACTIVE', 'JUDGING'] as const;
const PENDING_PAYMENT_STATUSES = ['PENDING', 'PROCESSING'] as const;

async function collectBlockers(userId: string, role: UserRole): Promise<Blocker[]> {
	const blockers: Blocker[] = [];

	// Common to both roles
	const withdrawalCount = await prisma.accountWithdrawal.count({
		where: { userId, status: 'PROCESSING' }
	});
	if (withdrawalCount > 0) {
		blockers.push({
			code: 'PROCESSING_WITHDRAWAL',
			count: withdrawalCount,
			message: `${withdrawalCount} withdrawal${withdrawalCount === 1 ? ' is' : 's are'} still processing.`
		});
	}

	if (role === 'COMPANY') {
		const profile = await prisma.companyProfile.findUnique({
			where: { userId },
			select: { id: true }
		});
		if (!profile) return blockers;

		const [activeBounty, pendingPayment, openDispute, unpaidWinner] = await Promise.all([
			prisma.bounty.count({
				where: { companyProfileId: profile.id, status: { in: [...ACTIVE_BOUNTY_STATUSES] } }
			}),
			prisma.payment.count({
				where: {
					bounty: { companyProfileId: profile.id },
					status: { in: [...PENDING_PAYMENT_STATUSES] }
				}
			}),
			prisma.dispute.count({
				where: { bounty: { companyProfileId: profile.id }, status: 'OPEN' }
			}),
			prisma.submission.count({
				where: {
					bounty: { companyProfileId: profile.id },
					isWinner: true,
					isPaid: false
				}
			})
		]);

		if (activeBounty > 0) {
			blockers.push({
				code: 'ACTIVE_BOUNTY',
				count: activeBounty,
				message: `${activeBounty} bounty${activeBounty === 1 ? ' is' : 'ies are'} still draft, funded, active, or in judging — cancel or complete first.`,
				link: '/dashboard/company/bounties'
			});
		}
		if (pendingPayment > 0) {
			blockers.push({
				code: 'PENDING_PAYMENT',
				count: pendingPayment,
				message: `${pendingPayment} payment${pendingPayment === 1 ? '' : 's'} on your bounties ${pendingPayment === 1 ? 'is' : 'are'} still pending or processing.`
			});
		}
		if (openDispute > 0) {
			blockers.push({
				code: 'OPEN_DISPUTE',
				count: openDispute,
				message: `${openDispute} dispute${openDispute === 1 ? ' is' : 's are'} still open on your bounties.`
			});
		}
		if (unpaidWinner > 0) {
			blockers.push({
				code: 'UNPAID_WINNER',
				count: unpaidWinner,
				message: `${unpaidWinner} winning submission${unpaidWinner === 1 ? '' : 's'} on your bounties ${unpaidWinner === 1 ? 'has' : 'have'} not been paid yet.`
			});
		}
	}

	if (role === 'FREELANCER') {
		const profile = await prisma.freelancerProfile.findUnique({
			where: { userId },
			select: { id: true }
		});
		if (!profile) return blockers;

		const [unpaidWinner, pendingPayment, openDispute] = await Promise.all([
			prisma.submission.count({
				where: { freelancerProfileId: profile.id, isWinner: true, isPaid: false }
			}),
			prisma.payment.count({
				where: {
					submission: { freelancerProfileId: profile.id },
					status: { in: [...PENDING_PAYMENT_STATUSES] }
				}
			}),
			prisma.dispute.count({
				where: { raisedById: userId, status: 'OPEN' }
			})
		]);

		if (unpaidWinner > 0) {
			blockers.push({
				code: 'UNPAID_WINNER',
				count: unpaidWinner,
				message: `You have ${unpaidWinner} winning submission${unpaidWinner === 1 ? '' : 's'} awaiting payout.`,
				link: '/dashboard/freelancer/earnings'
			});
		}
		if (pendingPayment > 0) {
			blockers.push({
				code: 'PENDING_PAYMENT',
				count: pendingPayment,
				message: `${pendingPayment} payment${pendingPayment === 1 ? ' is' : 's are'} still pending or processing for your submissions.`
			});
		}
		if (openDispute > 0) {
			blockers.push({
				code: 'OPEN_DISPUTE',
				count: openDispute,
				message: `${openDispute} dispute${openDispute === 1 ? ' you raised is' : 's you raised are'} still open.`
			});
		}
	}

	return blockers;
}

export async function getDeletionBlockers(user: AuthedUser): Promise<Blocker[]> {
	return collectBlockers(user.id, user.role);
}

export async function adminGetDeletionBlockers(
	caller: AuthedUser,
	userId: string
): Promise<Blocker[]> {
	requireRole(caller, 'ADMIN');
	const target = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, role: true }
	});
	if (!target) throw new AppError('NOT_FOUND', 'User not found.');
	return collectBlockers(target.id, target.role);
}

// ─── Deletion ────────────────────────────────────────────────────────────────

export async function userHasCredentialAccount(userId: string): Promise<boolean> {
	const row = await prisma.account.findFirst({
		where: { userId, providerId: 'credential' },
		select: { id: true }
	});
	return !!row;
}

async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
	const row = await prisma.account.findFirst({
		where: { userId, providerId: 'credential' },
		select: { password: true }
	});
	if (!row?.password) return false;
	return verifyPassword({ hash: row.password, password });
}

/**
 * Inside the deletion txn: snapshot identifying labels onto rows that will
 * lose their FK so the counterparty's history stays attributable.
 */
async function writeAnonymizationSnapshots(
	tx: Prisma.TransactionClient,
	userId: string,
	role: UserRole,
	email: string
): Promise<void> {
	if (role === 'COMPANY') {
		const profile = await tx.companyProfile.findUnique({
			where: { userId },
			select: { id: true, companyName: true }
		});
		if (profile) {
			await tx.bounty.updateMany({
				where: { companyProfileId: profile.id },
				data: { companyNameSnapshot: profile.companyName }
			});
		}
	}
	if (role === 'FREELANCER') {
		const profile = await tx.freelancerProfile.findUnique({
			where: { userId },
			select: { id: true, displayName: true }
		});
		if (profile) {
			await tx.submission.updateMany({
				where: { freelancerProfileId: profile.id },
				data: { freelancerNameSnapshot: profile.displayName }
			});
		}
	}
	await tx.dispute.updateMany({
		where: { raisedById: userId },
		data: { raisedByEmailSnapshot: email }
	});
}

type DeleteOpts = {
	deletedByUserId: string | null;
	reason: string | null;
	skipPasswordCheck?: boolean;
};

async function performDeletion(
	targetUserId: string,
	opts: DeleteOpts,
	password?: string
): Promise<{ deletedEmail: string; deletedRole: UserRole }> {
	const target = await prisma.user.findUnique({
		where: { id: targetUserId },
		select: { id: true, email: true, role: true }
	});
	if (!target) throw new AppError('NOT_FOUND', 'User not found.');

	if (!opts.skipPasswordCheck && (await userHasCredentialAccount(target.id))) {
		if (!password) {
			throw new AppError('BAD_REQUEST', 'Password is required to confirm deletion.');
		}
		const ok = await verifyUserPassword(target.id, password);
		if (!ok) throw new AppError('FORBIDDEN', 'Incorrect password.');
	}

	await prisma.$transaction(async (tx) => {
		// Re-check blockers inside the txn to close the race against a
		// concurrent bounty publish / submission / dispute.
		const blockers = await collectBlockers(target.id, target.role);
		if (blockers.length > 0) {
			throw new AppError(
				'CONFLICT',
				'Resolve open financial or dispute obligations before deleting this account.',
				{ blockers }
			);
		}
		await writeAnonymizationSnapshots(tx, target.id, target.role, target.email);
		await tx.user.delete({ where: { id: target.id } });
	});

	// Outside the txn so a deletion-log write failure can't block the actual
	// deletion (the legal/regulatory requirement is the erasure itself).
	await prisma.accountDeletionLog
		.create({
			data: {
				deletedUserId: target.id,
				deletedEmail: target.email,
				deletedRole: target.role,
				deletedByUserId: opts.deletedByUserId,
				reason: opts.reason
			}
		})
		.catch((err) => {
			console.error('[account.service] failed to write AccountDeletionLog:', err);
		});

	return { deletedEmail: target.email, deletedRole: target.role };
}

export async function deleteMyAccount(
	user: AuthedUser,
	raw: unknown
): Promise<{ deletedEmail: string; deletedRole: UserRole }> {
	const parsed = deleteAccountInput.parse(raw);
	return performDeletion(user.id, { deletedByUserId: null, reason: null }, parsed.password);
}

export async function adminDeleteUser(
	caller: AuthedUser,
	userId: string,
	raw: unknown
): Promise<{ deletedEmail: string; deletedRole: UserRole }> {
	requireRole(caller, 'ADMIN');
	const parsed = adminConfirmDeleteInput.parse(raw);
	if (userId === caller.id) {
		throw new AppError('CONFLICT', 'You cannot delete your own admin account from this surface.');
	}
	return performDeletion(userId, {
		deletedByUserId: caller.id,
		reason: parsed.reason,
		skipPasswordCheck: true
	});
}

// ─── Export ──────────────────────────────────────────────────────────────────

type ExportScope = 'SELF' | 'ADMIN';

function maskBankDetails(bank: Prisma.JsonValue | null): Prisma.JsonValue | null {
	if (!bank || typeof bank !== 'object' || Array.isArray(bank)) return bank;
	const masked: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(bank as Record<string, unknown>)) {
		if (typeof v === 'string' && v.length >= 4) {
			masked[k] = `••••${v.slice(-4)}`;
		} else {
			masked[k] = v;
		}
	}
	return masked as Prisma.JsonValue;
}

async function loadFreelancerExport(userId: string, scope: ExportScope) {
	const [
		user,
		profile,
		submissions,
		creditTransactions,
		withdrawals,
		notifications,
		notificationPrefs,
		pushSubs,
		disputes
	] = await Promise.all([
		prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
				emailVerified: true,
				role: true,
				phoneNumber: true,
				isActive: true,
				referralCode: true,
				createdAt: true,
				updatedAt: true
			}
		}),
		prisma.freelancerProfile.findUnique({
			where: { userId },
			select: {
				id: true,
				displayName: true,
				headline: true,
				bio: true,
				portfolio: true,
				experienceLevel: true,
				whatsappNumber: true,
				bankDetails: true,
				monimeFinancialAccountId: true,
				monimeUvan: true,
				creditsBalance: true,
				creditsPeriodKey: true,
				referrerProfileId: true,
				createdAt: true,
				updatedAt: true,
				skills: {
					select: {
						proficiencyLevel: true,
						yearsExperience: true,
						skill: { select: { id: true, name: true, slug: true } }
					}
				},
				proofOfWorks: {
					select: {
						id: true,
						title: true,
						description: true,
						link: true,
						createdAt: true,
						skills: { select: { skill: { select: { id: true, name: true } } } }
					}
				}
			}
		}),
		// Freelancer's own submissions — sponsor-private fields (label, notes, score) excluded.
		prisma.submission.findMany({
			where: { freelancer: { userId } },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				bountyId: true,
				link: true,
				tweet: true,
				otherInfo: true,
				status: true,
				ask: true,
				isWinner: true,
				winnerPosition: true,
				prizeAmount: true,
				isPaid: true,
				paymentDetails: true,
				feedback: true,
				eligibilityAnswers: true,
				createdAt: true,
				updatedAt: true,
				bounty: { select: { id: true, slug: true, title: true, currency: true } }
			}
		}),
		prisma.creditTransaction.findMany({
			where: { freelancer: { userId } },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				delta: true,
				balanceAfter: true,
				reason: true,
				periodKey: true,
				notes: true,
				bountyId: true,
				submissionId: true,
				createdAt: true
			}
		}),
		prisma.accountWithdrawal.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		}),
		prisma.notification.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		}),
		prisma.notificationPreference.findUnique({
			where: { userId },
			select: { prefs: true, updatedAt: true }
		}),
		prisma.pushSubscription.findMany({
			where: { userId },
			select: { id: true, endpoint: true, userAgent: true, createdAt: true }
		}),
		prisma.dispute.findMany({
			where: { raisedById: userId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				bountyId: true,
				reason: true,
				status: true,
				resolution: true,
				createdAt: true,
				updatedAt: true,
				bounty: { select: { id: true, slug: true, title: true } }
			}
		})
	]);

	if (profile && scope === 'ADMIN') {
		profile.bankDetails = maskBankDetails(profile.bankDetails);
	}

	return {
		user,
		profile,
		submissions,
		creditTransactions,
		withdrawals,
		notifications,
		notificationPreferences: notificationPrefs,
		pushSubscriptions: pushSubs,
		disputes
	};
}

async function loadCompanyExport(userId: string) {
	const [
		user,
		profile,
		bounties,
		payments,
		withdrawals,
		notifications,
		notificationPrefs,
		pushSubs,
		disputes,
		invitesCreated
	] = await Promise.all([
		prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
				emailVerified: true,
				role: true,
				phoneNumber: true,
				isActive: true,
				createdAt: true,
				updatedAt: true
			}
		}),
		prisma.companyProfile.findUnique({
			where: { userId }
		}),
		// Company's own bounties + sponsor-side submission view (includes label, notes, score).
		prisma.bounty.findMany({
			where: { company: { userId } },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				slug: true,
				title: true,
				description: true,
				requirements: true,
				deliverables: true,
				type: true,
				status: true,
				compensationType: true,
				currency: true,
				totalPrizePool: true,
				rewardAmount: true,
				minRewardAsk: true,
				maxRewardAsk: true,
				rewards: true,
				numberOfWinners: true,
				maxBonusSpots: true,
				isWinnersAnnounced: true,
				winnersAnnouncedAt: true,
				eligibility: true,
				submissionDeadline: true,
				judgingDeadline: true,
				publishedAt: true,
				completedAt: true,
				cancelledAt: true,
				escrowFundedAmount: true,
				creditsExempt: true,
				createdAt: true,
				updatedAt: true,
				prizeTiers: {
					select: { id: true, position: true, amount: true, label: true }
				},
				skills: {
					select: {
						isRequired: true,
						skill: { select: { id: true, name: true, slug: true } }
					}
				},
				submissions: {
					orderBy: { createdAt: 'desc' },
					select: {
						id: true,
						link: true,
						tweet: true,
						otherInfo: true,
						status: true,
						label: true,
						notes: true,
						score: true,
						feedback: true,
						ask: true,
						isWinner: true,
						winnerPosition: true,
						prizeAmount: true,
						isPaid: true,
						paymentDetails: true,
						eligibilityAnswers: true,
						createdAt: true,
						freelancerNameSnapshot: true,
						freelancer: {
							select: {
								id: true,
								displayName: true,
								user: { select: { id: true, email: true, name: true } }
							}
						}
					}
				}
			}
		}),
		prisma.payment.findMany({
			where: { bounty: { company: { userId } } },
			orderBy: { createdAt: 'desc' }
		}),
		prisma.accountWithdrawal.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		}),
		prisma.notification.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		}),
		prisma.notificationPreference.findUnique({
			where: { userId },
			select: { prefs: true, updatedAt: true }
		}),
		prisma.pushSubscription.findMany({
			where: { userId },
			select: { id: true, endpoint: true, userAgent: true, createdAt: true }
		}),
		prisma.dispute.findMany({
			where: { bounty: { company: { userId } } },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				bountyId: true,
				reason: true,
				status: true,
				resolution: true,
				createdAt: true,
				raisedBy: { select: { id: true, email: true, name: true } }
			}
		}),
		prisma.companyInvite.findMany({
			where: { invitedById: userId },
			orderBy: { createdAt: 'desc' }
		})
	]);

	return {
		user,
		profile,
		bounties,
		payments,
		withdrawals,
		notifications,
		notificationPreferences: notificationPrefs,
		pushSubscriptions: pushSubs,
		disputes,
		invitesCreated
	};
}

type ExportEnvelope = {
	schemaVersion: 1;
	exportedAt: string;
	scope: ExportScope;
	exportedBy?: string;
	exportedFor: string;
	[key: string]: unknown;
};

async function buildExportZip(
	targetUserId: string,
	role: UserRole,
	scope: ExportScope,
	caller?: AuthedUser
): Promise<{ filename: string; zip: Uint8Array }> {
	const zip = new JSZip();

	const envelope: ExportEnvelope = {
		schemaVersion: 1,
		exportedAt: new Date().toISOString(),
		scope,
		exportedFor: targetUserId
	};
	if (scope === 'ADMIN' && caller) envelope.exportedBy = caller.id;

	if (role === 'FREELANCER') {
		const data = await loadFreelancerExport(targetUserId, scope);
		Object.assign(envelope, data);

		zip.file(
			'submissions.csv',
			toCsv(
				data.submissions.map((s) => ({
					id: s.id,
					bountyId: s.bountyId,
					bountyTitle: s.bounty?.title ?? '',
					bountySlug: s.bounty?.slug ?? '',
					link: s.link,
					status: s.status,
					ask: s.ask,
					isWinner: s.isWinner,
					winnerPosition: s.winnerPosition,
					prizeAmount: s.prizeAmount,
					isPaid: s.isPaid,
					currency: s.bounty?.currency ?? '',
					createdAt: s.createdAt.toISOString()
				}))
			)
		);
		zip.file(
			'credit-transactions.csv',
			toCsv(
				data.creditTransactions.map((c) => ({
					id: c.id,
					delta: c.delta,
					balanceAfter: c.balanceAfter,
					reason: c.reason,
					periodKey: c.periodKey,
					bountyId: c.bountyId ?? '',
					submissionId: c.submissionId ?? '',
					notes: c.notes ?? '',
					createdAt: c.createdAt.toISOString()
				}))
			)
		);
	} else if (role === 'COMPANY') {
		const data = await loadCompanyExport(targetUserId);
		Object.assign(envelope, data);

		zip.file(
			'bounties.csv',
			toCsv(
				data.bounties.map((b) => ({
					id: b.id,
					slug: b.slug,
					title: b.title,
					status: b.status,
					type: b.type,
					currency: b.currency,
					totalPrizePool: b.totalPrizePool,
					escrowFundedAmount: b.escrowFundedAmount,
					numberOfWinners: b.numberOfWinners,
					maxBonusSpots: b.maxBonusSpots,
					submissionDeadline: b.submissionDeadline.toISOString(),
					publishedAt: b.publishedAt?.toISOString() ?? '',
					completedAt: b.completedAt?.toISOString() ?? '',
					cancelledAt: b.cancelledAt?.toISOString() ?? '',
					createdAt: b.createdAt.toISOString()
				}))
			)
		);

		const subRows = data.bounties.flatMap((b) =>
			b.submissions.map((s) => ({
				submissionId: s.id,
				bountyId: b.id,
				bountyTitle: b.title,
				freelancer: s.freelancer?.displayName ?? s.freelancerNameSnapshot ?? '(deleted user)',
				freelancerEmail: s.freelancer?.user?.email ?? '',
				link: s.link,
				status: s.status,
				label: s.label,
				score: s.score ?? '',
				isWinner: s.isWinner,
				winnerPosition: s.winnerPosition ?? '',
				prizeAmount: s.prizeAmount ?? '',
				isPaid: s.isPaid,
				ask: s.ask ?? '',
				notes: s.notes ?? '',
				feedback: s.feedback ?? '',
				createdAt: s.createdAt.toISOString()
			}))
		);
		zip.file('submissions.csv', toCsv(subRows));

		zip.file(
			'payments.csv',
			toCsv(
				data.payments.map((p) => ({
					id: p.id,
					bountyId: p.bountyId,
					submissionId: p.submissionId ?? '',
					type: p.type,
					status: p.status,
					method: p.method,
					amount: p.amount,
					feeAmount: p.feeAmount,
					currency: p.currency,
					monimePaymentId: p.monimePaymentId ?? '',
					monimePayoutId: p.monimePayoutId ?? '',
					failureCode: p.failureCode ?? '',
					createdAt: p.createdAt.toISOString()
				}))
			)
		);
	} else {
		// ADMIN — minimal export of just the user row + activity. Admin export of
		// another admin is unusual but should still produce something.
		const user = await prisma.user.findUnique({ where: { id: targetUserId } });
		Object.assign(envelope, { user });
	}

	zip.file(
		'README.txt',
		[
			'Future of Work — personal data export',
			'',
			`Exported at: ${envelope.exportedAt}`,
			`User ID: ${targetUserId}`,
			`Role: ${role}`,
			`Scope: ${scope === 'ADMIN' ? 'Admin-initiated' : 'Self-serve'}`,
			'',
			'Contents:',
			'  data.json            — full machine-readable export',
			role === 'FREELANCER'
				? '  submissions.csv      — your submissions\n  credit-transactions.csv — your credit ledger'
				: role === 'COMPANY'
					? '  bounties.csv         — your bounties\n  submissions.csv      — submissions to your bounties\n  payments.csv         — escrow + payout history'
					: '',
			'',
			'Sensitive data: bank account details are present in your own export;',
			'admin-initiated exports mask all but the last 4 characters.',
			'',
			'Questions? Contact: support@fow.sl'
		]
			.filter(Boolean)
			.join('\n')
	);

	zip.file('data.json', JSON.stringify(envelope, null, 2));

	const bytes = await zip.generateAsync({ type: 'uint8array' });
	const stamp = new Date().toISOString().slice(0, 10);
	return {
		filename: `fow-export-${targetUserId}-${stamp}.zip`,
		zip: bytes
	};
}

export async function exportMyData(user: AuthedUser) {
	return buildExportZip(user.id, user.role, 'SELF');
}

export async function adminExportUserData(caller: AuthedUser, userId: string) {
	requireRole(caller, 'ADMIN');
	const target = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, role: true }
	});
	if (!target) throw new AppError('NOT_FOUND', 'User not found.');
	return buildExportZip(target.id, target.role, 'ADMIN', caller);
}
