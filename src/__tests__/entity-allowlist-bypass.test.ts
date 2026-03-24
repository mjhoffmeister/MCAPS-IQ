/**
 * Security tests: Entity allowlist bypass attempts
 * Validates that isEntityAllowed() rejects case-variation,
 * URL-encoding, Unicode tricks, and structural bypass attempts.
 *
 * Threat model references: E-1, T-5
 */
import { describe, it, expect } from 'vitest';
import { isEntityAllowed, ALLOWED_ENTITY_SETS } from '../tools.js';

describe('Entity allowlist — case-variation bypass', () => {
  it('rejects uppercase variant of allowed entity', () => {
    expect(isEntityAllowed('ACCOUNTS')).toBe(false);
    expect(isEntityAllowed('Accounts')).toBe(false);
    expect(isEntityAllowed('OPPORTUNITIES')).toBe(false);
    expect(isEntityAllowed('Opportunities')).toBe(false);
  });

  it('rejects mixed-case variants', () => {
    expect(isEntityAllowed('aCcOuNtS')).toBe(false);
    expect(isEntityAllowed('Tasks')).toBe(false);
    expect(isEntityAllowed('Contacts')).toBe(false);
    expect(isEntityAllowed('SystemUsers')).toBe(false);
  });

  it('rejects title-case of custom entities', () => {
    expect(isEntityAllowed('Msp_engagementmilestones')).toBe(false);
    expect(isEntityAllowed('MSP_ENGAGEMENTMILESTONES')).toBe(false);
    expect(isEntityAllowed('Msp_Dealteams')).toBe(false);
  });

  it('rejects case variations of metadata endpoints', () => {
    expect(isEntityAllowed('entitydefinitions')).toBe(false);
    expect(isEntityAllowed('ENTITYDEFINITIONS')).toBe(false);
    expect(isEntityAllowed('entityDefinitions')).toBe(false);
  });
});

describe('Entity allowlist — URL-encoding bypass', () => {
  it('rejects percent-encoded entity names', () => {
    // "accounts" with 'a' as %61
    expect(isEntityAllowed('%61ccounts')).toBe(false);
    expect(isEntityAllowed('ac%63ounts')).toBe(false);
  });

  it('rejects fully percent-encoded names', () => {
    // "tasks" fully encoded
    expect(isEntityAllowed('%74%61%73%6B%73')).toBe(false);
  });

  it('rejects double-encoded names', () => {
    expect(isEntityAllowed('%2561ccounts')).toBe(false);
  });
});

describe('Entity allowlist — structural/path bypass', () => {
  it('strips key suffix correctly — allowed entity with key', () => {
    expect(isEntityAllowed('accounts(12345678-1234-1234-1234-123456789abc)')).toBe(true);
    expect(isEntityAllowed('opportunities(some-guid)')).toBe(true);
  });

  it('strips navigation path correctly — allowed entity', () => {
    expect(isEntityAllowed('accounts/contacts')).toBe(true);
  });

  it('rejects disallowed entity even with key suffix', () => {
    expect(isEntityAllowed('emails(12345678-1234-1234-1234-123456789abc)')).toBe(false);
    expect(isEntityAllowed('annotations(some-guid)')).toBe(false);
  });

  it('rejects disallowed entity disguised via navigation path', () => {
    // Navigation property after disallowed entity
    expect(isEntityAllowed('emails/accounts')).toBe(false);
    expect(isEntityAllowed('annotations/tasks')).toBe(false);
  });

  it('rejects entities with whitespace padding', () => {
    expect(isEntityAllowed(' accounts')).toBe(false);
    expect(isEntityAllowed('accounts ')).toBe(false);
    expect(isEntityAllowed(' accounts ')).toBe(false);
    expect(isEntityAllowed('\taccounts')).toBe(false);
    expect(isEntityAllowed('accounts\n')).toBe(false);
  });
});

describe('Entity allowlist — Unicode / homoglyph bypass', () => {
  it('rejects Cyrillic lookalikes for "accounts"', () => {
    // 'а' (Cyrillic а, U+0430) looks like Latin 'a'
    expect(isEntityAllowed('\u0430ccounts')).toBe(false);
  });

  it('rejects fullwidth characters', () => {
    // 'ａ' (U+FF41) is fullwidth 'a'
    expect(isEntityAllowed('\uFF41ccounts')).toBe(false);
  });

  it('rejects zero-width character insertion', () => {
    // Zero-width space (U+200B) injected
    expect(isEntityAllowed('acc\u200Bounts')).toBe(false);
    // Zero-width joiner (U+200D)
    expect(isEntityAllowed('acc\u200Dounts')).toBe(false);
  });

  it('rejects Unicode normalization variants', () => {
    // Using combining characters
    expect(isEntityAllowed('a\u0300ccounts')).toBe(false);
  });
});

describe('Entity allowlist — null/edge inputs', () => {
  it('rejects null, undefined, empty string', () => {
    expect(isEntityAllowed(null)).toBe(false);
    expect(isEntityAllowed(undefined)).toBe(false);
    expect(isEntityAllowed('')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isEntityAllowed(123)).toBe(false);
    expect(isEntityAllowed(true)).toBe(false);
    expect(isEntityAllowed([])).toBe(false);
    expect(isEntityAllowed({})).toBe(false);
  });

  it('rejects dot-segment injection in entity name', () => {
    expect(isEntityAllowed('../accounts')).toBe(false);
    expect(isEntityAllowed('./accounts')).toBe(false);
  });

  it('rejects entity names with query string appended', () => {
    // An attacker might try to append OData query via entity name
    expect(isEntityAllowed('accounts?$filter=name eq \'x\'')).toBe(false);
  });

  it('rejects entity names containing slashes that resolve to disallowed entities', () => {
    // Ensure the base extraction via split('/')[0] works
    expect(isEntityAllowed('annotations/something/accounts')).toBe(false);
  });
});

describe('Entity allowlist — positive confirmation', () => {
  it('accepts every entity in the allowlist exactly as listed', () => {
    for (const entity of ALLOWED_ENTITY_SETS) {
      expect(isEntityAllowed(entity)).toBe(true);
    }
  });

  it('rejects common Dynamics 365 entities NOT in the allowlist', () => {
    const forbidden = [
      'emails', 'annotations', 'phonecalls', 'letters',
      'appointments', 'activitypointers', 'incidents',
      'knowledgearticles', 'sharepointdocumentlocations',
      'socialactivities', 'quotes', 'salesorders', 'invoices',
    ];
    for (const entity of forbidden) {
      expect(isEntityAllowed(entity)).toBe(false);
    }
  });
});
