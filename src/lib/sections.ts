import { DayOfWeek } from "@prisma/client";

export function meetingDayLabel(day: DayOfWeek | null | undefined) {
  if (!day) return "—";
  switch (day) {
    case DayOfWeek.MONDAY:
      return "Monday";
    case DayOfWeek.TUESDAY:
      return "Tuesday";
    case DayOfWeek.WEDNESDAY:
      return "Wednesday";
    case DayOfWeek.THURSDAY:
      return "Thursday";
    case DayOfWeek.FRIDAY:
      return "Friday";
    case DayOfWeek.SATURDAY:
      return "Saturday";
    case DayOfWeek.SUNDAY:
      return "Sunday";
    default:
      return String(day);
  }
}

export function sectionDisplayName(section: { name: string; meetingDay?: DayOfWeek | null } | null | undefined) {
  if (!section) return "—";
  return section.meetingDay ? `${section.name} (${meetingDayLabel(section.meetingDay)})` : section.name;
}

