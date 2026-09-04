import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useCalendarStore } from "@/lib/store/calendarStore";
import type { CalendarEvent } from "@/types/calendar";

function uid(){ return crypto.randomUUID(); }

async function api<T>(url:string, init?:RequestInit): Promise<T>{
  const r=await fetch(url,{ ...init, headers:{ "Content-Type":"application/json", ...(init?.headers||{}) }});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error || `API ${r.status}`);
  return j.data as T;
}

export const calendarService = {
  list(){ return useCalendarStore.getState().events; },

  async create(data: Omit<CalendarEvent,"id"|"user_id"|"created_at"|"updated_at">): Promise<CalendarEvent>{
    if(!isSupabaseConfigured()){
      const now=new Date().toISOString();
      const ev: CalendarEvent={ id:uid(), user_id:"demo", created_at:now, updated_at:now, ...data };
      useCalendarStore.getState().upsertEvent(ev);
      return ev;
    }
    const created=await api<CalendarEvent>("/api/events",{ method:"POST", body:JSON.stringify(data)});
    useCalendarStore.getState().upsertEvent(created);
    return created;
  },

  async update(id:string, patch: Partial<Omit<CalendarEvent,"id"|"user_id"|"created_at"|"updated_at">>): Promise<CalendarEvent>{
    if(!isSupabaseConfigured()){
      const prev=useCalendarStore.getState().events.find(e=>e.id===id);
      if(!prev) throw new Error("event not found");
      const next={ ...prev, ...patch, updated_at:new Date().toISOString() } as CalendarEvent;
      useCalendarStore.getState().upsertEvent(next);
      return next;
    }
    const updated=await api<CalendarEvent>(`/api/events/${id}`,{ method:"PATCH", body:JSON.stringify(patch)});
    useCalendarStore.getState().upsertEvent(updated);
    return updated;
  },

  async remove(id:string){
    if(!isSupabaseConfigured()){
      useCalendarStore.getState().removeEvent(id);
      return;
    }
    await fetch(`/api/events/${id}`,{ method:"DELETE" }).then(r=>{ if(!r.ok) throw new Error("delete failed"); });
    useCalendarStore.getState().removeEvent(id);
  },

  async refreshFromServer(){
    if(!isSupabaseConfigured()) return;
    const r=await fetch("/api/events");
    if(!r.ok) throw new Error("events sync failed");
    const j=await r.json();
    if(Array.isArray(j.data)) useCalendarStore.getState().setEvents(j.data);
  }
};
