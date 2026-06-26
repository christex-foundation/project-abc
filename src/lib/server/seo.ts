import sanitizeHtml from 'sanitize-html';
import type { BountyForFreelancer } from './repositories/bounty.repo';

/**
 * Strip all HTML tags down to plain text. Used to derive meta-description
 * strings from sanitised rich text. Same `sanitize-html` library as the write
 * boundary so we keep one allowlist surface.
 */
export function stripHtml(html: string | null | undefined, maxLength = 160): string {
	if (!html) return '';
	const plain = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
		.replace(/\s+/g, ' ')
		.trim();
	if (plain.length <= maxLength) return plain;
	return plain.slice(0, maxLength - 1).trimEnd() + '…';
}

type PersonLdInput = {
	displayName: string;
	headline: string | null;
	bio: string | null;
	photo: string | null;
	skills: { name: string }[];
};

/** Schema.org Person JSON-LD for a freelancer's public profile. */
export function buildPersonJsonLd(p: PersonLdInput, url: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: p.displayName,
		url,
		...(p.headline ? { jobTitle: p.headline } : {}),
		...(p.bio ? { description: stripHtml(p.bio, 500) } : {}),
		...(p.photo ? { image: p.photo } : {}),
		...(p.skills.length ? { knowsAbout: p.skills.map((s) => s.name) } : {})
	};
}

type OrganizationLdInput = {
	companyName: string;
	description: string | null;
	website: string | null;
	logo: string | null;
};

/** Schema.org Organization JSON-LD for a company's public profile. */
export function buildOrganizationJsonLd(p: OrganizationLdInput, url: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: p.companyName,
		url,
		...(p.description ? { description: stripHtml(p.description, 500) } : {}),
		...(p.logo ? { logo: p.logo } : {}),
		...(p.website ? { sameAs: [p.website] } : {})
	};
}

/**
 * Build Schema.org JobPosting JSON-LD for a bounty detail page. Monetary
 * values are reported in major units per Schema.org convention; the database
 * stores minor units, hence the divide-by-100.
 */
export function buildBountyJsonLd(bounty: BountyForFreelancer, originUrl: string) {
	const description = stripHtml(bounty.description, 5000) || bounty.title;
	const url = `${originUrl.replace(/\/$/, '')}/bounties/${bounty.slug}`;

	return {
		'@context': 'https://schema.org',
		'@type': 'JobPosting',
		title: bounty.title,
		description,
		datePosted: (bounty.publishedAt ?? bounty.createdAt).toISOString(),
		validThrough: bounty.submissionDeadline.toISOString(),
		employmentType: 'CONTRACTOR',
		hiringOrganization: {
			'@type': 'Organization',
			name: bounty.company?.companyName ?? bounty.companyNameSnapshot ?? 'Anonymous',
			...(bounty.company?.website ? { sameAs: bounty.company.website } : {}),
			...(bounty.company?.logo ? { logo: bounty.company.logo } : {})
		},
		jobLocation: {
			'@type': 'Place',
			address: { '@type': 'PostalAddress', addressCountry: bounty.company?.country ?? 'SL' }
		},
		baseSalary: {
			'@type': 'MonetaryAmount',
			currency: bounty.currency,
			value: {
				'@type': 'QuantitativeValue',
				value: bounty.totalPrizePool / 100,
				unitText: 'TOTAL'
			}
		},
		url
	};
}
