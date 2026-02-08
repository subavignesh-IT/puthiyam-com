import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SaleCountdownTimerProps {
  endTime: string;
  compact?: boolean;
}

const SaleCountdownTimer: React.FC<SaleCountdownTimerProps> = ({ endTime, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        expired: false,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (timeLeft.expired) {
    return null;
  }

  if (compact) {
    return (
      <Badge 
        variant="outline" 
        className="bg-gradient-to-r from-destructive to-orange-500 text-white border-0 shadow-lg text-[10px] px-2 py-1 font-bold animate-pulse"
      >
        <Clock className="w-3 h-3 mr-1" />
        {timeLeft.days > 0 
          ? `${timeLeft.days}d ${timeLeft.hours}h` 
          : timeLeft.hours > 0 
            ? `${timeLeft.hours}h ${timeLeft.minutes}m` 
            : `${timeLeft.minutes}m ${timeLeft.seconds}s`}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-destructive/10 rounded-lg px-2 py-1 border border-destructive/20">
      <Clock className="w-3 h-3 text-destructive animate-pulse-soft" />
      <div className="flex items-center gap-1 text-xs font-medium text-destructive">
        {timeLeft.days > 0 && (
          <span className="bg-destructive/20 px-1 rounded">{timeLeft.days}d</span>
        )}
        <span className="bg-destructive/20 px-1 rounded">{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span className="bg-destructive/20 px-1 rounded">{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span className="bg-destructive/20 px-1 rounded">{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
};

export default SaleCountdownTimer;
