import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, Check } from 'lucide-react';

interface CalendarDatePickerProps {
  value: string;
  onChange: (formattedDate: string) => void;
  label?: string;
  placeholder?: string;
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAYS_OF_WEEK = [
  { label: 'Min', full: 'Minggu', isWeekend: true },
  { label: 'Sen', full: 'Senin', isWeekend: false },
  { label: 'Sel', full: 'Selasa', isWeekend: false },
  { label: 'Rab', full: 'Rabu', isWeekend: false },
  { label: 'Kam', full: 'Kamis', isWeekend: false },
  { label: 'Jum', full: 'Jumat', isWeekend: false },
  { label: 'Sab', full: 'Sabtu', isWeekend: false },
];

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  value,
  onChange,
  label = 'Tanggal Publikasi Instagram',
  placeholder = 'Pilih tanggal publikasi...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to current date
  const parseInitialDate = (): Date => {
    if (!value) return new Date();
    // Try parsing Indonesian format: "14 Oktober 2024"
    const parts = value.trim().split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthIdx = INDONESIAN_MONTHS.findIndex(
        (m) => m.toLowerCase() === parts[1].toLowerCase()
      );
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && monthIdx !== -1 && !isNaN(year)) {
        return new Date(year, monthIdx, day);
      }
    }
    const standardDate = new Date(value);
    if (!isNaN(standardDate.getTime())) return standardDate;
    return new Date();
  };

  const initialDate = parseInitialDate();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  // Sync state if value changes externally
  useEffect(() => {
    if (value) {
      const d = parseInitialDate();
      setSelectedDate(d);
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  }, [value]);

  // Close calendar when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formatIndonesianDate = (date: Date): string => {
    const day = date.getDate();
    const month = INDONESIAN_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
    onChange(formatIndonesianDate(newDate));
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    onChange(formatIndonesianDate(today));
    setIsOpen(false);
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday);
    setCurrentMonth(yesterday.getMonth());
    setCurrentYear(yesterday.getFullYear());
    onChange(formatIndonesianDate(yesterday));
    setIsOpen(false);
  };

  const handleSetDaysAgo = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() - days);
    setSelectedDate(target);
    setCurrentMonth(target.getMonth());
    setCurrentYear(target.getFullYear());
    onChange(formatIndonesianDate(target));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Days in month calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  const isSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      now.getDate() === day &&
      now.getMonth() === currentMonth &&
      now.getFullYear() === currentYear
    );
  };

  // Generate Year options (current year - 5 to + 3)
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 6 + i);

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-blue-600 font-medium">Kalender Interaktif</span>
        </label>
      )}

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3.5 py-2 rounded-xl border bg-white transition-all cursor-pointer shadow-xs select-none ${
          isOpen
            ? 'border-[#07529A] ring-2 ring-blue-100'
            : 'border-slate-300 hover:border-[#07529A]'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#07529A] flex items-center justify-center shrink-0 border border-blue-100">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <span
              className={`text-xs block leading-tight ${
                value ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
              }`}
            >
              {value || placeholder}
            </span>
            <span className="text-[10px] text-slate-400 block leading-tight">
              Format: Tanggal Bulan Tahun
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              title="Hapus tanggal"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] uppercase font-bold text-[#07529A] bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 transition-colors flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            <span>Pilih</span>
          </span>
        </div>
      </div>

      {/* Floating Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 sm:left-auto sm:right-0 w-[310px] sm:w-[330px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-[#07529A] transition-colors cursor-pointer border border-transparent hover:border-blue-100"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick dropdown selectors for Month and Year */}
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <select
                value={currentMonth}
                onChange={(e) => {
                  const nextMonth = parseInt(e.target.value, 10);
                  setCurrentMonth(nextMonth);
                  if (value) {
                    const maxDay = new Date(currentYear, nextMonth + 1, 0).getDate();
                    const clampedDay = Math.min(selectedDate.getDate(), maxDay);
                    const updated = new Date(currentYear, nextMonth, clampedDay);
                    setSelectedDate(updated);
                    onChange(formatIndonesianDate(updated));
                  }
                }}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#07529A] cursor-pointer"
              >
                {INDONESIAN_MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => {
                  const nextYear = parseInt(e.target.value, 10);
                  setCurrentYear(nextYear);
                  if (value) {
                    const maxDay = new Date(nextYear, currentMonth + 1, 0).getDate();
                    const clampedDay = Math.min(selectedDate.getDate(), maxDay);
                    const updated = new Date(nextYear, currentMonth, clampedDay);
                    setSelectedDate(updated);
                    onChange(formatIndonesianDate(updated));
                  }
                }}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#07529A] cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-[#07529A] transition-colors cursor-pointer border border-transparent hover:border-blue-100"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center justify-between gap-1.5 py-2.5 border-b border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={handleSetToday}
              className="flex-1 py-1 px-1 text-center font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-[#07529A] border border-blue-200 transition-colors cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleSetYesterday}
              className="flex-1 py-1 px-1 text-center font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => handleSetDaysAgo(7)}
              className="flex-1 py-1 px-1 text-center font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              7 Hari Lalu
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 pt-2.5 text-center">
            {DAYS_OF_WEEK.map((d, idx) => (
              <span
                key={idx}
                title={d.full}
                className={`text-[10px] font-bold uppercase py-1 ${
                  d.isWeekend ? 'text-rose-500 font-extrabold' : 'text-slate-400'
                }`}
              >
                {d.label}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {/* Blank offset days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8 w-8" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);
              const dayOfWeek = (firstDayOfWeek + i) % 7;
              const isSunday = dayOfWeek === 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer relative ${
                    selected
                      ? 'bg-[#07529A] text-white shadow-md scale-105 z-10'
                      : today
                      ? 'border-2 border-[#07529A] text-[#07529A] bg-blue-50/50 hover:bg-blue-100 font-extrabold'
                      : isSunday
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                  {today && !selected && (
                    <span className="absolute bottom-0.5 w-1 h-1 bg-[#07529A] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom helper */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate max-w-[190px]">
              {value ? (
                <span className="text-[#07529A] font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  {value}
                </span>
              ) : (
                'Belum memilih tanggal'
              )}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-600 hover:text-slate-900 font-bold px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
