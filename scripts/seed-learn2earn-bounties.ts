/**
 * Seed the Learn2Earn Cohort 2 — Week 1 bounties.
 *
 *   tsx scripts/seed-learn2earn-bounties.ts
 *
 * Source brief: Learn2Earn_Cohort2_Bounties_Week1.md
 * Idempotent — upserts by slug, so re-running updates nothing destructive.
 *
 * Created directly as ACTIVE (no Monime escrow) so they're visible on the
 * public board immediately, mirroring scripts/dev-bounties.ts. All three are
 * type=BOUNTY, FIXED compensation, 5 ranked winners, currency SLE. Amounts are
 * minor units (Le × 100).
 */
import 'dotenv/config';
import { BountyStatus, BountyType, CompensationType, type Prisma } from '@prisma/client';
import { prisma } from '../src/lib/server/db';
import { sanitizeRichText } from '../src/lib/server/sanitize';

const SLE = 100; // minor units per Leone

// Monday 6 July 2026, end of day (Sierra Leone = GMT/UTC).
const SUBMISSION_DEADLINE = new Date('2026-07-06T23:59:59Z');

type Tier = { position: number; amount: number; label: string };
type EligibilityQ = { question: string; optional: boolean };

type BountyDef = {
	slug: string;
	title: string;
	description: string;
	requirements: string;
	deliverables: string;
	tiersLe: number[]; // [1st..5th] in Leones
	eligibility: EligibilityQ[];
};

const TIER_LABELS = ['1st place', '2nd place', '3rd place', '4th place', '5th place'];

function tiers(amountsLe: number[]): Tier[] {
	return amountsLe.map((le, i) => ({
		position: i + 1,
		amount: le * SLE,
		label: TIER_LABELS[i]
	}));
}

const BOUNTIES: BountyDef[] = [
	{
		slug: 'l2e-c2-w1-professional-presence',
		title: 'Build Your Professional Presence',
		description: `<p><strong>Week 1 | Theme: Foundations and Platform Readiness</strong></p>
<p>Before anyone wins a single job online, a client has to take them seriously. That starts with how you present yourself. This bounty is about setting up a profile and a professional identity that a real client would trust enough to hire. It ties directly into the Week 1 sessions on building a digital identity and completing your Bounty platform profile.</p>`,
		requirements: `<p><strong>What you need to do</strong></p>
<ul>
<li>Complete your profile on the Bounty platform in full. This means a clear profile photo, a proper bio, your skills listed accurately, and a value proposition that tells a client exactly what you do and who you help.</li>
<li>Answer the short questions in your submission, in your own words (see the questions on the submission form).</li>
<li>Share the link to your completed Bounty platform profile, and your LinkedIn profile if you have one.</li>
</ul>
<p><strong>What we are looking for</strong></p>
<ul>
<li>A profile that is complete and looks ready for a real client.</li>
<li>A bio and value proposition that are clear and specific, not vague.</li>
<li>Skills that match what you actually do.</li>
<li>Thoughtful, honest answers to the questions.</li>
</ul>`,
		deliverables: `<p><strong>How to submit</strong></p>
<p>Submit your written answers and your profile link on the Bounty platform before the deadline. Include your LinkedIn profile link if you have one.</p>
<p>Winners will be announced during the Week 1 physical session.</p>`,
		tiersLe: [282, 235, 188, 141, 94],
		eligibility: [
			{
				question: 'What is your main skill, and who specifically would pay you for it?',
				optional: false
			},
			{
				question: 'Write your one-line value proposition (one sentence that sells what you do).',
				optional: false
			},
			{
				question:
					'When a client cannot see your face or meet you in person, what does being professional look like to you?',
				optional: false
			}
		]
	},
	{
		slug: 'l2e-c2-w1-deliver-real-work',
		title: 'Deliver Real Work',
		description: `<p><strong>Week 1 | Theme: Applications and Practical Execution</strong></p>
<p>This is the heart of the program. Getting hired is one thing. Delivering work that makes a client want to come back is another. This bounty asks you to complete an actual piece of work in your own field and handle it the way a professional freelancer would, including how you communicate when you deliver it. It connects to the Week 1 sessions on finding opportunities, communication, and professional delivery.</p>`,
		requirements: `<p><strong>What you need to do</strong></p>
<p>Choose a task that matches your skill. You can pick one from the sample list below, or propose your own if your niche is not covered. The goal is to produce one finished piece of work that you would be comfortable handing to a paying client.</p>
<p><strong>Sample tasks by area:</strong></p>
<ul>
<li>Design: a set of three matching social media graphics on a topic of your choice.</li>
<li>Web and tech: a simple one-page website or landing page.</li>
<li>Virtual assistance and admin: an organised tracker or spreadsheet for a real task, such as event planning or inventory.</li>
<li>Video and content: a short edited video, a written article, or a social media post carousel.</li>
<li>Other niches: propose your own task that shows your skill at a client-ready level.</li>
</ul>
<p>Along with your finished work, include a short written message to your "client", the way you would write it when delivering the work in real life. This shows you can communicate professionally, not just do the task.</p>
<p><strong>What we are looking for</strong></p>
<ul>
<li>Quality of the finished work. Is it something a client would actually pay for?</li>
<li>Accuracy and attention to detail. Did you follow the brief you set yourself?</li>
<li>Professional communication. Is your delivery message clear, polite, and confident?</li>
<li>Completeness. Did you finish the work and meet the deadline?</li>
</ul>`,
		deliverables: `<p><strong>How to submit</strong></p>
<p>Submit your finished work, either as a file or a link, along with your written delivery message, on the Bounty platform before the deadline. Submissions will be judged fairly within skill areas where possible.</p>
<p>Winners will be announced during the Week 1 physical session.</p>`,
		tiersLe: [587, 470, 423, 352, 282],
		eligibility: []
	},
	{
		slug: 'l2e-c2-w1-tell-your-story',
		title: 'Tell Your Story',
		description: `<p><strong>Week 1 | Theme: Performance, Growth and Graduation</strong></p>
<p>By the final week, you will have learned the platform, completed real work, and pushed through the hard parts. This bounty is about looking back at that journey, owning your growth, and sharing it publicly. It ties into the Week 1 sessions on consistency, resilience, and the graduation showcase, as well as the #MyLearn2EarnJourney social media campaign.</p>`,
		requirements: `<p><strong>What you need to do</strong></p>
<ul>
<li>Write a short reflection covering: what you learned during the program, what skill you improved the most, the biggest challenge you faced and how you handled it, and your plan for the next three months as a freelancer.</li>
<li>Create and publish a post on Facebook or LinkedIn under the hashtag #MyLearn2EarnJourney, sharing something real from your experience in the program. Tag MoCTI, UNICEF, Ready Salone/ITC, and the Bounty Platform.</li>
<li>Submit the link to your published post along with your written reflection.</li>
</ul>
<p><strong>What we are looking for</strong></p>
<ul>
<li>Honesty and depth in your reflection. Real growth, not generic statements.</li>
<li>A clear plan for what you will do after the program ends.</li>
<li>A public post that is genuine and well written.</li>
<li>Professionalism and integrity throughout.</li>
</ul>`,
		deliverables: `<p><strong>How to submit</strong></p>
<p>Submit your written reflection and the link to your social media post on the Bounty platform before the deadline.</p>
<p>Winners will be recognised during the graduation and awards ceremony.</p>`,
		tiersLe: [470, 376, 329, 282, 188],
		eligibility: []
	}
];

