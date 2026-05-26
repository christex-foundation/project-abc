import sanitizeHtml from 'sanitize-html';

/**
 * Server-side rich text sanitiser. This is the **only** trust boundary for
 * HTML content stored in the database. Every rich-text write — bounty
 * description / requirements / deliverables, submission otherInfo / feedback —
 * must pass through this function before persistence.
 *
 * Allowlist intentionally narrow: no inline styles, no scripts, no iframes,
 * no on-handlers, no data URIs. Links forced to noopener noreferrer.
 */
export function sanitizeRichText(input: string | null | undefined): string {
	if (!input) return '';

	return sanitizeHtml(input, {
		allowedTags: [
			'p',
			'br',
			'strong',
			'em',
			'u',
			'code',
			'pre',
			'blockquote',
			'h2',
			'h3',
			'h4',
			'ul',
			'ol',
			'li',
			'a'
		],
		allowedAttributes: {
			a: ['href', 'title']
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		disallowedTagsMode: 'discard',
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
		}
	});
}
