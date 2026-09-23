export type EmailClassification = 'RECRUITER' | 'SPAM' | 'OTHER';

export interface EmailClassificationResult {
  classification: EmailClassification;
  confidence: number;
  reason: string;
  matchedKeywords: string[];
}

export class EmailClassifier {
  private static readonly RECRUITER_KEYWORDS = [
    'interview', 'recruiter', 'talent acquisition', 'hiring manager', 'job opening',
    'opportunity at', 'application status', 'phone screen', 'technical round',
    'offer letter', 'discuss your background', 'career opportunity', 'next steps',
    'schedule a call', 'role at', 'candidacy', 'invitation to interview'
  ];

  private static readonly SPAM_KEYWORDS = [
    'unsubscribe', 'opt out', 'newsletter', 'promotional', 'special offer',
    'discount code', 'free trial', 'marketing email', 'view in browser',
    'no reply needed', 'click here to claim', 'sale ends', 'webinar replay'
  ];

  public static classify(subject: string, body: string): EmailClassificationResult {
    const combined = `${subject || ''} ${body || ''}`.toLowerCase();

    const matchedRecruiter: string[] = [];
    for (const kw of EmailClassifier.RECRUITER_KEYWORDS) {
      if (combined.includes(kw)) {
        matchedRecruiter.push(kw);
      }
    }

    const matchedSpam: string[] = [];
    for (const kw of EmailClassifier.SPAM_KEYWORDS) {
      if (combined.includes(kw)) {
        matchedSpam.push(kw);
      }
    }

    // SPAM takes precedence if strong spam signals and no recruiter signals
    if (matchedSpam.length >= 2 && matchedRecruiter.length === 0) {
      return {
        classification: 'SPAM',
        confidence: 0.9,
        reason: `Matched spam keywords: ${matchedSpam.join(', ')}`,
        matchedKeywords: matchedSpam
      };
    }

    if (matchedRecruiter.length > 0) {
      const confidence = Math.min(0.95, 0.6 + matchedRecruiter.length * 0.1);
      return {
        classification: 'RECRUITER',
        confidence,
        reason: `Matched recruiter keywords: ${matchedRecruiter.join(', ')}`,
        matchedKeywords: matchedRecruiter
      };
    }

    if (matchedSpam.length > 0) {
      return {
        classification: 'SPAM',
        confidence: 0.7,
        reason: `Matched spam indicators: ${matchedSpam.join(', ')}`,
        matchedKeywords: matchedSpam
      };
    }

    return {
      classification: 'OTHER',
      confidence: 0.5,
      reason: 'No decisive keyword matches detected',
      matchedKeywords: []
    };
  }
}
