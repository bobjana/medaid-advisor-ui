export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type CoverageType = 'just_me' | 'me_spouse' | 'me_children' | 'me_spouse_children';
export type Relationship = 'spouse' | 'child';
export type ChronicConditionStatus = 'no' | 'me' | 'spouse' | 'child';
export type MedicalAidStatus = 'no' | 'individual' | 'employer' | 'spouse_employer';
export type MedicalAidScheme = 'discovery' | 'bonitas' | 'bestmed' | 'medihelp' | 'momentum' | 'fedhealth' | 'other' | 'prefer_not_to_say';
export type SatisfactionLevel = 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied';
export type DoctorVisits = '0' | '1-3' | '4-6' | '7+';
export type HospitalAdmissions = '0' | '1' | '2' | '3+';
export type BudgetRange = 'under_2000' | '2000_4000' | '4000_6000' | '6000_8000' | '8000_12000' | 'over_12000' | 'no_budget';
export type DayToDayPreference = 'savings_account' | 'unlimited_cover' | 'out_of_pocket' | 'not_sure';
export type NetworkPreference = 'yes_lowest_cost' | 'maybe_depends' | 'no_need_freedom';
export type CoPaymentPreference = 'yes_lower_cost' | 'no_comprehensive';
export type HospitalGroup = 'netcare' | 'mediclinic' | 'life_healthcare' | 'other';
export type BenefitPriority = 'critical' | 'important' | 'nice_to_have' | 'not_important';
export type PregnancyStatus = 'currently_pregnant' | 'planning_12_months' | 'planning_future' | 'not_planning';
export type BirthPreference = 'hospital' | 'home_midwife' | 'not_sure';

export interface Dependent {
  id: string;
  name: string;
  dateOfBirth: string;
  relationship: Relationship;
  hasChronicCondition: boolean;
  chronicConditionName?: string;
}

export interface PlannedProcedure {
  id: string;
  who: 'me' | 'spouse' | 'child';
  procedureType: string;
  estimatedCost: string;
}

export interface QuestionnaireData {
  hasStarted: boolean;
  personalDetails: {
    fullName: string;
    idNumber: string;
    dateOfBirth: string;
    gender: Gender;
    email: string;
    phone: string;
    address: string;
  };
  coverageType: CoverageType;
  numberOfChildren: number;
  dependents: Dependent[];
  chronicConditionStatus: ChronicConditionStatus;
  chronicConditions: string[];
  hasPlannedProcedures: boolean;
  plannedProcedures: PlannedProcedure[];
  medicalAidStatus: MedicalAidStatus;
  currentScheme?: MedicalAidScheme;
  satisfactionLevel?: SatisfactionLevel;
  doctorVisits: DoctorVisits;
  hospitalAdmissions: HospitalAdmissions;
  highCostDental: boolean;
  preferredProviders: {
    hasPreferredProviders: boolean;
    hospitalGroup?: HospitalGroup;
    specificHospitals?: string[];
    preferredSpecialists?: string[];
  };
  budgetRange: BudgetRange;
  dayToDayPreference: DayToDayPreference;
  networkPreference: NetworkPreference;
  coPaymentPreference: CoPaymentPreference;
  benefitPriorities: {
    maternity: BenefitPriority;
    mentalHealth: BenefitPriority;
    dental: BenefitPriority;
    optical: BenefitPriority;
    alternativeMedicine: BenefitPriority;
    travelCover: BenefitPriority;
  };
  pregnancyStatus: PregnancyStatus;
  birthPreference?: BirthPreference;
  locationConfirmed: boolean;
  location?: {
    address: string;
    lat: number;
    lng: number;
    city?: string;
    province?: string;
  };
}

export type Section = 
  | 'introduction' 
  | 'demographics' 
  | 'health-status' 
  | 'healthcare-utilization' 
  | 'preferences' 
  | 'family-planning' 
  | 'review';

export const sectionOrder: Section[] = [
  'introduction',
  'demographics',
  'health-status',
  'healthcare-utilization',
  'preferences',
  'family-planning',
  'review',
];

export const initialData: QuestionnaireData = {
  hasStarted: false,
  personalDetails: {
    fullName: '',
    idNumber: '',
    dateOfBirth: '',
    gender: 'male',
    email: '',
    phone: '',
    address: '',
  },
  coverageType: 'just_me',
  numberOfChildren: 0,
  dependents: [],
  chronicConditionStatus: 'no',
  chronicConditions: [],
  hasPlannedProcedures: false,
  plannedProcedures: [],
  medicalAidStatus: 'no',
  doctorVisits: '0',
  hospitalAdmissions: '0',
  highCostDental: false,
  preferredProviders: {
    hasPreferredProviders: false,
    hospitalGroup: undefined,
    specificHospitals: [],
    preferredSpecialists: [],
  },
  budgetRange: 'no_budget',
  dayToDayPreference: 'not_sure',
  networkPreference: 'maybe_depends',
  coPaymentPreference: 'yes_lower_cost',
  benefitPriorities: {
    maternity: 'important',
    mentalHealth: 'nice_to_have',
    dental: 'important',
    optical: 'nice_to_have',
    alternativeMedicine: 'not_important',
    travelCover: 'nice_to_have',
  },
  pregnancyStatus: 'not_planning',
  locationConfirmed: false,
};

export const cdlConditions = [
  "Addison's Disease",
  'Asthma',
  'Bipolar Mood Disorder',
  'Bronchiectasis',
  'Cardiac Failure',
  'Cardiomyopathy',
  'Chronic Obstructive Pulmonary Disease (COPD)',
  'Chronic Renal Disease',
  'Coronary Artery Disease',
  "Crohn's Disease",
  'Diabetes Insipidus',
  'Diabetes Mellitus Type 1',
  'Diabetes Mellitus Type 2',
  'Dysrhythmias',
  'Epilepsy',
  'Glaucoma',
  'Haemophilia',
  'HIV/AIDS',
  'Hyperlipidaemia',
  'Hypertension',
  'Hypothyroidism',
  'Multiple Sclerosis',
  "Parkinson's Disease",
  'Rheumatoid Arthritis',
  'Schizophrenia',
  'Systemic Lupus Erythematosus',
  'Ulcerative Colitis',
];

export const nonCdlConditions = [
  'Anxiety Disorders',
  'Depression',
  'Eczema (severe)',
  'Gout',
  'Insomnia (chronic)',
  'Migraine (chronic)',
  'Osteoarthritis',
  'Psoriasis',
  'Other',
];

export const allConditions = [...cdlConditions, ...nonCdlConditions];
