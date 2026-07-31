'use client';

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Shield, Edit3 } from 'lucide-react';

interface IntroductionProps {
  onStart: () => void;
}

export function Introduction({ onStart }: IntroductionProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t('app.title')}</CardTitle>
        <CardDescription>{t('app.subtitle')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Clock className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-medium">{t('app.timeEstimate')}</p>
          </div>
          <div>
            <Shield className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-medium">{t('app.confidential')}</p>
          </div>
          <div>
            <Edit3 className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-medium">{t('app.canEdit')}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('privacy.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(t('privacy.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">&bull;</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Button onClick={onStart} className="w-full">
          {t('navigation.start')}
        </Button>
      </CardContent>
    </Card>
  );
}