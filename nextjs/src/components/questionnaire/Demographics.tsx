'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { QuestionnaireData, CoverageType, Relationship } from '@/types';

export function Demographics() {
  const { t } = useTranslation();
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<QuestionnaireData>();

  const coverageType = watch('coverageType');
  const dependents = watch('dependents') || [];

  const handleCoverageChange = (value: string) => {
    const newCoverage = value as CoverageType;
    setValue('coverageType', newCoverage);

    if (newCoverage === 'just_me') {
      setValue('dependents', []);
      setValue('numberOfChildren', 0);
    } else if (newCoverage === 'me_spouse') {
      setValue('dependents', [{
        id: '1',
        name: '',
        dateOfBirth: '',
        relationship: 'spouse',
        hasChronicCondition: false
      }]);
      setValue('numberOfChildren', 0);
    } else if (newCoverage === 'me_children') {
      setValue('numberOfChildren', 1);
      setValue('dependents', [{
        id: '1',
        name: '',
        dateOfBirth: '',
        relationship: 'child',
        hasChronicCondition: false
      }]);
    } else if (newCoverage === 'me_spouse_children') {
      setValue('numberOfChildren', 1);
      setValue('dependents', [
        { id: '1', name: '', dateOfBirth: '', relationship: 'spouse', hasChronicCondition: false },
        { id: '2', name: '', dateOfBirth: '', relationship: 'child', hasChronicCondition: false },
      ]);
    }
  };

  const updateNumberOfChildren = (count: number) => {
    setValue('numberOfChildren', count);
    const currentDependents = watch('dependents') || [];
    const spouseDependent = currentDependents.find(d => d.relationship === 'spouse');

    const newDependents = spouseDependent ? [spouseDependent] : [];
    for (let i = 0; i < count; i++) {
      newDependents.push({
        id: `child-${i + 1}`,
        name: '',
        dateOfBirth: '',
        relationship: 'child' as Relationship,
        hasChronicCondition: false,
      });
    }
    setValue('dependents', newDependents);
  };

  const coverageOptions: { value: CoverageType; label: string; description?: string }[] = [
    { value: 'just_me', label: t('demographics.coverage.justMe') },
    { value: 'me_spouse', label: t('demographics.coverage.meSpouse'), description: t('demographics.coverage.note') },
    { value: 'me_children', label: t('demographics.coverage.meChildren') },
    { value: 'me_spouse_children', label: t('demographics.coverage.meSpouseChildren') },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t('demographics.title')}</h2>

      <Card>
        <CardHeader>
          <CardTitle>{t('demographics.personalDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="space-y-2 md:col-span-6">
              <Label>{t('demographics.fullName')}</Label>
              <Input {...register('personalDetails.fullName')} />
              {errors.personalDetails?.fullName && (
                <p className="text-sm text-red-500">{errors.personalDetails.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-6">
              <Label>{t('demographics.idNumber')}</Label>
              <Input {...register('personalDetails.idNumber')} />
              {errors.personalDetails?.idNumber && (
                <p className="text-sm text-red-500">{errors.personalDetails.idNumber.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-6">
              <Label>{t('demographics.dateOfBirth')}</Label>
              <Input type="date" {...register('personalDetails.dateOfBirth')} />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label>{t('demographics.gender')}</Label>
              <Controller
                name="personalDetails.gender"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('demographics.genderOptions.male')}</SelectItem>
                      <SelectItem value="female">{t('demographics.genderOptions.female')}</SelectItem>
                      <SelectItem value="other">{t('demographics.genderOptions.other')}</SelectItem>
                      <SelectItem value="prefer_not_to_say">{t('demographics.genderOptions.preferNotToSay')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label>{t('demographics.language')}</Label>
              <LanguageSelector />
            </div>

            <div className="space-y-2 md:col-span-6">
              <Label>{t('demographics.email')}</Label>
              <Input type="email" {...register('personalDetails.email')} />
              {errors.personalDetails?.email && (
                <p className="text-sm text-red-500">{errors.personalDetails.email.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-6">
              <Label>{t('demographics.phone')}</Label>
              <Input type="tel" {...register('personalDetails.phone')} />
              {errors.personalDetails?.phone && (
                <p className="text-sm text-red-500">{errors.personalDetails.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('demographics.address')}</Label>
            <Textarea {...register('personalDetails.address')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('demographics.coverage.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="coverageType"
            control={control}
            render={({ field }) => (
              <RadioGroup
                onValueChange={handleCoverageChange}
                value={field.value}
                className="space-y-3"
              >
                {coverageOptions.map((option) => (
                  <div key={option.value} className="flex items-start space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor={option.value} className="font-medium">
                        {option.label}
                      </Label>
                      {option.description && (
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        </CardContent>
      </Card>

      {(coverageType === 'me_children' || coverageType === 'me_spouse_children') && (
        <Card>
          <CardHeader>
            <CardTitle>{t('demographics.coverage.numberOfChildren')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="numberOfChildren"
              control={control}
              render={({ field }) => (
                <Select onValueChange={(v) => updateNumberOfChildren(parseInt(v))} value={String(field.value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-sm text-muted-foreground mt-2">{t('demographics.coverage.childrenNote')}</p>
          </CardContent>
        </Card>
      )}

      {dependents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('demographics.dependents.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dependents.map((dependent, index) => (
              <Card key={dependent.id} className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {dependent.relationship === 'spouse'
                      ? t('demographics.dependents.spouse')
                      : `${t('demographics.dependents.child')} ${index + (coverageType === 'me_spouse_children' ? 0 : 1)}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('demographics.dependents.name')}</Label>
                      <Input {...register(`dependents.${index}.name`)} />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('demographics.dependents.dateOfBirth')}</Label>
                      <Input type="date" {...register(`dependents.${index}.dateOfBirth`)} />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      name={`dependents.${index}.hasChronicCondition`}
                      control={control}
                      render={({ field }) => (
                        <>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id={`chronic-${index}`}
                          />
                          <Label htmlFor={`chronic-${index}`}>{t('demographics.dependents.hasChronicCondition')}</Label>
                        </>
                      )}
                    />
                  </div>

                  {dependent.hasChronicCondition && (
                    <div className="space-y-2">
                      <Label>{t('demographics.dependents.conditionName')}</Label>
                      <Input
                        {...register(`dependents.${index}.chronicConditionName`)}
                        placeholder="e.g., Diabetes Type 1, Asthma"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}