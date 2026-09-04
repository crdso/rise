export type EventCategory = "personal" | "school" | "finance" | "important";

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  category: EventCategory;
  starts_at: string; // ISO
  ends_at?: string | null;
  all_day: boolean;
  created_at: string;
  updated_at: string;
};
