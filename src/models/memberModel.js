export function normalizeMembers(group) {
  if (!group) return [];
  const rawMembers = group.members || group.participants || group.users || [];

  return rawMembers.map((member, index) => {
    if (typeof member === "string") {
      return {
        id: `member-${index}`,
        name: member,
        email: ""
      };
    }

    return {
      id: member.id || member.userId || `member-${index}`,
      name: member.displayName || member.name || member.email || "Unnamed member",
      email: member.email || "",
      role: member.role || "",
      joinedAt: member.joinedAt || null,
      netBalanceCents: typeof member.netBalanceCents === "number" ? member.netBalanceCents : null
    };
  });
}
