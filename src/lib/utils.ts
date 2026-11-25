import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detects whether a user record is a demo, mock, or test account (Demo Resident, Demo Community Leader, etc.).
 */
export function isDemoUser(u: any): boolean {
  if (!u) return false;
  if (u.isDemo) return true;

  const name = (u.name || '').trim().toLowerCase();
  const email = (u.email || '').trim().toLowerCase();

  // Exclude demo resident, demo community leader, and test accounts by name
  if (
    name === 'demo' ||
    name.startsWith('demo ') ||
    name.includes('demo resident') ||
    name.includes('demo community')
  ) {
    return true;
  }

  // Exclude demo email accounts
  if (
    email.includes('demo@communityhub.app') ||
    email.includes('leader-demo') ||
    email.includes('personal-demo') ||
    email.startsWith('demo@') ||
    email.endsWith('@communityhub.app')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates whether a user document represents a genuine, active platform member,
 * filtering out ghost records (missing name/email), demo accounts (Demo Resident, etc.),
 * and non-active statuses.
 */
export function isActualMember(u: any): boolean {
  if (!u) return false;
  const name = (u.name || '').trim();
  const email = (u.email || '').trim().toLowerCase();

  // Exclude ghost documents without name and email
  if (!name && !email) return false;

  // Exclude demo accounts
  if (isDemoUser(u)) return false;

  // Exclude non-active accounts (must have status === 'active')
  if (u.status && u.status !== 'active') return false;
  if (!u.status) return false;

  return true;
}

