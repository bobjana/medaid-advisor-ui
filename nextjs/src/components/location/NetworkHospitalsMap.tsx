'use client';


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Phone } from 'lucide-react';

interface Hospital {
  name: string;
  network: string;
  address: string;
  distance: string;
  phone?: string;
  lat: number;
  lng: number;
}

// Mock network hospitals data for South Africa
const networkHospitals: Record<string, Hospital[]> = {
  'Johannesburg': [
    { name: 'Netcare Milpark Hospital', network: 'Netcare', address: '9 Guild Road, Parktown West', distance: '3.2 km', phone: '011 480 5600', lat: -26.1789, lng: 28.0174 },
    { name: 'Life Brenthurst Clinic', network: 'Life Healthcare', address: '4 Park Lane, Parktown', distance: '4.1 km', phone: '011 643 3400', lat: -26.1834, lng: 28.0289 },
    { name: 'Mediclinic Morningside', network: 'Mediclinic', address: 'Cnr Rivonia & Hill Roads, Morningside', distance: '5.8 km', phone: '011 786 6700', lat: -26.0892, lng: 28.0571 },
  ],
  'Pretoria': [
    { name: 'Life Eugene Marais Hospital', network: 'Life Healthcare', address: '696 5th Street, Muckleneuk', distance: '2.5 km', phone: '012 343 1800', lat: -25.7700, lng: 28.2100 },
    { name: 'Mediclinic Kloof', network: 'Mediclinic', address: '511 5th Street, Muckleneuk', distance: '2.8 km', phone: '012 440 0200', lat: -25.7689, lng: 28.2156 },
  ],
  'Cape Town': [
    { name: 'Netcare Christiaan Barnard Hospital', network: 'Netcare', address: '181 Longmarket Street, CBD', distance: '1.2 km', phone: '021 480 6111', lat: -33.9249, lng: 18.4241 },
    { name: 'Life Vincent Pallotti Hospital', network: 'Life Healthcare', address: '10 Hopkins Street, Pinelands', distance: '4.5 km', phone: '021 506 6000', lat: -33.9378, lng: 18.4922 },
  ],
  'Durban': [
    { name: 'Life Entabeni Hospital', network: 'Life Healthcare', address: '148 Mazisi Kunene Road, Berea', distance: '2.1 km', phone: '031 204 1300', lat: -29.8587, lng: 31.0218 },
    { name: 'Netcare St Augustine\'s Hospital', network: 'Netcare', address: '107 Chelmsford Road, Berea', distance: '3.4 km', phone: '031 268 5000', lat: -29.8489, lng: 30.9934 },
  ],
};

interface NetworkHospitalsMapProps {
  location: {
    address: string;
    lat: number;
    lng: number;
    city?: string;
  } | null;
  // maxDistance prop for future use
}

export function NetworkHospitalsMap({ location }: NetworkHospitalsMapProps) {
  if (!location) {
    return (
      <Card className="bg-muted">
        <CardContent className="p-6 text-center text-muted-foreground">
          <MapPin className="mx-auto mb-2" size={24} />
          <p>Enter your address to see nearby network hospitals</p>
        </CardContent>
      </Card>
    );
  }

  // Find hospitals for the city (mock logic - would use actual distance calculation)
  const city = location.city || 'Johannesburg';
  const hospitals = networkHospitals[city] || networkHospitals['Johannesburg'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Navigation size={20} />
          Nearby Network Hospitals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Showing hospitals near: <strong>{location.address}</strong>
        </div>

        <div className="space-y-3">
          {hospitals.map((hospital, index) => (
            <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm">{hospital.name}</h4>
                  <p className="text-xs text-muted-foreground">{hospital.network}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {hospital.distance}
                </span>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                <p>{hospital.address}</p>
                {hospital.phone && (
                  <p className="flex items-center gap-1 mt-1">
                    <Phone size={12} />
                    {hospital.phone}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-blue-50 rounded">
          <strong>Tip:</strong> Plans with network restrictions typically offer lower premiums 
          when you use these designated hospitals.
        </div>
      </CardContent>
    </Card>
  );
}