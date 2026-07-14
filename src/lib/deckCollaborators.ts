export type Collaborator = {
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
};

export type ValidationResult = {
  ok: boolean;
  errorKey?: string;
};

/**
 * Validate collaborator invitation logic
 */
export function validateCollaboratorInvitation(
  targetUserId: string,
  collaborators: Collaborator[],
  originalCreatorId: string | null | undefined
): ValidationResult {
  if (originalCreatorId && originalCreatorId === targetUserId) {
    return { ok: false, errorKey: "cannotInviteOriginalCreator" };
  }

  const existing = collaborators.find((c) => c.user_id === targetUserId);
  if (existing?.status === 'accepted') {
    return { ok: false, errorKey: "inviteAlready" };
  }
  if (existing?.status === 'pending') {
    return { ok: false, errorKey: "inviteAlreadyPending" };
  }

  return { ok: true };
}
