import type { SubmitFunction } from '@sveltejs/kit';

/**
 * Tracks an in-flight `use:enhance` submission so the submit button can be
 * disabled while the action runs. Disabling the submit button is what blocks
 * the browser's implicit Enter-to-submit too, so a single `disabled={…}` on
 * the submit button is the only defense needed.
 *
 *   let submitting = $state(false);
 *   <form use:enhance={trackSubmit((v) => (submitting = v))}>
 *     <button disabled={submitting}>Create account</button>
 *   </form>
 *
 * For multi-row pages, pair with a SvelteSet keyed by row+action:
 *
 *   const busy = new SvelteSet<string>();
 *   const submitFor = (k: string) =>
 *     trackSubmit((v) => (v ? busy.add(k) : busy.delete(k)));
 */
export function trackSubmit(setSubmitting: (v: boolean) => void): SubmitFunction {
	return () => {
		setSubmitting(true);
		return async ({ update }) => {
			await update();
			setSubmitting(false);
		};
	};
}
