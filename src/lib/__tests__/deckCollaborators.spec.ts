import { validateCollaboratorInvitation, Collaborator } from '../deckCollaborators';

describe('deckCollaborators invitation validation', () => {
  const targetUserId = 'user-123';

  it('allows invitation when target user is not a collaborator and not the original creator', () => {
    const collaborators: Collaborator[] = [];
    const result = validateCollaboratorInvitation(targetUserId, collaborators, null);
    expect(result.ok).toBe(true);
  });

  it('rejects invitation if target user is already an accepted collaborator', () => {
    const collaborators: Collaborator[] = [
      { user_id: 'user-123', status: 'accepted' },
      { user_id: 'user-456', status: 'pending' },
    ];
    const result = validateCollaboratorInvitation(targetUserId, collaborators, null);
    expect(result.ok).toBe(false);
    expect(result.errorKey).toBe('inviteAlready');
  });

  it('rejects invitation if target user has a pending invitation', () => {
    const collaborators: Collaborator[] = [
      { user_id: 'user-123', status: 'pending' },
    ];
    const result = validateCollaboratorInvitation(targetUserId, collaborators, null);
    expect(result.ok).toBe(false);
    expect(result.errorKey).toBe('inviteAlreadyPending');
  });

  it('allows invitation if target user previously declined the invitation', () => {
    const collaborators: Collaborator[] = [
      { user_id: 'user-123', status: 'declined' },
    ];
    const result = validateCollaboratorInvitation(targetUserId, collaborators, null);
    expect(result.ok).toBe(true);
  });

  it('rejects invitation if target user is the creator of the original deck', () => {
    const collaborators: Collaborator[] = [];
    const result = validateCollaboratorInvitation(targetUserId, collaborators, 'user-123');
    expect(result.ok).toBe(false);
    expect(result.errorKey).toBe('cannotInviteOriginalCreator');
  });
});
