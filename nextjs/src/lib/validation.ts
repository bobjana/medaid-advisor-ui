import { z } from 'zod';
import type { QuestionnaireData } from '@/types';

export const personalDetailsSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  idNumber: z.string().min(13, 'ID number must be at least 13 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  address: z.string().min(5, 'Address is required'),
});

export const dependentSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  relationship: z.enum(['spouse', 'child']),
  hasChronicCondition: z.boolean(),
  chronicConditionName: z.string().optional(),
}).refine(
  (data) => !data.hasChronicCondition || (data.hasChronicCondition && data.chronicConditionName),
  {
    message: 'Please specify the chronic condition',
    path: ['chronicConditionName'],
  }
);

export const plannedProcedureSchema = z.object({
  id: z.string(),
  who: z.enum(['me', 'spouse', 'child']),
  procedureType: z.string().min(1, 'Procedure type is required'),
  estimatedCost: z.string().min(1, 'Estimated cost is required'),
});

export const questionnaireSchema: z.ZodType<QuestionnaireData> = z.object({
  hasStarted: z.boolean(),
  personalDetails: personalDetailsSchema,
  coverageType: z.enum(['just_me', 'me_spouse', 'me_children', 'me_spouse_children']),
  numberOfChildren: z.number().min(0),
  dependents: z.array(dependentSchema),
  chronicConditionStatus: z.enum(['no', 'me', 'spouse', 'child']),
  chronicConditions: z.array(z.string()),
  hasPlannedProcedures: z.boolean(),
  plannedProcedures: z.array(plannedProcedureSchema),
  medicalAidStatus: z.enum(['no', 'individual', 'employer', 'spouse_employer']),
  currentScheme: z.enum(['discovery', 'bonitas', 'bestmed', 'medihelp', 'momentum', 'fedhealth', 'other', 'prefer_not_to_say']).optional(),
  satisfactionLevel: z.enum(['very_satisfied', 'satisfied', 'neutral', 'dissatisfied']).optional(),
  doctorVisits: z.enum(['0', '1-3', '4-6', '7+']),
  hospitalAdmissions: z.enum(['0', '1', '2', '3+']),
  highCostDental: z.boolean(),
  preferredProviders: z.object({
    hasPreferredProviders: z.boolean(),
    hospitalGroup: z.enum(['netcare', 'mediclinic', 'life_healthcare', 'other']).optional(),
    specificHospitals: z.array(z.string()).optional(),
    preferredSpecialists: z.array(z.string()).optional(),
  }),
  budgetRange: z.enum(['under_2000', '2000_4000', '4000_6000', '6000_8000', '8000_12000', 'over_12000', 'no_budget']),
  dayToDayPreference: z.enum(['savings_account', 'unlimited_cover', 'out_of_pocket', 'not_sure']),
  networkPreference: z.enum(['yes_lowest_cost', 'maybe_depends', 'no_need_freedom']),
  coPaymentPreference: z.enum(['yes_lower_cost', 'no_comprehensive']),
  benefitPriorities: z.object({
    maternity: z.enum(['critical', 'important', 'nice_to_have', 'not_important']),
    mentalHealth: z.enum(['critical', 'important', 'nice_to_have', 'not_important']),
    dental: z.enum(['critical', 'important', 'nice_to_have', 'not_important']),
    optical: z.enum(['critical', 'important', 'nice_to_have', 'not_important']),
    alternativeMedicine: z.enum(['critical', 'important', 'nice_to_have', 'not_important']),
    travelCover: z.enum(['critical', 'important', 'nice_to_have', 'not_important']),
  }),
  pregnancyStatus: z.enum(['currently_pregnant', 'planning_12_months', 'planning_future', 'not_planning']),
  birthPreference: z.enum(['hospital', 'home_midwife', 'not_sure']).optional(),
  locationConfirmed: z.boolean(),
});
