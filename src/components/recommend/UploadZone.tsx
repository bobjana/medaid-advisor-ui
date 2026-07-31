'use client';

import { useState, useRef } from 'react';
import { Upload, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { QuestionnaireData } from '@/types';

interface UploadZoneProps {
  onDataLoaded: (data: QuestionnaireData) => void;
}

const STORAGE_KEY = 'medaid-questionnaire';

export function UploadZone({ onDataLoaded }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        onDataLoaded(parsed as QuestionnaireData);
      } catch {
        setError('Invalid JSON file');
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  }

  function loadFromStorage() {
    setError(null);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setError('No questionnaire data found in localStorage');
        return;
      }
      const parsed = JSON.parse(raw);
      onDataLoaded(parsed as QuestionnaireData);
    } catch {
      setError('Failed to parse stored questionnaire data');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Data</CardTitle>
        <CardDescription>
          Upload a JSON file or use data from a completed questionnaire
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-primary');
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('border-primary');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-primary');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Drop JSON file here or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={loadFromStorage}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Use Questionnaire Data
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}