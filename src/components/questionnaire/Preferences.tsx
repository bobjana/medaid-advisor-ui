'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { QuestionnaireData, BenefitPriority } from '@/types';
import { PreferredProvidersCard } from '@/components/questionnaire/PreferredProvidersCard';

const benefitPriorityLabels: BenefitPriority[] = ['critical', 'important', 'nice_to_have', 'not_important'];

export function Preferences() {
  const { t } = useTranslation();
  const { control } = useFormContext<QuestionnaireData>();

  type BenefitField = {
    key: keyof QuestionnaireData['benefitPriorities'];
    label: string;
    note?: string;
  };

  const benefitFields: BenefitField[] = [
    { key: 'maternity', label: t('preferences.benefitsPriority.maternity') },
    { key: 'mentalHealth', label: t('preferences.benefitsPriority.mentalHealth') },
    { key: 'dental', label: t('preferences.benefitsPriority.dental') },
    { key: 'optical', label: t('preferences.benefitsPriority.optical') },
    { key: 'alternativeMedicine', label: t('preferences.benefitsPriority.alternativeMedicine'), note: t('preferences.benefitsPriority.alternativeNote') },
    { key: 'travelCover', label: t('preferences.benefitsPriority.travelCover') },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t('preferences.title')}</h2>

      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.budget.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="budgetRange"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_2000">{t('preferences.budget.under2000')}</SelectItem>
                  <SelectItem value="2000_4000">{t('preferences.budget.2000_4000')}</SelectItem>
                  <SelectItem value="4000_6000">{t('preferences.budget.4000_6000')}</SelectItem>
                  <SelectItem value="6000_8000">{t('preferences.budget.6000_8000')}</SelectItem>
                  <SelectItem value="8000_12000">{t('preferences.budget.8000_12000')}</SelectItem>
                  <SelectItem value="over_12000">{t('preferences.budget.over12000')}</SelectItem>
                  <SelectItem value="no_budget">{t('preferences.budget.noBudget')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.dayToDay.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="dayToDayPreference"
            control={control}
            render={({ field }) => (
              <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                {[
                  { value: 'savings_account', label: t('preferences.dayToDay.savingsAccount') },
                  { value: 'unlimited_cover', label: t('preferences.dayToDay.unlimitedCover') },
                  { value: 'out_of_pocket', label: t('preferences.dayToDay.outOfPocket') },
                  { value: 'not_sure', label: t('preferences.dayToDay.notSure') },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.network.title')}</CardTitle>
          <CardDescription>{t('preferences.network.question')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            name="networkPreference"
            control={control}
            render={({ field }) => (
              <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                {[
                  { value: 'yes_lowest_cost', label: t('preferences.network.yes') },
                  { value: 'maybe_depends', label: t('preferences.network.maybe') },
                  { value: 'no_need_freedom', label: t('preferences.network.no') },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.coPayment.question')}</CardTitle>
          <CardDescription>{t('preferences.coPayment.note')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            name="coPaymentPreference"
            control={control}
            render={({ field }) => (
              <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                {[
                  { value: 'yes_lower_cost', label: t('preferences.coPayment.yes') },
                  { value: 'no_comprehensive', label: t('preferences.coPayment.no') },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.benefitsPriority.title')}</CardTitle>
          <CardDescription>{t('preferences.benefitsPriority.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {benefitFields.map((benefit) => (
              <div key={benefit.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>{benefit.label}</Label>
                  {benefit.note && (
                    <p className="text-xs text-muted-foreground">{benefit.note}</p>
                  )}
                </div>
                <Controller
                  name={`benefitPriorities.${benefit.key}`}
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {benefitPriorityLabels.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label === 'critical' && t('preferences.benefitsPriority.priorityOptions.critical')}
                            {label === 'important' && t('preferences.benefitsPriority.priorityOptions.important')}
                            {label === 'nice_to_have' && t('preferences.benefitsPriority.priorityOptions.niceToHave')}
                            {label === 'not_important' && t('preferences.benefitsPriority.priorityOptions.notImportant')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    
      <PreferredProvidersCard />
    </div>
  );
}