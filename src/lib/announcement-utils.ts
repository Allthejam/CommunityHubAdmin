import { type Announcement } from './announcement-data';

/**
 * Precision Audience Filtering (Universal Object Structure)
 * Implements Strict Exclusive Hierarchy:
 * 1. If communities are targeted, ONLY those hub members see it.
 * 2. If no communities but regions are targeted, only those region members see it.
 * 3. This prevents "leakage" across broad geographic ancestors.
 */
export function filterAnnouncementsForUser(announcements: Announcement[], profile: any) {
  if (!profile) return [];
  
  return announcements.filter(ann => {
    let aud = ann.audience;
    
    // Handle the database array-of-map structure: [{ communities: [], regions: [] }]
    if (Array.isArray(aud) && aud.length > 0 && typeof aud[0] === 'object' && !Array.isArray(aud[0])) {
        aud = aud[0];
    }
    
    // Safety check: skip if audience structure is malformed
    if (!aud || typeof aud !== 'object') return false;

    // 1. Global Targeting
    if (aud.type === 'all') return true;
    
    // 2. Role Targeting
    if (aud.type === 'roles' && aud.roles) {
      return aud.roles.includes(profile.role) || aud.roles.includes(profile.accountType);
    }
    
    // 3. Geographic Targeting (Strict Exclusive Hierarchy - Bottom-Up)
    if (aud.type === 'location') {
      const { countries = [], states = [], regions = [], communities = [] } = aud;

      // Hub Match: Community level is the highest precision
      if (communities && communities.length > 0) {
        return communities.includes(profile.homeCommunityId) || communities.includes(profile.communityId);
      }
      
      // Region Match: Only check if no communities were targeted
      if (regions && regions.length > 0) {
        return regions.includes(profile.region) || regions.includes(profile.regionId);
      }
      
      // State Match: Only check if no regions or communities were targeted
      if (states && states.length > 0) {
        return states.includes(profile.state) || states.includes(profile.stateId);
      }
      
      // Country Match: Broadest level
      if (countries && countries.length > 0) {
        return countries.includes(profile.country) || countries.includes(profile.countryId);
      }
    }
    
    return false;
  });
}
