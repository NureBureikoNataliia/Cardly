import {
  putDeckQuizSession,
  getDeckQuizSession,
  clearDeckQuizSession,
} from "../deckQuizSession";

describe("deckQuizSession", () => {
  const dummyQuiz = {
    deckId: "deck-123",
    title: "Test Deck",
    source: "manual" as const,
    questions: [
      {
        cardId: "card-1",
        prompt: "Question 1",
        correctAnswer: "Answer 1",
        options: ["Answer 1", "Answer 2"],
        kind: "basic" as const,
      },
    ],
  };

  it("puts and gets a session successfully, generating a unique sessionId", () => {
    const session = putDeckQuizSession(dummyQuiz);

    expect(session.sessionId).toBeDefined();
    expect(session.sessionId).toContain("-");
    expect(session.deckId).toBe("deck-123");
    expect(session.title).toBe("Test Deck");

    const retrieved = getDeckQuizSession(session.sessionId);
    expect(retrieved).toEqual(session);

    // Clean up
    clearDeckQuizSession(session.sessionId);
  });

  it("stores session with explicitly provided sessionId", () => {
    const customId = "custom-session-id";
    const session = putDeckQuizSession({ ...dummyQuiz, sessionId: customId });

    expect(session.sessionId).toBe(customId);

    const retrieved = getDeckQuizSession(customId);
    expect(retrieved).toEqual(session);

    // Clean up
    clearDeckQuizSession(customId);
  });

  it("evicts previous session for the same deckId when putting a new session", () => {
    const session1 = putDeckQuizSession({ ...dummyQuiz, deckId: "deck-same" });
    const session2 = putDeckQuizSession({ ...dummyQuiz, deckId: "deck-same" });

    // The first session should be removed from sessions Map
    expect(getDeckQuizSession(session1.sessionId)).toBeNull();
    // The second session should exist
    expect(getDeckQuizSession(session2.sessionId)).toEqual(session2);

    // Clean up
    clearDeckQuizSession(session2.sessionId);
  });

  it("does not evict the current session when updating/putting with the same sessionId", () => {
    const session = putDeckQuizSession({ ...dummyQuiz, deckId: "deck-same" });
    const updatedSession = putDeckQuizSession({
      ...dummyQuiz,
      deckId: "deck-same",
      sessionId: session.sessionId,
      title: "Updated Title",
    });

    expect(getDeckQuizSession(session.sessionId)).toEqual(updatedSession);
    expect(updatedSession.title).toBe("Updated Title");

    // Clean up
    clearDeckQuizSession(session.sessionId);
  });

  it("returns null for non-existent session id", () => {
    expect(getDeckQuizSession("non-existent-id")).toBeNull();
  });

  it("clears activeByDeck mapping if the cleared session was the active one", () => {
    const session = putDeckQuizSession(dummyQuiz);
    expect(getDeckQuizSession(session.sessionId)).toEqual(session);

    clearDeckQuizSession(session.sessionId);
    expect(getDeckQuizSession(session.sessionId)).toBeNull();

    // Verify it was cleared by adding a new session and making sure it has a new ID
    const newSession = putDeckQuizSession(dummyQuiz);
    expect(newSession.sessionId).not.toBe(session.sessionId);

    // Clean up
    clearDeckQuizSession(newSession.sessionId);
  });

  it("does not clear activeByDeck mapping if a different session is cleared", () => {
    const session1 = putDeckQuizSession({ ...dummyQuiz, deckId: "deck-multi" });
    const session2 = putDeckQuizSession({ ...dummyQuiz, deckId: "deck-multi" }); // this makes session2 active, evicts session1 from sessions Map

    // Now manually check that clearing session1 (which is already evicted from sessions)
    // does not clear session2's active status.
    clearDeckQuizSession(session1.sessionId);

    // session2 should still be retrievable and active
    expect(getDeckQuizSession(session2.sessionId)).toEqual(session2);

    // Clean up
    clearDeckQuizSession(session2.sessionId);
  });
});
