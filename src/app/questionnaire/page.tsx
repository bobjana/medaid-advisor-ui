'use client';

import { useState, useEffect } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@/i18n';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

import { questionnaireSchema } from '@/lib/validation';
import type { QuestionnaireData, Section } from '@/types';
import { initialData, sectionOrder } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

import { Introduction } from '@/components/questionnaire/Introduction';
import { Demographics } from '@/components/questionnaire/Demographics';
import { HealthStatus } from '@/components/questionnaire/HealthStatus';
import { HealthcareUtilization } from '@/components/questionnaire/HealthcareUtilization';
import { Preferences } from '@/components/questionnaire/Preferences';
import { FamilyPlanning } from '@/components/questionnaire/FamilyPlanning';
import { Review } from '@/components/questionnaire/Review';

export default function QuestionnairePage() {
  const { t } = useTranslation();
  const [currentSection, setCurrentSection] = useState<Section>('introduction');
  const [savedData, setSavedData, clearSavedData] = useLocalStorage<QuestionnaireData>(
    'medaid-questionnaire',
    initialData
  );

  const methods = useForm<QuestionnaireData>({
    resolver: zodResolver(questionnaireSchema as never),
    defaultValues: savedData,
    mode: 'onBlur',
  });

  const { setValue, handleSubmit, reset } = methods;

  // useWatch (not watch) is the React-Compiler-compatible way to subscribe
  // to form value changes — watch() returns a function that React Compiler
  // cannot safely memoize.
  const watchedData = useWatch({ control: methods.control }) as QuestionnaireData;

  useEffect(() => {
    if (watchedData) {
      setSavedData(watchedData);
    }
  }, [watchedData, setSavedData]);

  const currentIndex = sectionOrder.indexOf(currentSection);
  const progress = ((currentIndex + 1) / sectionOrder.length) * 100;

  const handleStart = () => {
    setValue('hasStarted', true);
    setCurrentSection('demographics');
  };

  const handleNext = () => {
    if (currentIndex < sectionOrder.length - 1) {
      setCurrentSection(sectionOrder[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentSection(sectionOrder[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEditSection = (section: Section) => {
    setCurrentSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitForm = (data: QuestionnaireData) => {
    console.log('Submitting questionnaire:', data);
    alert(t('success.message'));
    clearSavedData();
    reset(initialData);
    setCurrentSection('introduction');
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data and start over?')) {
      clearSavedData();
      reset(initialData);
      setCurrentSection('introduction');
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'introduction':
        return <Introduction onStart={handleStart} />;
      case 'demographics':
        return <Demographics />;
      case 'health-status':
        return <HealthStatus />;
      case 'healthcare-utilization':
        return <HealthcareUtilization />;
      case 'preferences':
        return <Preferences />;
      case 'family-planning':
        return <FamilyPlanning />;
      case 'review':
        return <Review onEditSection={handleEditSection} />;
      default:
        return <Introduction onStart={handleStart} />;
    }
  };

  const getSectionTitle = () => {
    return t(`sections.${currentSection.replace('-', '')}`);
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(handleSubmitForm)}
        className="min-h-screen bg-background"
      >
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">{t('app.title')}</h1>
              <p className="text-muted-foreground text-sm">
                {t('app.subtitle')}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">{getSectionTitle()}</span>
              <span className="text-muted-foreground">
                {currentIndex + 1} {t('common.of')} {sectionOrder.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Card>
            <CardContent className="pt-6">{renderSection()}</CardContent>
          </Card>

          {currentSection !== 'introduction' && (
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t('navigation.previous')}
              </Button>

              {currentSection !== 'review' ? (
                <Button type="button" onClick={handleNext}>
                  {t('navigation.next')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" variant="default">
                  {t('navigation.submit')}
                </Button>
              )}
            </div>
          )}

          <Separator className="my-6" />

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearData}
              className="text-muted-foreground"
            >
              {t('common.clearData')}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}