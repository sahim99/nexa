export class SecurityError extends Error {
  constructor(message: string) {
    super(`[SecurityError] ${message}`);
    this.name = 'SecurityError';
  }
}

export class UntrustedWrapper {
  /**
   * Wraps external/untrusted content in strict XML-style boundary tags,
   * neutralizing prompt injection breakout attempts.
   */
  public static wrapUntrusted(content: string, source: string = 'external'): string {
    if (!content) return `<untrusted source="${source}">\n</untrusted>`;

    // Neutralize any escape breakout attempts
    const sanitized = content.replace(/<\/untrusted>/gi, '&lt;/untrusted&gt;');
    return `<untrusted source="${source}">\n${sanitized}\n</untrusted>`;
  }

  /**
   * Detects whether content is properly encapsulated within untrusted boundary tags.
   */
  public static isWrappedUntrusted(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();
    return trimmed.startsWith('<untrusted') && trimmed.endsWith('</untrusted>');
  }

  /**
   * Asserts that external content passed to system/LLM is securely wrapped.
   * Throws SecurityError if raw unwrapped external text is detected.
   */
  public static assertNoRawExternal(content: string, isExternal: boolean = false): void {
    if (!isExternal) return;

    if (!UntrustedWrapper.isWrappedUntrusted(content)) {
      throw new SecurityError(
        'Raw external untrusted content detected without untrusted boundary wrapper. Call wrapUntrusted() before passing to LLM.'
      );
    }
  }
}

export const wrapUntrusted = UntrustedWrapper.wrapUntrusted;
export const isWrappedUntrusted = UntrustedWrapper.isWrappedUntrusted;
export const assertNoRawExternal = UntrustedWrapper.assertNoRawExternal;
