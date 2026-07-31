import type { QuestionnaireData } from './questionnaire';

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  sessionId?: string;
}

export interface PlanScore {
  planId: string;
  planName: string;
  score: number;
  monthlyPremium: number;
  keyBenefits: string[];
}

export interface PlanRecommendationRequest {
  clientData: QuestionnaireData;
}

export interface PlanRecommendationResponse {
  recommendations: PlanScore[];
  reasoning: string[];
  alternatives: PlanScore[];
}