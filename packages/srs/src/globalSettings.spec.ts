import {
  initialSnapshotForNewCard,
  validateGlobalSettings,
  defaultGlobalSpacedRepetitionSettings,
  type GlobalSpacedRepetitionSettings,
} from "./globalSettings";

describe("globalSettings", () => {
  describe("initialSnapshotForNewCard", () => {
    it("returns default learning phase snapshot when no settings are passed", () => {
      const snapshot = initialSnapshotForNewCard();
      expect(snapshot).toEqual({
        phase: "learning",
        learningStepIndex: 0,
        easePermille: 2500,
        intervalDays: 0,
      });
    });

    it("returns default learning phase snapshot when custom settings are passed", () => {
      const customSettings = {
        ...defaultGlobalSpacedRepetitionSettings,
      };
      const snapshot = initialSnapshotForNewCard(customSettings);
      expect(snapshot).toEqual({
        phase: "learning",
        learningStepIndex: 0,
        easePermille: 2500,
        intervalDays: 0,
      });
    });
  });

  describe("validateGlobalSettings", () => {
    it("passes for valid default settings", () => {
      expect(() => validateGlobalSettings(defaultGlobalSpacedRepetitionSettings)).not.toThrow();
    });

    it("throws error if learningStepsSeconds is empty", () => {
      const invalidSettings: GlobalSpacedRepetitionSettings = {
        ...defaultGlobalSpacedRepetitionSettings,
        learningStepsSeconds: [],
      };
      expect(() => validateGlobalSettings(invalidSettings)).toThrow(
        "learningStepsSeconds must contain at least one step"
      );
    });

    it("throws error if any learning step delay is non-positive", () => {
      const invalidSettings: GlobalSpacedRepetitionSettings = {
        ...defaultGlobalSpacedRepetitionSettings,
        learningStepsSeconds: [60, 0, 600],
      };
      expect(() => validateGlobalSettings(invalidSettings)).toThrow(
        "learning step delays must be positive (seconds)"
      );

      const invalidSettingsNegative: GlobalSpacedRepetitionSettings = {
        ...defaultGlobalSpacedRepetitionSettings,
        learningStepsSeconds: [-10],
      };
      expect(() => validateGlobalSettings(invalidSettingsNegative)).toThrow(
        "learning step delays must be positive (seconds)"
      );
    });

    it("throws error if any relearning step delay is non-positive", () => {
      const invalidSettings: GlobalSpacedRepetitionSettings = {
        ...defaultGlobalSpacedRepetitionSettings,
        relearningStepsSeconds: [600, -5],
      };
      expect(() => validateGlobalSettings(invalidSettings)).toThrow(
        "relearning step delays must be positive (seconds)"
      );

      const invalidSettingsZero: GlobalSpacedRepetitionSettings = {
        ...defaultGlobalSpacedRepetitionSettings,
        relearningStepsSeconds: [0],
      };
      expect(() => validateGlobalSettings(invalidSettingsZero)).toThrow(
        "relearning step delays must be positive (seconds)"
      );
    });

    it("throws error if graduatingIntervalDays is less than 1", () => {
      const invalidSettings: GlobalSpacedRepetitionSettings = {
        ...defaultGlobalSpacedRepetitionSettings,
        graduatingIntervalDays: 0,
      };
      expect(() => validateGlobalSettings(invalidSettings)).toThrow(
        "graduatingIntervalDays must be at least 1"
      );
    });

    it("throws error if easyIntervalDuringLearningDays is less than 1", () => {
      const invalidSettings: GlobalSpacedRepetitionSettings = {
        ...defaultGlobalSpacedRepetitionSettings,
        easyIntervalDuringLearningDays: 0,
      };
      expect(() => validateGlobalSettings(invalidSettings)).toThrow(
        "easyIntervalDuringLearningDays must be at least 1"
      );
    });
  });
});