async function resolveCompanyProfileId(): Promise<string> {
	const user = await prisma.user.findUnique({
		where: { email: 'learn2earn@gmail.com' },
		select: { id: true }
	});
	if (!user) throw new Error('Learn2Earn user (learn2earn@gmail.com) not found.');
	const profile = await prisma.companyProfile.findUnique({
		where: { userId: user.id },
		select: { id: true }
	});
	if (!profile) throw new Error('Learn2Earn company profile not found.');
	return profile.id;
}

async function main() {
	const companyProfileId = await resolveCompanyProfileId();
	console.log(`Company: Learn2Earn (${companyProfileId})\n`);

	for (const def of BOUNTIES) {
		const tierRows = tiers(def.tiersLe);
		const totalPrizePool = tierRows.reduce((sum, t) => sum + t.amount, 0);

		const createData: Prisma.BountyCreateInput = {
			company: { connect: { id: companyProfileId } },
			companyNameSnapshot: 'Learn2Earn',
			title: def.title,
			slug: def.slug,
			type: BountyType.BOUNTY,
			status: BountyStatus.ACTIVE,
			compensationType: CompensationType.FIXED,
			currency: 'SLE',
			totalPrizePool,
			numberOfWinners: 5,
			maxBonusSpots: 0,
			submissionDeadline: SUBMISSION_DEADLINE,
			publishedAt: new Date(),
			description: sanitizeRichText(def.description),
			requirements: sanitizeRichText(def.requirements),
			deliverables: sanitizeRichText(def.deliverables),
			eligibility: def.eligibility as unknown as Prisma.InputJsonValue,
			prizeTiers: { create: tierRows }
		};

		const bounty = await prisma.bounty.upsert({
			where: { slug: def.slug },
			update: {},
			create: createData,
			select: { id: true, title: true, status: true, totalPrizePool: true }
		});

		console.log(
			`✓ ${bounty.status}  ${bounty.title} — pool SLE ${(bounty.totalPrizePool / 100).toLocaleString()} (${bounty.id})`
		);
	}

	console.log('\nDone — 3 Learn2Earn Week 1 bounties live.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
