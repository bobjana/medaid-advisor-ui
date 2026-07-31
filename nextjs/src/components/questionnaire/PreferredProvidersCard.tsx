'use client';

import { useState, useEffect } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Search } from 'lucide-react';
import type { QuestionnaireData, HospitalGroup } from '@/types';

const hospitalsByGroup: Record<HospitalGroup, string[]> = {
  netcare: [
    'Netcare Milpark Hospital (Johannesburg)',
    'Netcare Rosebank Hospital (Johannesburg)',
    'Netcare Sunninghill Hospital (Johannesburg)',
    'Netcare Pretoria East Hospital (Pretoria)',
    'Netcare Christiaan Barnard Hospital (Cape Town)',
    'Netcare Blaauwberg Hospital (Cape Town)',
    "Netcare St Augustine's Hospital (Durban)",
    'Netcare Umhlanga Hospital (Durban)',
  ],
  mediclinic: [
    'Mediclinic Morningside (Johannesburg)',
    'Mediclinic Sandton (Johannesburg)',
    'Mediclinic Midstream (Pretoria)',
    'Mediclinic Kloof (Pretoria)',
    'Mediclinic Constantiaberg (Cape Town)',
    'Mediclinic Panorama (Cape Town)',
    'Mediclinic Pietermaritzburg (KZN)',
  ],
  life_healthcare: [
    'Life Brenthurst Clinic (Johannesburg)',
    'Life Flora Clinic (Johannesburg)',
    'Life Eugene Marais Hospital (Pretoria)',
    'Life Groenkloof Hospital (Pretoria)',
    'Life Vincent Pallotti Hospital (Cape Town)',
    'Life Kingsbury Hospital (Cape Town)',
    'Life Entabeni Hospital (Durban)',
    'Life Westville Hospital (Durban)',
  ],
  other: [
    'Charlotte Maxeke Johannesburg Academic Hospital',
    'Chris Hani Baragwanath Hospital',
    'Helen Joseph Hospital',
    'Steve Biko Academic Hospital (Pretoria)',
    'Tygerberg Hospital (Cape Town)',
    'Groote Schuur Hospital (Cape Town)',
    'Addington Hospital (Durban)',
  ],
};

const specialistTypes = [
  'General Practitioner / Family Doctor',
  'Gynecologist',
  'Pediatrician',
  'Cardiologist',
  'Orthopedic Surgeon',
  'Dermatologist',
  'Psychiatrist / Psychologist',
  'Physiotherapist',
  'Dentist',
  'Optometrist / Ophthalmologist',
];

export function PreferredProvidersCard() {
  const { control, watch, setValue } = useFormContext<QuestionnaireData>();
  const preferredProviders = watch('preferredProviders');
  
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<HospitalGroup | ''>('');
  const [showSpecialistSearch, setShowSpecialistSearch] = useState(false);

  useEffect(() => {
    if (preferredProviders?.hasPreferredProviders) {
      setShowProviderSelector(true);
    } else {
      setShowProviderSelector(false);
      setSelectedGroup('');
      setShowSpecialistSearch(false);
    }
  }, [preferredProviders?.hasPreferredProviders]);

  const handleGroupChange = (group: HospitalGroup) => {
    setSelectedGroup(group);
    setValue('preferredProviders.hospitalGroup', group);
    setValue('preferredProviders.specificHospitals', []);
  };

  const handleHospitalToggle = (hospital: string) => {
    const current = preferredProviders?.specificHospitals || [];
    const updated = current.includes(hospital)
      ? current.filter(h => h !== hospital)
      : [...current, hospital];
    setValue('preferredProviders.specificHospitals', updated);
  };

  const handleSpecialistToggle = (specialist: string, checked: boolean) => {
    const current = preferredProviders?.preferredSpecialists || [];
    const updated = checked
      ? [...current, specialist]
      : current.filter(s => s !== specialist);
    setValue('preferredProviders.preferredSpecialists', updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 size={20} />
          Preferred Providers
        </CardTitle>
        <CardDescription>
          Do you have specific hospitals or doctors you prefer to use?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Controller
          name="preferredProviders.hasPreferredProviders"
          control={control}
          render={({ field }) => (
            <RadioGroup 
              onValueChange={(value) => field.onChange(value === 'yes')} 
              value={field.value ? 'yes' : 'no'}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="has-preferred-yes" />
                <Label htmlFor="has-preferred-yes">Yes, I have preferred hospitals/doctors</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="has-preferred-no" />
                <Label htmlFor="has-preferred-no">No, I'm flexible</Label>
              </div>
            </RadioGroup>
          )}
        />

        {showProviderSelector && (
          <div className="mt-6 pt-6 border-t space-y-6 animate-in fade-in slide-in-from-top-2">
            
            {/* Step 1: Hospital Group */}
            <div>
              <Label className="text-base font-medium mb-3 block">
                1. Select Hospital Group
              </Label>
              <Controller
                name="preferredProviders.hospitalGroup"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={(value: HospitalGroup) => handleGroupChange(value)} 
                    value={field.value || ''}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a hospital group..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="netcare">Netcare</SelectItem>
                      <SelectItem value="mediclinic">Mediclinic</SelectItem>
                      <SelectItem value="life_healthcare">Life Healthcare</SelectItem>
                      <SelectItem value="other">Public/Other Hospitals</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Step 2: Specific Hospitals */}
            {selectedGroup && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <Label className="text-base font-medium mb-3 block">
                  2. Select Specific Hospitals
                </Label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {hospitalsByGroup[selectedGroup].map((hospital) => (
                    <div key={hospital} className="flex items-start space-x-2">
                      <Checkbox
                        id={hospital}
                        checked={(preferredProviders?.specificHospitals || []).includes(hospital)}
                        onCheckedChange={() => handleHospitalToggle(hospital)}
                      />
                      <Label htmlFor={hospital} className="text-sm font-normal cursor-pointer">
                        {hospital}
                      </Label>
                    </div>
                  ))}
                </div>
                {(preferredProviders?.specificHospitals || []).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {(preferredProviders?.specificHospitals || []).length} hospital(s) selected
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Specialists */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">
                  3. Preferred Specialists
                </Label>
                <button
                  type="button"
                  onClick={() => setShowSpecialistSearch(!showSpecialistSearch)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Search size={14} />
                  {showSpecialistSearch ? 'Hide' : 'Add specialists'}
                </button>
              </div>

              {showSpecialistSearch && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {specialistTypes.map((specialist) => (
                      <div key={specialist} className="flex items-start space-x-2">
                        <Checkbox
                          id={specialist}
                          checked={(preferredProviders?.preferredSpecialists || []).includes(specialist)}
                          onCheckedChange={(checked) => handleSpecialistToggle(specialist, checked as boolean)}
                        />
                        <Label htmlFor={specialist} className="text-sm font-normal cursor-pointer">
                          {specialist}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(preferredProviders?.preferredSpecialists || []).length > 0 && !showSpecialistSearch && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-1">Selected specialists:</p>
                  <ul className="text-sm text-blue-800">
                    {preferredProviders?.preferredSpecialists?.map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}