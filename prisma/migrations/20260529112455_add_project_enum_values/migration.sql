-- Add new values to existing enums in their own migration.
-- PostgreSQL forbids using a newly added enum value in the same transaction that
-- adds it, so these ALTER TYPE ... ADD VALUE statements must commit before the
-- project_domain migration references 'PROPOSAL_SPEND' in a partial index.

-- AlterEnum
ALTER TYPE "CreditTxnReason" ADD VALUE 'PROPOSAL_SPEND';

-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'MILESTONE_PAYOUT';
