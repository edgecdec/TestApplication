/**
 * Generate an .ics calendar file content string for a given event.
 * Used to create downloadable calendar reminders for bracket lock deadlines.
 */

const ICS_DATE_FORMAT_LENGTH = 15; // YYYYMMDDTHHmmss

function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

interface ICSEventParams {
  title: string;
  description: string;
  start: Date;
  reminderMinutes: number;
}

export function generateICS({ title, description, start, reminderMinutes }: ICSEventParams): string {
  const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration
  const now = new Date();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MarchMadnessPicker//EN",
    "BEGIN:VEVENT",
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `DTSTAMP:${toICSDate(now)}`,
    `UID:lock-${start.getTime()}@marchmadnesspicker`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT" + reminderMinutes + "M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
