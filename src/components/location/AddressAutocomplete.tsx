'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, X } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

// Mock data for South African addresses
const mockAddresses = [
  '123 Main Street, Johannesburg, Gauteng',
  '456 Church Street, Pretoria, Gauteng',
  '789 Beach Road, Cape Town, Western Cape',
  '101 Long Street, Cape Town, Western Cape',
  '202 Main Road, Durban, KwaZulu-Natal',
];

export function AddressAutocomplete({ value, onChange, placeholder = 'Enter your address' }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onChange(query);

    if (query.length >= 3) {
      setIsLoading(true);
      setTimeout(() => {
        const filtered = mockAddresses.filter(addr => 
          addr.toLowerCase().includes(query.toLowerCase())
        );
        setSuggestions(filtered);
        setShowSuggestions(true);
        setIsLoading(false);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [onChange]);

  const handleSelectAddress = useCallback((address: string) => {
    onChange(address, -26.2041, 28.0473);
    setShowSuggestions(false);
    setSuggestions([]);
  }, [onChange]);

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange('Current Location (GPS)', position.coords.latitude, position.coords.longitude);
        setIsLoading(false);
      },
      (error) => {
        alert('Failed to get location: ' + error.message);
        setIsLoading(false);
      }
    );
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pr-10"
          />
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGetCurrentLocation}
          disabled={isLoading}
          title="Use current location"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <MapPin size={18} />}
        </Button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((address, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
              onClick={() => handleSelectAddress(address)}
            >
              {address}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}