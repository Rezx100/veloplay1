import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { getCurrentDateInET } from '@/hooks/useGames';

interface DatePickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function DatePicker({ selectedDate, onDateSelect }: DatePickerProps) {
  // Generate 10 days starting from current ET date with normalized dates
  const dates = useMemo(() => {
    // Get current date in Eastern Time
    const currentETDate = getCurrentDateInET();
    
    // Generate dates array with normalized dates (no time component) starting from current date
    return Array.from({ length: 10 }, (_, i) => {
      // Create a new date object for each day to avoid reference issues
      const newDate = new Date(
        currentETDate.getFullYear(),
        currentETDate.getMonth(),
        currentETDate.getDate() + i,
        0, 0, 0, 0
      );
      return newDate;
    });
  }, []);

  // Check if date is selected using date-fns isSameDay for more reliable comparison
  const isSelected = (date: Date) => {
    const result = isSameDay(date, selectedDate);
    // Debug log with day values to help troubleshoot date issues
    if (result) {
      console.log(`Date picker: selected date ${date.toISOString()}`);
    }
    return result;
  };

  return (
    <div className="flex overflow-x-auto mb-6 gap-2 pb-2 px-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
      {dates.map((date, index) => {
        const day = format(date, 'EEE').toUpperCase();
        const dayNum = format(date, 'd');
        const dayMonth = format(date, 'MMM');
        // First date in the picker gets special highlighting (replacing the "Today" highlight)
        const isFirstDate = index === 0;
        
        return (
          <button
            key={date.toISOString()}
            onClick={() => {
              // Create a normalized version of the date to ensure consistency
              const normalizedDate = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                0, 0, 0, 0
              );
              console.log(`Date picker: selected date ${normalizedDate.toISOString()}`);
              onDateSelect(normalizedDate);
            }}
            className={`min-w-[4.5rem] p-2 border ${
              isSelected(date) 
                ? 'bg-primary text-white border-primary' 
                : isFirstDate
                  ? 'bg-[#1a1a1a] border-gray-600 hover:bg-[#202020]'
                  : 'bg-[#1a1a1a] border-transparent hover:bg-[#202020]'
            } rounded-lg text-center transition-colors`}
            aria-pressed={isSelected(date)}
          >
            <div className={`text-xs ${isSelected(date) ? 'text-white' : 'text-gray-400'}`}>
              {day}
            </div>
            <div className={`text-lg font-bold ${isSelected(date) ? 'text-white' : ''}`}>
              {dayNum}
            </div>
            <div className={`text-xs ${isSelected(date) ? 'text-white' : 'text-gray-400'}`}>
              {dayMonth}
            </div>
          </button>
        );
      })}
    </div>
  );
}
