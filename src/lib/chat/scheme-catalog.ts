import type { SchemeOption } from '@/types';

/**
 * Fallback scheme/plan catalogue for the context picker.
 *
 * The agent sends the authoritative catalogue in a `context_options` event when
 * it prompts for a scheme, and the picker prefers that. This snapshot mirrors
 * `medaid-advisor-adk/medaid_advisor_agent/schemes/*.json` so the picker is
 * populated even before the first prompt, or when the agent answered a
 * scheme-specific question directly (and never emitted the catalogue).
 *
 * Keep in sync when a scheme or plan is added upstream.
 */
export const SCHEME_CATALOG: SchemeOption[] = [
  {
    slug: 'bonitas',
    name: 'Bonitas Medical Fund',
    plans: [
      { id: 'boncomprehensive', name: 'BonComprehensive' },
      { id: 'boncomplete', name: 'BonComplete' },
      { id: 'bonprime', name: 'BonPrime' },
      { id: 'bonclassic', name: 'BonClassic' },
      { id: 'bonsave', name: 'BonSave' },
      { id: 'bonfit', name: 'BonFit' },
      { id: 'bonessential', name: 'BonEssential' },
      { id: 'bonessential_select', name: 'BonEssential Select' },
      { id: 'boncore', name: 'BonCore' },
      { id: 'bonstart', name: 'BonStart' },
      { id: 'bonstart_plus', name: 'BonStart Plus' },
      { id: 'boncap', name: 'BonCap' },
    ],
  },
  {
    slug: 'discovery',
    name: 'Discovery Health Medical Scheme',
    plans: [
      { id: 'executive', name: 'Executive Plan' },
      { id: 'classic_comprehensive', name: 'Classic Comprehensive' },
      { id: 'classic_priority', name: 'Classic Priority' },
      { id: 'classic_saver', name: 'Classic Saver' },
      { id: 'classic_core', name: 'Classic Core' },
      { id: 'classic_smart', name: 'Classic Smart' },
      { id: 'keycare_plus', name: 'KeyCare Plus' },
    ],
  },
];
