'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle, Edit2, FileText, MapPin } from 'lucide-react';

import type { QuestionnaireData, Section } from '@/types';

interface ReviewProps {
  onEditSection: (section: Section) => void;
}

export function Review({ onEditSection }: ReviewProps) {
  const { t } = useTranslation();
  const { watch, control } = useFormContext<QuestionnaireData>();

  const data = watch();

  const sections: { id: Section; title: string; value: string }[] = [
    {
      id: 'demographics',
      title: t('demographics.personalDetails'),
      value: data.personalDetails.fullName || '-',
    },
    {
      id: 'demographics',
      title: t('demographics.coverage.title'),
      value: t(`demographics.coverage.${data.coverageType}`),
    },
    {
      id: 'health-status',
      title: t('healthStatus.title'),
      value: data.chronicConditionStatus === 'no' 
        ? t('healthStatus.conditionOptions.no') 
        : t('healthStatus.conditionOptions.' + data.chronicConditionStatus),
    },
    {
      id: 'health-status',
      title: t('healthStatus.plannedProcedures.title'),
      value: data.hasPlannedProcedures 
        ? `${data.plannedProcedures?.length || 0} procedures` 
        : 'None',
    },
    {
      id: 'healthcare-utilization',
      title: t('healthcareUtilization.currentAid'),
      value: t(`healthcareUtilization.aidOptions.${data.medicalAidStatus}`),
    },
    {
      id: 'preferences',
      title: t('preferences.budget.title'),
      value: t(`preferences.budget.${data.budgetRange}`),
    },
    {
      id: 'preferences',
      title: t('preferences.network.title'),
      value: t(`preferences.network.${data.networkPreference}`),
    },
    {
      id: 'family-planning',
      title: t('familyPlanning.title'),
      value: t(`familyPlanning.options.${data.pregnancyStatus}`),
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t('review.title')}</h2>

      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
            <div>
              <CardTitle className="text-green-900">{t('review.ready')}</CardTitle>
              <CardDescription className="text-green-700 mt-1">
                {t('review.description')}
              </CardDescription>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('review.summary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map((section, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{section.title}</p>
                <p className="text-sm text-muted-foreground">{section.value}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditSection(section.id)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                {t('review.edit')}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 mt-0.5" />
            <div>
              <CardTitle>{t('review.location.title')}</CardTitle>
              <CardDescription>{t('review.location.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3">
            <Controller
              name="locationConfirmed"
              control={control}
              render={({ field }) => (
                <>
                  <Checkbox
                    id="location-confirmed"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="location-confirmed" className="text-sm leading-tight">
                    {t('review.location.confirm')}
                  </Label>
                </>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          className="flex-1"
        >
          <FileText className="w-4 h-4 mr-2" />
          {t('review.printSummary')}
        </Button>
      </div>
    </div>
  );
}