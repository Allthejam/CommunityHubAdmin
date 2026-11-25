import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

  // Exclude explicit demo flags
  if (u.isDemo) return false;

  // Exclude demo resident, demo community leader, and test accounts by name
  const lowerName = name.toLowerCase();
  if (
    lowerName === 'demo' ||
    lowerName.startsWith('demo ') ||
    lowerName.includes('demo resident') ||
    lowerName.includes('demo community')
  ) {
    return false;
  }

  // Exclude demo email accounts
  if (
    email.includes('demo@communityhub.app') ||
    email.includes('leader-demo') ||
    email.includes('personal-demo') ||
    email.startsWith('demo@') ||
    email.endsWith('@communityhub.app')
  ) {
    return false;
  }

  // Exclude non-active accounts (must have status === 'active')
  if (u.status && u.status !== 'active') return false;
  if (!u.status) return false;

  return true;
}

