'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { QuestionnaireData } from '@/types';

export function FamilyPlanning() {
  const { t } = useTranslation();
  const { control, watch } = useFormContext<QuestionnaireData>();

  const pregnancyStatus = watch('pregnancyStatus');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t('familyPlanning.title')}</h2>

      <Card>
        <CardHeader>
          <CardTitle>{t('familyPlanning.question')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="pregnancyStatus"
            control={control}
            render={({ field }) => (
              <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                {[
                  { value: 'currently_pregnant', label: t('familyPlanning.options.currentlyPregnant') },
                  { value: 'planning_12_months', label: t('familyPlanning.options.planning12Months') },
                  { value: 'planning_future', label: t('familyPlanning.options.planningFuture') },
                  { value: 'not_planning', label: t('familyPlanning.options.notPlanning') },
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

      {(pregnancyStatus === 'currently_pregnant' || pregnancyStatus === 'planning_12_months') && (
        <Card>
          <CardHeader>
            <CardTitle>{t('familyPlanning.birthPreference')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="birthPreference"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital">{t('familyPlanning.birthOptions.hospital')}</SelectItem>
                    <SelectItem value="home_midwife">{t('familyPlanning.birthOptions.homeMidwife')}</SelectItem>
                    <SelectItem value="not_sure">{t('familyPlanning.birthOptions.notSure')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}