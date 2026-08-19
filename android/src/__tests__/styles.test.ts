import {
  colors,
  spacing,
  typography,
  sharedStyles,
  chatStyles,
} from "../screens/styles";

describe("styles.ts exports", () => {
  describe("colors", () => {
    it("has all brand palette colors", () => {
      expect(colors.background).toBe("#090a0c");
      expect(colors.surface).toBe("#17181b");
      expect(colors.accent).toBe("#ff3b4f");
      expect(colors.text).toBe("#f1f1f2");
      expect(colors.textSecondary).toBe("#a5a7ab");
      expect(colors.textMuted).toBe("#70809b");
      expect(colors.textInverted).toBe("#16090b");
      expect(colors.green).toBe("#34d399");
      expect(colors.amber).toBe("#fbbf24");
      expect(colors.blue).toBe("#60a5fa");
      expect(colors.border).toBe("#3a3d42");
      expect(colors.surfaceElevated).toBe("#1c1d21");
      expect(colors.accentSoft).toBe("#43151f");
      expect(colors.borderActive).toBe("#ff3b4f");
    });

    it("has no cyan, violet, or teal (wrong palette)", () => {
      const allColors = Object.values(colors);
      for (const c of allColors) {
        expect(c).not.toMatch(/^#00[0-9a-f]{4}$/i);
        expect(c).not.toMatch(/^#8[0-9a-f]{5}$/i);
        expect(c).not.toMatch(/^#0[0-9a-f]b/i);
      }
    });
  });

  describe("spacing", () => {
    it("has consistent spacing scale", () => {
      expect(spacing.xs).toBeLessThan(spacing.sm);
      expect(spacing.sm).toBeLessThan(spacing.md);
      expect(spacing.md).toBeLessThan(spacing.lg);
      expect(spacing.lg).toBeLessThan(spacing.xl);
      expect(spacing.xl).toBeLessThan(spacing.xxl);
      expect(spacing.xxl).toBeLessThan(spacing.xxxl);
    });
  });

  describe("typography", () => {
    it("has eyebrow style with accent color", () => {
      expect(typography.eyebrow.color).toBe(colors.accent);
      expect(typography.eyebrow.fontWeight).toBe("800");
    });

    it("has title style with correct size", () => {
      expect(typography.title.fontSize).toBe(28);
      expect(typography.title.color).toBe(colors.text);
    });

    it("has body style", () => {
      expect(typography.body.fontSize).toBe(15);
      expect(typography.body.color).toBe(colors.text);
    });
  });

  describe("sharedStyles", () => {
    it("has safe area style with background color", () => {
      expect(sharedStyles.safe.backgroundColor).toBe(colors.background);
    });

    it("has card style with border", () => {
      expect(sharedStyles.card.borderWidth).toBe(1);
      expect(sharedStyles.card.borderColor).toBe(colors.border);
      expect(sharedStyles.card.borderRadius).toBe(18);
    });

    it("has input style with dark background", () => {
      expect(sharedStyles.input.backgroundColor).toBe("#0e0f12");
    });

    it("has primary button with accent color", () => {
      expect(sharedStyles.primary.backgroundColor).toBe(colors.accent);
    });

    it("has secondary button with accent border", () => {
      expect(sharedStyles.secondary.borderColor).toBe(colors.accent);
    });

    it("has tab bar styles", () => {
      expect(sharedStyles.tabBar.backgroundColor).toBe(colors.surface);
      expect(sharedStyles.tabBar.borderTopColor).toBe(colors.border);
    });

    it("has tab label active with accent color", () => {
      expect(sharedStyles.tabLabelActive.color).toBe(colors.accent);
    });

    it("has tab label inactive with muted color", () => {
      expect(sharedStyles.tabLabelInactive.color).toBe(colors.textMuted);
    });

    it("has loading style centered", () => {
      expect(sharedStyles.loading.alignItems).toBe("center");
      expect(sharedStyles.loading.justifyContent).toBe("center");
    });

    it("has title style", () => {
      expect(sharedStyles.title.fontSize).toBe(28);
    });

    it("has hero styles with elevated surface", () => {
      expect(sharedStyles.hero.backgroundColor).toBe(colors.surfaceElevated);
    });

    it("has settings menu styles", () => {
      expect(sharedStyles.settingsMenuItem.backgroundColor).toBeTruthy();
    });

    it("has scope chip styles", () => {
      expect(sharedStyles.scopeChip.borderColor).toBe(colors.border);
      expect(sharedStyles.scopeChipActive.backgroundColor).toBe(
        colors.accentSoft,
      );
    });
  });

  describe("chatStyles", () => {
    it("has container with background color", () => {
      expect(chatStyles.container.backgroundColor).toBe(colors.background);
    });

    it("has user bubble with blue tint", () => {
      expect(chatStyles.userBubble.backgroundColor).toBe("#1e3a5f");
    });

    it("has agent bubble with accent tint", () => {
      expect(chatStyles.agentBubble.backgroundColor).toBe("#2d1519");
    });

    it("has send button with accent color", () => {
      expect(chatStyles.sendButton.backgroundColor).toBe(colors.accent);
      expect(chatStyles.sendButton.width).toBe(44);
      expect(chatStyles.sendButton.height).toBe(44);
    });

    it("has composer input with dark background", () => {
      expect(chatStyles.composerInput.backgroundColor).toBe("#0e0f12");
    });

    it("has composer container with border", () => {
      expect(chatStyles.composerContainer.borderTopColor).toBe(colors.border);
    });
  });
});
