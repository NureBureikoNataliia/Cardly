import {
  sanitizeFileName,
  buildDeckPdfHeaderHtml,
  buildDeckPdfCardHtml,
  buildDeckPdfEmptyHtml,
  buildDeckPdfHtml,
} from '../exportDeckPdf.shared';

describe('exportDeckPdf.shared helper functions', () => {
  describe('sanitizeFileName', () => {
    it('replaces invalid OS file characters with underscores', () => {
      const dirty = 'Math: 101/202 <Intro>?';
      const clean = sanitizeFileName(dirty);
      expect(clean).toBe('Math_ 101_202 _Intro__');
    });

    it('collapses multiple whitespace characters into a single space', () => {
      const dirty = 'My   Awesome    Deck  Name';
      const clean = sanitizeFileName(dirty);
      expect(clean).toBe('My Awesome Deck Name');
    });

    it('trims leading/trailing whitespace', () => {
      const dirty = '   Trim Me   ';
      const clean = sanitizeFileName(dirty);
      expect(clean).toBe('Trim Me');
    });

    it('limits output to 80 characters', () => {
      const longTitle = 'a'.repeat(120);
      const clean = sanitizeFileName(longTitle);
      expect(clean.length).toBe(80);
      expect(clean).toBe('a'.repeat(80));
    });

    it('returns default fallback value if name is empty', () => {
      expect(sanitizeFileName('')).toBe('deck');
      expect(sanitizeFileName('  *??  ')).toBe('___');
    });
  });

  describe('buildDeckPdfHeaderHtml', () => {
    it('correctly escapes HTML tags and quotes in title and description', () => {
      const title = '<h1>Hello & Welcome</h1>';
      const description = '"Special" & \'Dangerous\' <stuff>';
      const result = buildDeckPdfHeaderHtml(title, description);

      expect(result).not.toContain('<h1>');
      expect(result).not.toContain('Welcome</h1>');
      expect(result).toContain('&lt;h1&gt;Hello &amp; Welcome&lt;/h1&gt;');
      expect(result).toContain('&quot;Special&quot; &amp; &#39;Dangerous&#39; &lt;stuff&gt;');
    });

    it('omits description tag if description is null or empty', () => {
      const title = 'Test Title';
      const result = buildDeckPdfHeaderHtml(title, null);
      expect(result).toContain('Test Title');
      expect(result).not.toContain('<p');
    });
  });

  describe('buildDeckPdfCardHtml', () => {
    it('escapes and formats a card with index', () => {
      const card = {
        front_text: '<Front text>',
        back_text: 'Back text with & symbol',
      };
      const result = buildDeckPdfCardHtml(card, 0);

      expect(result).toContain('1'); // Index is 0+1
      expect(result).toContain('&lt;Front text&gt;');
      expect(result).toContain('Back text with &amp; symbol');
    });
  });

  describe('buildDeckPdfEmptyHtml', () => {
    it('escapes empty message correctly', () => {
      const result = buildDeckPdfEmptyHtml('No cards <found>');
      expect(result).toContain('No cards &lt;found&gt;');
    });
  });

  describe('buildDeckPdfHtml', () => {
    it('constructs complete PDF layout with cards', () => {
      const args = {
        title: 'Languages',
        description: 'UA-EN vocab',
        cards: [
          { front_text: 'Привіт', back_text: 'Hello' },
          { front_text: 'Дякую', back_text: 'Thank you' },
        ],
      };
      const result = buildDeckPdfHtml(args);

      expect(result).toContain('Languages');
      expect(result).toContain('UA-EN vocab');
      expect(result).toContain('Привіт');
      expect(result).toContain('Hello');
      expect(result).toContain('Дякую');
      expect(result).toContain('Thank you');
      expect(result).not.toContain('Ця дошка поки що немає карток');
    });

    it('constructs PDF layout with empty message when deck has no cards', () => {
      const args = {
        title: 'Empty Deck',
        description: null,
        cards: [],
        emptyMessage: 'Empty warning <msg>',
      };
      const result = buildDeckPdfHtml(args);

      expect(result).toContain('Empty Deck');
      expect(result).toContain('Empty warning &lt;msg&gt;');
    });
  });
});
