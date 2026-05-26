import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export const fromAddress = process.env.RESEND_FROM ?? 'FOW <noreply@fow.sl>';
