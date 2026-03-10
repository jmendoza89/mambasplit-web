/**
 * Determines if a user is the owner of a group.
 * Checks multiple sources in order of precedence:
 * 1. Explicit ownership flag or cached ownership map
 * 2. Role-based checks (OWNER role)
 * 3. User ID comparison with creator/owner IDs
 * 4. Email comparison with creator/owner emails (fallback)
 *
 * @param {Object} group - The group object to check
 * @param {string} currentUserId - The current user's ID
 * @param {string} currentUserEmail - The current user's email
 * @param {Object} ownershipMap - Optional cached ownership lookup {[groupId]: boolean}
 * @returns {boolean} - True if the user is the owner, false otherwise
 */
export function isGroupOwner(group, currentUserId, currentUserEmail, ownershipMap = {}) {
  if (!group) return false;

  // Priority 1: Check cached ownership map
  if (group.id && ownershipMap[group.id] !== undefined) {
    return ownershipMap[group.id];
  }

  // Priority 2: Check explicit ownership flags
  if (group.isOwner === true || group.owner === true) {
    return true;
  }

  // Priority 3: Check role-based ownership
  const roleCandidates = [
    group.role,
    group.userRole,
    group.myRole,
    group.me?.role,
    group.membership?.role
  ];
  
  if (roleCandidates.some((role) => String(role || "").trim().toUpperCase() === "OWNER")) {
    return true;
  }

  // Priority 4: Check user ID matches (most reliable)
  const currentIdNormalized = String(currentUserId || "").trim().toLowerCase();
  if (currentIdNormalized) {
    const ownerIdCandidates = [
      group.createdBy,
      group.createdById,
      group.createdByUserId,
      group.ownerId,
      group.ownerUserId,
      group.owner?.id,
      group.createdBy?.id
    ];
    
    if (ownerIdCandidates.some((ownerId) => 
      String(ownerId || "").trim().toLowerCase() === currentIdNormalized
    )) {
      return true;
    }
  }

  // Priority 5: Check email matches (fallback)
  const currentEmailNormalized = String(currentUserEmail || "").trim().toLowerCase();
  if (currentEmailNormalized && currentEmailNormalized !== "-") {
    const ownerEmailCandidates = [
      group.createdByEmail,
      group.ownerEmail,
      group.owner?.email,
      group.createdBy?.email
    ];
    
    if (ownerEmailCandidates.some((ownerEmail) => 
      String(ownerEmail || "").trim().toLowerCase() === currentEmailNormalized
    )) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts ownership status from a group detail response.
 * Used to populate the ownership cache.
 *
 * @param {Object} detail - Group detail response from API
 * @param {string} currentUserId - The current user's ID
 * @returns {boolean|null} - True if owner, false if not, null if indeterminate
 */
export function extractOwnershipFromDetail(detail, currentUserId) {
  if (!detail) return null;

  // Check role first
  const roleCandidates = [
    detail.me?.role,
    detail.role,
    detail.myRole,
    detail.membership?.role
  ];
  
  if (roleCandidates.some((role) => String(role || "").trim().toUpperCase() === "OWNER")) {
    return true;
  }

  // Check creator ID
  const currentIdNormalized = String(currentUserId || "").trim().toLowerCase();
  if (currentIdNormalized) {
    const ownerIdCandidates = [
      detail.group?.createdBy,
      detail.groupInfo?.createdBy,
      detail.createdBy,
      detail.ownerId,
      detail.owner?.id
    ];
    
    if (ownerIdCandidates.some((ownerId) => 
      String(ownerId || "").trim().toLowerCase() === currentIdNormalized
    )) {
      return true;
    }
  }

  // If we found role or owner info but didn't match, return false
  const hasRoleInfo = roleCandidates.some((role) => String(role || "").trim().length > 0);
  const hasOwnerInfo = currentIdNormalized && [
    detail.group?.createdBy,
    detail.groupInfo?.createdBy,
    detail.createdBy,
    detail.ownerId,
    detail.owner?.id
  ].some((ownerId) => String(ownerId || "").trim().length > 0);

  if (hasRoleInfo || hasOwnerInfo) {
    return false;
  }

  // Indeterminate - not enough info
  return null;
}
