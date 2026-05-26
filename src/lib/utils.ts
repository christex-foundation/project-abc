import { clsx, type ClassValue } from 'clsx';

/**
 * Class-name combiner. Matches the helper shadcn-svelte's generated components
 * import from `$lib/utils` — defined now so future shadcn `add` calls drop in
 * without modification.
 */
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}
