import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as userRepo from '../repositories/user.repo';
import * as bountyRepo from '../repositories/bounty.repo';
import { prisma } from '../db';
import { adminUpdateUserInput } from '$lib/validators/admin-user';

export async function listUsers(
	caller: AuthedUser,
	filter: Parameters<typeof userRepo.listForAdmin>[0] = {}
) {
	requireRole(caller, 'ADMIN');
	return userRepo.listForAdmin(filter);
}

export async function updateUser(caller: AuthedUser, userId: string, raw: unknown) {
	requireRole(caller, 'ADMIN');
	const parsed = adminUpdateUserInput.parse(raw);
	const target = await userRepo.findById(userId);
	if (!target) throw new AppError('NOT_FOUND', 'User not found.');

	if (parsed.role !== undefined && parsed.role !== target.role) {
		if (target.id === caller.id) {
			throw new AppError('CONFLICT', 'You cannot change your own role.');
		}
		await userRepo.setRole(userId, parsed.role);
	}
	if (parsed.isActive !== undefined && parsed.isActive !== target.isActive) {
		if (target.id === caller.id) {
			throw new AppError('CONFLICT', 'You cannot deactivate your own account.');
		}
		await userRepo.setActive(userId, parsed.isActive);
	}

	return userRepo.findById(userId);
}

export async function setBountyCreditsExempt(
	caller: AuthedUser,
	bountyId: string,
	creditsExempt: boolean
) {
	requireRole(caller, 'ADMIN');
	const bounty = await bountyRepo.findBountyById(bountyId);
	if (!bounty) throw new AppError('NOT_FOUND', 'Bounty not found.');
	return bountyRepo.setCreditsExempt(bountyId, creditsExempt);
}

export async function listAdmins(caller: AuthedUser) {
	requireRole(caller, 'ADMIN');
	return userRepo.listForAdmin({ role: 'ADMIN' });
}

export async function getUserDetail(caller: AuthedUser, userId: string) {
	requireRole(caller, 'ADMIN');
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			name: true,
			image: true,
			role: true,
			isActive: true,
			emailVerified: true,
			phoneNumber: true,
			referralCode: true,
			createdAt: true
		}
	});
	if (!user) throw new AppError('NOT_FOUND', 'User not found.');

	if (user.role === 'FREELANCER') {
		const profile = await prisma.freelancerProfile.findUnique({
			where: { userId },
			select: {
				id: true,
				displayName: true,
				headline: true,
				bio: true,
				portfolio: true,
				experienceLevel: true,
				whatsappNumber: true,
				creditsBalance: true,
				creditsPeriodKey: true,
				createdAt: true,
				skills: {
					select: {
						proficiencyLevel: true,
						yearsExperience: true,
						skill: { select: { id: true, name: true } }
					}
				}
			}
		});

		const [submissions, credits, referrals, disputes] = profile
			? await Promise.all([
					prisma.submission.findMany({
						where: { freelancerProfileId: profile.id, isActive: true },
						orderBy: { createdAt: 'desc' },
						take: 50,
						select: {
							id: true,
							link: true,
							status: true,
							label: true,
							isWinner: true,
							winnerPosition: true,
							prizeAmount: true,
							isPaid: true,
							createdAt: true,
							bounty: { select: { id: true, slug: true, title: true, currency: true } }
						}
					}),
					prisma.creditTransaction.findMany({
						where: { freelancerProfileId: profile.id },
						orderBy: { createdAt: 'desc' },
						take: 50,
						select: {
							id: true,
							delta: true,
							balanceAfter: true,
							reason: true,
							createdAt: true,
							adminUser: { select: { email: true } }
						}
					}),
					prisma.freelancerProfile.findMany({
						where: { referrerProfileId: profile.id },
						select: {
							id: true,
							displayName: true,
							user: { select: { id: true, email: true, createdAt: true } }
						},
						orderBy: { createdAt: 'desc' }
					}),
					prisma.dispute.findMany({
						where: { raisedById: userId },
						orderBy: { createdAt: 'desc' },
						take: 20,
						select: {
							id: true,
							status: true,
							reason: true,
							createdAt: true,
							bounty: { select: { id: true, slug: true, title: true } }
						}
					})
				])
			: [[], [], [], []];

		return {
			kind: 'FREELANCER' as const,
			user,
			profile,
			submissions,
			credits,
			referrals,
			disputes
		};
	}

	if (user.role === 'COMPANY') {
		const profile = await prisma.companyProfile.findUnique({
			where: { userId },
			select: {
				id: true,
				companyName: true,
				description: true,
				website: true,
				logo: true,
				industry: true,
				country: true,
				verified: true,
				monimeFinancialAccountId: true,
				createdAt: true
			}
		});

		const [bounties, payments, disputes] = profile
			? await Promise.all([
					prisma.bounty.findMany({
						where: { companyProfileId: profile.id },
						orderBy: { createdAt: 'desc' },
						take: 50,
						select: {
							id: true,
							slug: true,
							title: true,
							status: true,
							type: true,
							totalPrizePool: true,
							currency: true,
							createdAt: true,
							_count: { select: { submissions: true } }
						}
					}),
					prisma.payment.findMany({
						where: { bounty: { companyProfileId: profile.id } },
						orderBy: { createdAt: 'desc' },
						take: 50,
						select: {
							id: true,
							type: true,
							status: true,
							amount: true,
							currency: true,
							createdAt: true,
							bounty: { select: { id: true, title: true, slug: true } }
						}
					}),
					prisma.dispute.findMany({
						where: { bounty: { companyProfileId: profile.id } },
						orderBy: { createdAt: 'desc' },
						take: 20,
						select: {
							id: true,
							status: true,
							reason: true,
							createdAt: true,
							raisedBy: { select: { id: true, name: true, email: true, role: true } },
							bounty: { select: { id: true, slug: true, title: true } }
						}
					})
				])
			: [[], [], []];

		return {
			kind: 'COMPANY' as const,
			user,
			profile,
			bounties,
			payments,
			disputes
		};
	}

	// ADMIN
	return { kind: 'ADMIN' as const, user };
}

