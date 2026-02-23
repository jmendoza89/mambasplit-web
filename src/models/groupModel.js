export function findSelectedGroup(groups, selectedGroupId) {
  return groups.find((group) => group.id === selectedGroupId) || null;
}

export function selectDisplayedGroup(selectedGroupId, selectedGroup, groupDetail) {
  if (groupDetail && (groupDetail.group?.id === selectedGroupId || groupDetail.id === selectedGroupId)) {
    return groupDetail;
  }
  return selectedGroup;
}

export function isValidGroupName(value) {
  return typeof value === "string" && value.trim().length > 0;
}
