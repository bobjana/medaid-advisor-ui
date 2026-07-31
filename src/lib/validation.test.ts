import { describe, it, expect } from 'vitest';
import {
  personalDetailsSchema,
  dependentSchema,
  plannedProcedureSchema,
  questionnaireSchema,
} from './validation';
import { initialData } from '@/types';

const validPersonalDetails = {
  fullName: 'Jane Doe',
  idNumber: '9001010001088',
  dateOfBirth: '1990-01-01',
  gender: 'female' as const,
  email: 'jane@example.com',
  phone: '+27123456789',
  address: '1 Long Street, Cape Town',
};

describe('personalDetailsSchema', () => {
  it('accepts a fully-populated valid record', () => {
    const result = personalDetailsSchema.safeParse(validPersonalDetails);
    expect(result.success).toBe(true);
  });

  it('rejects names shorter than 2 characters', () => {
    const result = personalDetailsSchema.safeParse({
      ...validPersonalDetails,
      fullName: 'J',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path[0] === 'fullName');
      expect(nameIssue?.message).toBe('Full name is required');
    }
  });

  it('rejects an invalid email', () => {
    const result = personalDetailsSchema.safeParse({
      ...validPersonalDetails,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path[0] === 'email');
      expect(emailIssue?.message).toBe('Please enter a valid email address');
    }
  });

  it('rejects an ID number shorter than 13 characters', () => {
    const result = personalDetailsSchema.safeParse({
      ...validPersonalDetails,
      idNumber: '123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const idIssue = result.error.issues.find((i) => i.path[0] === 'idNumber');
      expect(idIssue?.message).toBe('ID number must be at least 13 characters');
    }
  });

  it('rejects an unknown gender', () => {
    const result = personalDetailsSchema.safeParse({
      ...validPersonalDetails,
      gender: 'unknown',
    });
    expect(result.success).toBe(false);
  });
});

describe('dependentSchema', () => {
  const validDependent = {
    id: 'dep-1',
    name: 'Child One',
    dateOfBirth: '2015-01-01',
    relationship: 'child' as const,
    hasChronicCondition: false,
  };

  it('accepts a dependent without a chronic condition', () => {
    const result = dependentSchema.safeParse(validDependent);
    expect(result.success).toBe(true);
  });

  it('rejects a chronic-condition dependent without a condition name', () => {
    const result = dependentSchema.safeParse({
      ...validDependent,
      hasChronicCondition: true,
      chronicConditionName: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const condIssue = result.error.issues.find(
        (i) => i.path[0] === 'chronicConditionName',
      );
      expect(condIssue?.message).toBe('Please specify the chronic condition');
    }
  });

  it('accepts a chronic-condition dependent with a condition name', () => {
    const result = dependentSchema.safeParse({
      ...validDependent,
      hasChronicCondition: true,
      chronicConditionName: 'Asthma',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown relationship', () => {
    const result = dependentSchema.safeParse({
      ...validDependent,
      relationship: 'parent',
    });
    expect(result.success).toBe(false);
  });
});

describe('plannedProcedureSchema', () => {
  it('accepts a fully-populated valid procedure', () => {
    const result = plannedProcedureSchema.safeParse({
      id: 'proc-1',
      who: 'me',
      procedureType: 'Hip replacement',
      estimatedCost: '150000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty procedure type', () => {
    const result = plannedProcedureSchema.safeParse({
      id: 'proc-1',
      who: 'me',
      procedureType: '',
      estimatedCost: '150000',
    });
    expect(result.success).toBe(false);
  });
});

describe('questionnaireSchema', () => {
  it('rejects the empty initialData fixture (it is a starting state, not a valid submission)', () => {
    const result = questionnaireSchema.safeParse(initialData);
    expect(result.success).toBe(false);
  });

  it('accepts a complete valid record', () => {
    const result = questionnaireSchema.safeParse({
      ...initialData,
      personalDetails: validPersonalDetails,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid coverageType', () => {
    const result = questionnaireSchema.safeParse({
      ...initialData,
      personalDetails: validPersonalDetails,
      coverageType: 'everyone_in_south_africa',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === 'coverageType'),
      ).toBe(true);
    }
  });

  it('rejects a negative numberOfChildren', () => {
    const result = questionnaireSchema.safeParse({
      ...initialData,
      personalDetails: validPersonalDetails,
      numberOfChildren: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === 'numberOfChildren'),
      ).toBe(true);
    }
  });

  it('rejects dependents that violate the chronic-condition refinement', () => {
    const result = questionnaireSchema.safeParse({
      ...initialData,
      personalDetails: validPersonalDetails,
      dependents: [
        {
          id: 'dep-1',
          name: 'Child One',
          dateOfBirth: '2015-01-01',
          relationship: 'child',
          hasChronicCondition: true,
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.path.join('.') === 'dependents.0.chronicConditionName',
        ),
      ).toBe(true);
    }
  });

  it('accepts a birthPreference only when pregnancyStatus requires it', () => {
    const withBirth = questionnaireSchema.safeParse({
      ...initialData,
      personalDetails: validPersonalDetails,
      pregnancyStatus: 'planning_12_months',
      birthPreference: 'home_midwife',
    });
    expect(withBirth.success).toBe(true);

    const withoutBirth = questionnaireSchema.safeParse({
      ...initialData,
      personalDetails: validPersonalDetails,
      pregnancyStatus: 'not_planning',
      birthPreference: undefined,
    });
    expect(withoutBirth.success).toBe(true);
  });
});
