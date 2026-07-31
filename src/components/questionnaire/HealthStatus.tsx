'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { QuestionnaireData } from '@/types';
import { allConditions } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

// Stable id generator: monotonic counter scoped to the module. Avoids
// Date.now() (impure) and crypto.randomUUID() (incompatible with React
// Compiler's purity rules). Safe because each call to addProcedure is
// user-initiated, so we never collide within the same tick.
let nextProcedureId = 0;
const makeProcedureId = () => `proc-${++nextProcedureId}`;

export function HealthStatus() {
  const { t } = useTranslation();
  const { register, watch, setValue, control } = useFormContext<QuestionnaireData>();

  const chronicConditionStatus = watch('chronicConditionStatus');
  const hasPlannedProcedures = watch('hasPlannedProcedures');
  const chronicConditions = watch('chronicConditions') || [];
  const plannedProcedures = watch('plannedProcedures') || [];

  const toggleCondition = (condition: string) => {
    const current = chronicConditions;
    if (current.includes(condition)) {
      setValue('chronicConditions', current.filter((c) => c !== condition));
    } else {
      setValue('chronicConditions', [...current, condition]);
    }
  };

  const addProcedure = () => {
    setValue('plannedProcedures', [
      ...plannedProcedures,
      { id: makeProcedureId(), who: 'me', procedureType: '', estimatedCost: '' },
    ]);
  };

  const removeProcedure = (index: number) => {
    setValue(
      'plannedProcedures',
      plannedProcedures.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t('healthStatus.title')}</h2>

      <Card>
        <CardHeader>
          <CardTitle>{t('healthStatus.hasChronicCondition')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('healthStatus.chronicNote')}</p>
        </CardHeader>
        <CardContent>
          <Controller
            name="chronicConditionStatus"
            control={control}
            render={({ field }) => (
              <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                {[
                  { value: 'no', label: t('healthStatus.conditionOptions.no') },
                  { value: 'me', label: t('healthStatus.conditionOptions.me') },
                  { value: 'spouse', label: t('healthStatus.conditionOptions.spouse') },
                  { value: 'child', label: t('healthStatus.conditionOptions.child') },
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

      {chronicConditionStatus !== 'no' && chronicConditionStatus && (
        <Card>
          <CardHeader>
            <CardTitle>{t('healthStatus.conditionDetails')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('healthStatus.selectAll')}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto border rounded-lg p-4">
              {allConditions.map((condition) => (
                <div key={condition} className="flex items-center space-x-2">
                  <Checkbox
                    id={condition}
                    checked={chronicConditions.includes(condition)}
                    onCheckedChange={() => toggleCondition(condition)}
                  />
                  <Label htmlFor={condition} className="text-sm">{condition}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('healthStatus.plannedProcedures.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('healthStatus.plannedProcedures.description')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            name="hasPlannedProcedures"
            control={control}
            render={({ field }) => (
              <RadioGroup
                onValueChange={(value) => field.onChange(value === 'true')}
                value={field.value ? 'true' : 'false'}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="procedures-yes" />
                  <Label htmlFor="procedures-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="procedures-no" />
                  <Label htmlFor="procedures-no">No</Label>
                </div>
              </RadioGroup>
            )}
          />

          {hasPlannedProcedures && (
            <div className="space-y-4 mt-4">
              {plannedProcedures.map((procedure, index) => (
                <Card key={procedure.id} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">
                        {t('healthStatus.plannedProcedures.title')} {index + 1}
                      </CardTitle>
                      {plannedProcedures.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProcedure(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>{t('healthStatus.plannedProcedures.who')}</Label>
                        <Controller
                          name={`plannedProcedures.${index}.who`}
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="me">Me</SelectItem>
                                <SelectItem value="spouse">Spouse</SelectItem>
                                <SelectItem value="child">Child</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('healthStatus.plannedProcedures.procedureType')}</Label>
                        <Input {...register(`plannedProcedures.${index}.procedureType`)} />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('healthStatus.plannedProcedures.estimatedCost')}</Label>
                        <Input {...register(`plannedProcedures.${index}.estimatedCost`)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button type="button" variant="outline" onClick={addProcedure} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {t('healthStatus.plannedProcedures.addProcedure')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}