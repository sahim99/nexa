export class DateExtractor {
  private static readonly MONTHS: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };

  /**
   * 15 regex patterns covering interview scheduling notifications and emails.
   */
  private static readonly PATTERNS: Array<{
    regex: RegExp;
    handler: (match: RegExpMatchArray, baseDate: Date) => Date | null;
  }> = [
    // 1. ISO format: 2026-06-15 or 2026-06-15T14:30:00
    {
      regex: /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?\b/,
      handler: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), m[4] ? parseInt(m[4]) : 9, m[5] ? parseInt(m[5]) : 0)
    },
    // 2. DayName, Month DD, YYYY (e.g. Monday, June 15, 2026)
    {
      regex: /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
      handler: (m) => {
        const month = DateExtractor.MONTHS[m[1].toLowerCase()];
        return month !== undefined ? new Date(parseInt(m[3]), month, parseInt(m[2]), 10, 0) : null;
      }
    },
    // 3. DayName, Month DD (e.g. Monday, June 15) -> current or next year
    {
      regex: /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
      handler: (m, base) => {
        const month = DateExtractor.MONTHS[m[1].toLowerCase()];
        if (month === undefined) return null;
        const year = base.getFullYear();
        const d = new Date(year, month, parseInt(m[2]), 10, 0);
        return d;
      }
    },
    // 4. Month DD, YYYY (e.g. June 15, 2026 or June 15th, 2026)
    {
      regex: /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
      handler: (m) => {
        const month = DateExtractor.MONTHS[m[1].toLowerCase()];
        return month !== undefined ? new Date(parseInt(m[3]), month, parseInt(m[2]), 10, 0) : null;
      }
    },
    // 5. DD Month YYYY (e.g. 15 June 2026 or 15th June 2026)
    {
      regex: /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+),?\s+(\d{4})\b/i,
      handler: (m) => {
        const month = DateExtractor.MONTHS[m[2].toLowerCase()];
        return month !== undefined ? new Date(parseInt(m[3]), month, parseInt(m[1]), 10, 0) : null;
      }
    },
    // 6. Month DD (e.g. June 15 or June 15th)
    {
      regex: /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?!\s*,\s*\d{4})\b/i,
      handler: (m, base) => {
        const month = DateExtractor.MONTHS[m[1].toLowerCase()];
        if (month === undefined) return null;
        return new Date(base.getFullYear(), month, parseInt(m[2]), 10, 0);
      }
    },
    // 7. DD/MM/YYYY or DD-MM-YYYY (e.g. 15/06/2026)
    {
      regex: /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/,
      handler: (m) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]), 10, 0)
    },
    // 8. Tomorrow at HH(:MM)? (AM|PM)?
    {
      regex: /\btomorrow(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/i,
      handler: (m, base) => {
        const d = new Date(base);
        d.setDate(d.getDate() + 1);
        let hours = m[1] ? parseInt(m[1]) : 10;
        if (m[3] && m[3].toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (m[3] && m[3].toLowerCase() === 'am' && hours === 12) hours = 0;
        d.setHours(hours, m[2] ? parseInt(m[2]) : 0, 0, 0);
        return d;
      }
    },
    // 9. Next Monday/Tuesday/etc.
    {
      regex: /\bnext\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i,
      handler: (m, base) => {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = dayNames.indexOf(m[1].toLowerCase());
        const d = new Date(base);
        const currentDay = d.getDay();
        let daysAhead = targetDay - currentDay;
        if (daysAhead <= 0) daysAhead += 7;
        d.setDate(d.getDate() + daysAhead);
        d.setHours(10, 0, 0, 0);
        return d;
      }
    },
    // 10. DD Month (e.g. 15th June)
    {
      regex: /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)\b/i,
      handler: (m, base) => {
        const month = DateExtractor.MONTHS[m[2].toLowerCase()];
        if (month === undefined) return null;
        return new Date(base.getFullYear(), month, parseInt(m[1]), 10, 0);
      }
    },
    // 11. YYYY.MM.DD
    {
      regex: /\b(\d{4})\.(\d{1,2})\.(\d{1,2})\b/,
      handler: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), 10, 0)
    },
    // 12. scheduled for: Month DD at HH:MM
    {
      regex: /scheduled\s+for:?\s+([A-Za-z]+)\s+(\d{1,2})/i,
      handler: (m, base) => {
        const month = DateExtractor.MONTHS[m[1].toLowerCase()];
        if (month === undefined) return null;
        return new Date(base.getFullYear(), month, parseInt(m[2]), 10, 0);
      }
    },
    // 13. interview on Month DD
    {
      regex: /interview\s+on\s+([A-Za-z]+)\s+(\d{1,2})/i,
      handler: (m, base) => {
        const month = DateExtractor.MONTHS[m[1].toLowerCase()];
        if (month === undefined) return null;
        return new Date(base.getFullYear(), month, parseInt(m[2]), 10, 0);
      }
    },
    // 14. call at HH:MM AM/PM on Month DD
    {
      regex: /at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s+on\s+([A-Za-z]+)\s+(\d{1,2})/i,
      handler: (m, base) => {
        const month = DateExtractor.MONTHS[m[4].toLowerCase()];
        if (month === undefined) return null;
        let hours = parseInt(m[1]);
        if (m[3].toLowerCase() === 'pm' && hours < 12) hours += 12;
        return new Date(base.getFullYear(), month, parseInt(m[5]), hours, m[2] ? parseInt(m[2]) : 0);
      }
    },
    // 15. meeting on Month DDth
    {
      regex: /meeting\s+on\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
      handler: (m, base) => {
        const month = DateExtractor.MONTHS[m[1].toLowerCase()];
        if (month === undefined) return null;
        return new Date(base.getFullYear(), month, parseInt(m[2]), 10, 0);
      }
    }
  ];

  public static extract(text: string, referenceDate: Date = new Date()): Date | null {
    if (!text) return null;

    for (const pattern of DateExtractor.PATTERNS) {
      const match = text.match(pattern.regex);
      if (match) {
        try {
          const parsed = pattern.handler(match, referenceDate);
          if (parsed && !isNaN(parsed.getTime())) {
            return parsed;
          }
        } catch {
          // Continue to next pattern
        }
      }
    }

    return null;
  }
}
