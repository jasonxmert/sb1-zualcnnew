import React, { useEffect, useState } from 'react';
import { Clock, Globe, DollarSign, MapPin, Flag, Mail, Copy } from 'lucide-react';
import clsx from 'clsx';
import { Location } from '../types/location';
import { formatTimeWithZone } from '../utils/timezone';

interface MapPopupProps {
  location: Location;
  position: { x: number; y: number };
  onClose: () => void;
}

export function MapPopup({ location, position, onClose }: MapPopupProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Animate in
    setTimeout(() => setIsVisible(true), 50);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = React.useMemo(() => {
    return formatTimeWithZone(currentTime, location.timezone || 'UTC');
  }, [currentTime, location.timezone]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div 
        className={clsx(
          "absolute bg-white rounded-xl shadow-2xl p-6 w-96 pointer-events-auto",
          "transform transition-all duration-300",
          "border border-gray-100",
          { "opacity-0 scale-95": !isVisible, "opacity-100 scale-100": isVisible }
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `translate(-50%, -100%) translateY(-20px)`
        }}
        onMouseLeave={onClose}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="text-3xl">{getFlagEmoji(location.countryCode)}</div>
            <div>
              <h3 className="font-bold text-gray-900 text-xl">{location.name}</h3>
              <p className="text-sm text-gray-500">{location.country}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DetailCard
              icon={<Mail className="h-5 w-5 text-purple-500" />}
              label="Postcode"
              value={location.postcode}
              onCopy={() => copyToClipboard(location.postcode, 'Postcode')}
              copySuccess={copySuccess === 'Postcode'}
              bgColor="bg-purple-50 hover:bg-purple-100"
            />
            <DetailCard
              icon={<Clock className="h-5 w-5 text-blue-500" />}
              label="Local Time"
              value={formattedTime}
              onCopy={() => copyToClipboard(formattedTime, 'Time')}
              copySuccess={copySuccess === 'Time'}
              bgColor="bg-blue-50 hover:bg-blue-100"
            />
            <DetailCard
              icon={<MapPin className="h-5 w-5 text-red-500" />}
              label="Coordinates"
              value={`${location.coordinates[1].toFixed(4)}, ${location.coordinates[0].toFixed(4)}`}
              onCopy={() => copyToClipboard(`${location.coordinates[1].toFixed(6)}, ${location.coordinates[0].toFixed(6)}`, 'Coordinates')}
              copySuccess={copySuccess === 'Coordinates'}
              bgColor="bg-red-50 hover:bg-red-100"
            />
            <DetailCard
              icon={<DollarSign className="h-5 w-5 text-green-500" />}
              label="Currency"
              value={location.currency}
              onCopy={() => copyToClipboard(location.currency, 'Currency')}
              copySuccess={copySuccess === 'Currency'}
              bgColor="bg-green-50 hover:bg-green-100"
            />
            <DetailCard
              icon={<Flag className="h-5 w-5 text-orange-500" />}
              label="Country Code"
              value={location.countryCode}
              onCopy={() => copyToClipboard(location.countryCode, 'Country Code')}
              copySuccess={copySuccess === 'Country Code'}
              bgColor="bg-orange-50 hover:bg-orange-100"
            />
            <DetailCard
              icon={<Globe className="h-5 w-5 text-indigo-500" />}
              label="Domain"
              value={`.${location.countryCode.toLowerCase()}`}
              onCopy={() => copyToClipboard(`.${location.countryCode.toLowerCase()}`, 'Domain')}
              copySuccess={copySuccess === 'Domain'}
              bgColor="bg-indigo-50 hover:bg-indigo-100"
            />
          </div>
        </div>

        <button
          className="absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-full p-1.5 hover:bg-gray-100 transition-colors"
          onClick={onClose}
        >
          <span className="sr-only">Close</span>
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="absolute -bottom-2 left-1/2 w-4 h-4 bg-white transform rotate-45 -translate-x-1/2 border-r border-b border-gray-100" />
      </div>
    </div>
  );
}

interface DetailCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy: () => void;
  copySuccess: boolean;
  bgColor: string;
}

function DetailCard({ icon, label, value, onCopy, copySuccess, bgColor }: DetailCardProps) {
  return (
    <div className={clsx(
      "rounded-lg p-3 transition-all",
      bgColor
    )}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm text-gray-600 font-medium">{label}</p>
        </div>
        <button
          onClick={onCopy}
          className="p-1 hover:bg-white/50 rounded-full transition-colors"
          title="Copy to clipboard"
        >
          {copySuccess ? (
            <span className="text-green-500 text-xs font-medium">Copied!</span>
          ) : (
            <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          )}
        </button>
      </div>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}