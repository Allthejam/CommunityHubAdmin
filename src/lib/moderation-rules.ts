/**
 * Shared moderation rules and high-risk terms.
 * This file is shared between client and server to ensure consistency.
 */

// High-risk terms that trigger critical priority flags automatically
export const CRITICAL_TERMS = [
  'guns', 
  'drugs', 
  'weapons', 
  'narcotics', 
  'firearms', 
  'heroin', 
  'cocaine', 
  'meth', 
  'ammunition', 
  'bomb', 
  'explosives'
];
