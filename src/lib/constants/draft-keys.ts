// localStorage draft keys used by useLocalDraft (which prepends `fow:draft:`).
// Centralised so the AI decider and the create pages can never silently diverge.
export const DRAFT_KEYS = {
	bountyCreate: 'bounty-create-wizard-v3',
	projectCreate: 'project-create-form'
} as const;

// Fully-prefixed keys, for callers that write to localStorage directly (the AI
// decider does not go through useLocalDraft).
export const DRAFT_STORAGE_KEYS = {
	bountyCreate: `fow:draft:${DRAFT_KEYS.bountyCreate}`,
	projectCreate: `fow:draft:${DRAFT_KEYS.projectCreate}`
} as const;
