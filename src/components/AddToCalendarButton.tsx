"use client";

import { generateICS } from "@/lib/ics";

const REMINDER_MINUTES = 60;
const EVENT_TITLE = "🏀 March Madness Brackets Lock";
const EVENT_DESCRIPTION = "Finish your bracket picks before they lock!";

interface AddToCalendarButtonProps {
  lockTime: string;
}

export default function AddToCalendarButton({ lockTime }: AddToCalendarButtonProps) {
  const lockDate = new Date(lockTime);
  if (lockDate <= new Date()) return null;

  const handleClick = () => {
    const ics = generateICS({
      title: EVENT_TITLE,
      description: EVENT_DESCRIPTION,
      start: lockDate,
      reminderMinutes: REMINDER_MINUTES,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bracket-lock.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleClick}
      title="Add lock deadline to calendar"
      className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition"
    >
      📅 Add to Calendar
    </button>
  );
}