export async function getBountyDetail(caller: AuthedUser, bountyId: string) {
	requireRole(caller, 'ADMIN');
	const bounty = await bountyRepo.findBountyById(bountyId);
	if (!bounty) throw new AppError('NOT_FOUND', 'Bounty not found.');

	const [submissions, payments, disputes] = await Promise.all([
		prisma.submission.findMany({
			where: { bountyId, isActive: true },
			orderBy: [{ isWinner: 'desc' }, { winnerPosition: 'asc' }, { createdAt: 'desc' }],
			select: {
				id: true,
				link: true,
				status: true,
				label: true,
				isWinner: true,
				winnerPosition: true,
				prizeAmount: true,
				isPaid: true,
				createdAt: true,
				freelancer: {
					select: {
						id: true,
						displayName: true,
						user: { select: { id: true, email: true } }
					}
				}
			}
		}),
		prisma.payment.findMany({
			where: { bountyId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				type: true,
				status: true,
				amount: true,
				currency: true,
				method: true,
				retryCount: true,
				toEntity: true,
				createdAt: true,
				submission: {
					select: {
						id: true,
						freelancer: { select: { displayName: true } }
					}
				}
			}
		}),
		prisma.dispute.findMany({
			where: { bountyId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				reason: true,
				status: true,
				resolution: true,
				createdAt: true,
				raisedBy: { select: { id: true, name: true, email: true, role: true } }
			}
		})
	]);

	return { bounty, submissions, payments, disputes };
}

export async function getDashboardStats(caller: AuthedUser) {
	requireRole(caller, 'ADMIN');

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const [
		totalFreelancers,
		totalCompanies,
		totalAdmins,
		bountiesByStatus,
		paymentVolumeRows,
		failedPayments,
		openDisputes,
		pendingInvites,
		recentBounties,
		recentSignups
	] = await Promise.all([
		prisma.user.count({ where: { role: 'FREELANCER' } }),
		prisma.user.count({ where: { role: 'COMPANY' } }),
		prisma.user.count({ where: { role: 'ADMIN' } }),
		prisma.bounty.groupBy({ by: ['status'], _count: { _all: true } }),
		prisma.payment.findMany({
			where: { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
			select: { amount: true, currency: true, type: true }
		}),
		prisma.payment.count({ where: { status: 'FAILED' } }),
		prisma.dispute.count({ where: { status: 'OPEN' } }),
		prisma.companyInvite.count({ where: { status: 'PENDING' } }),
		prisma.bounty.findMany({
			orderBy: { createdAt: 'desc' },
			take: 8,
			select: {
				id: true,
				slug: true,
				title: true,
				status: true,
				type: true,
				createdAt: true,
				company: { select: { companyName: true } }
			}
		}),
		prisma.user.findMany({
			orderBy: { createdAt: 'desc' },
			take: 8,
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
				isActive: true
			}
		})
	]);

	const statusCounts: Record<string, number> = {};
	for (const row of bountiesByStatus) statusCounts[row.status] = row._count._all;

	let payoutVolume = 0;
	let escrowVolume = 0;
	for (const p of paymentVolumeRows) {
		if (p.type === 'PRIZE_PAYOUT') payoutVolume += p.amount;
		else if (p.type === 'ESCROW_DEPOSIT') escrowVolume += p.amount;
	}

	return {
		users: { freelancers: totalFreelancers, companies: totalCompanies, admins: totalAdmins },
		bounties: {
			draft: statusCounts.DRAFT ?? 0,
			funded: statusCounts.FUNDED ?? 0,
			active: statusCounts.ACTIVE ?? 0,
			judging: statusCounts.JUDGING ?? 0,
			completed: statusCounts.COMPLETED ?? 0,
			cancelled: statusCounts.CANCELLED ?? 0
		},
		payments: { payoutVolume, escrowVolume, failedPayments },
		ops: { openDisputes, pendingInvites },
		recentBounties,
		recentSignups
	};
}
