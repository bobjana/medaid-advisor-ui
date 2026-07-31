'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { QuestionnaireData } from '@/types';

export function HealthcareUtilization() {
  const { t } = useTranslation();
  const { register, watch, control } = useFormContext<QuestionnaireData>();

  const medicalAidStatus = watch('medicalAidStatus');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t('healthcareUtilization.title')}</h2>

      <Card>
        <CardHeader>
          <CardTitle>{t('healthcareUtilization.currentAid')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            name="medicalAidStatus"
            control={control}
            render={({ field }) => (
              <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                {[
                  { value: 'no', label: t('healthcareUtilization.aidOptions.no') },
                  { value: 'individual', label: t('healthcareUtilization.aidOptions.individual') },
                  { value: 'employer', label: t('healthcareUtilization.aidOptions.employer') },
                  { value: 'spouse_employer', label: t('healthcareUtilization.aidOptions.spouseEmployer') },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />

          {medicalAidStatus && medicalAidStatus !== 'no' && (
            <div className="space-y-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>{t('healthcareUtilization.scheme')}</Label>
                <Controller
                  name="currentScheme"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discovery">{t('healthcareUtilization.schemes.discovery')}</SelectItem>
                        <SelectItem value="bonitas">{t('healthcareUtilization.schemes.bonitas')}</SelectItem>
                        <SelectItem value="bestmed">{t('healthcareUtilization.schemes.bestmed')}</SelectItem>
                        <SelectItem value="medihelp">{t('healthcareUtilization.schemes.medihelp')}</SelectItem>
                        <SelectItem value="momentum">{t('healthcareUtilization.schemes.momentum')}</SelectItem>
                        <SelectItem value="fedhealth">{t('healthcareUtilization.schemes.fedhealth')}</SelectItem>
                        <SelectItem value="other">{t('healthcareUtilization.schemes.other')}</SelectItem>
                        <SelectItem value="prefer_not_to_say">{t('healthcareUtilization.schemes.preferNotToSay')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('healthcareUtilization.satisfaction')}</Label>
                <Controller
                  name="satisfactionLevel"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-4">
                      {[
                        { value: 'very_satisfied', label: t('healthcareUtilization.satisfactionOptions.verySatisfied') },
                        { value: 'satisfied', label: t('healthcareUtilization.satisfactionOptions.satisfied') },
                        { value: 'neutral', label: t('healthcareUtilization.satisfactionOptions.neutral') },
                        { value: 'dissatisfied', label: t('healthcareUtilization.satisfactionOptions.dissatisfied') },
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label htmlFor={option.value}>{option.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('healthcareUtilization.usagePatterns')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('healthcareUtilization.doctorVisits')}</Label>
            <Controller
              name="doctorVisits"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1-3">1-3</SelectItem>
                    <SelectItem value="4-6">4-6</SelectItem>
                    <SelectItem value="7+">7+</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('healthcareUtilization.hospitalAdmissions')}</Label>
            <Controller
              name="hospitalAdmissions"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3+">3+</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="highCostDental"
              control={control}
              render={({ field }) => (
                <>
                  <Checkbox id="high-cost-dental" checked={field.value} onCheckedChange={field.onChange} />
                  <Label htmlFor="high-cost-dental">{t('healthcareUtilization.highCostDental')}</Label>
                </>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('healthcareUtilization.preferredProviders')}</Label>
            <Textarea
              {...register('preferredProviders')}
              placeholder="e.g., Netcare, Mediclinic, specific hospitals or doctors"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}