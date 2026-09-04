"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalendarStore } from "@/lib/store/calendarStore";
import { calendarService } from "@/lib/services/calendarService";
import { EventDialog } from "@/components/rise/EventDialog";
import { useToast } from "@/components/ui/toast";
import type { CalendarEvent } from "@/types/calendar";

const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const CAT_COLOR: Record<string, string> = { personal: "#6B7280", school: "#10B981", finance: "#F59E0B", important: "#EF4444" };

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  let start = first.getDay(); start = start === 0 ? 6 : start - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ d: number | null; dateStr: string | null; isToday: boolean }> = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  for (let i = 0; i < start; i++) cells.push({ d: null, dateStr: null, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ d, dateStr: ds, isToday: ds === todayStr });
  }
  const needed = cells.length > 35 ? 42 : 35;
  while (cells.length < needed) cells.push({ d: null, dateStr: null, isToday: false });
  return cells.slice(0, needed);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default function CalendarioPage() {
  const { events } = useCalendarStore();
  const { push } = useToast();
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"month"|"week"|"day"|"agenda">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => getMonthGrid(year, month), [year, month]);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(cursor);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.starts_at);
      const ds = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit" }).format(d);
      // en-CA gives YYYY-MM-DD
      if (!map[ds]) map[ds]=[];
      map[ds].push(e);
    }
    return map;
  }, [events]);

  const openCreate = (dateStr: string) => {
    setEditing(null);
    setSelectedDate(dateStr);
    setOpen(true);
  };
  const openEdit = (ev: CalendarEvent) => { setEditing(ev); setOpen(true); setDetail(null); };

  const handleSave = async (data: Omit<CalendarEvent,"id"|"user_id"|"created_at"|"updated_at">) => {
    try {
      if (editing) await calendarService.update(editing.id, data);
      else await calendarService.create(data);
      push({ title: editing ? "Evento atualizado" : "Evento criado" });
    } catch(e:unknown){ push({ title:"Erro", desc:e instanceof Error?e.message:"", variant:"error"}); }
  };
  const handleDelete = async (ev: CalendarEvent) => {
    if (!confirm(`Excluir "${ev.title}"?`)) return;
    try { await calendarService.remove(ev.id); push({ title:"Evento excluído"}); setDetail(null); } catch(e:unknown){ push({ title:"Erro", desc:e instanceof Error?e.message:"", variant:"error"}); }
  };

  // Week/Day/Agenda helpers
  const weekStart = useMemo(() => {
    const d=new Date(cursor); const day=d.getDay(); const diff= day===0 ? -6 : 1-day; d.setDate(d.getDate()+diff); d.setHours(0,0,0,0); return d;
  }, [cursor]);
  const weekDays = useMemo(()=> Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; }), [weekStart]);
  const agendaList = useMemo(()=> [...events].sort((a,b)=>+new Date(a.starts_at)-+new Date(b.starts_at)).slice(0,30), [events]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight capitalize">{view==="agenda"?"Agenda":label}</h1>
        <div className="flex items-center gap-1">
          <div className="flex gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
            {(["month","week","day","agenda"] as const).map(v=>(
              <button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${view===v?"bg-[var(--accent)] text-white":"text-[var(--muted-foreground)]"}`}>{v==="month"?"Mês":v==="week"?"Semana":v==="day"?"Dia":"Agenda"}</button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => view==="day"? setCursor(d=>{ const n=new Date(d); n.setDate(n.getDate()-1); return n;}) : view==="week"? setCursor(d=>{ const n=new Date(d); n.setDate(n.getDate()-7); return n;}) : setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden sm:inline-flex" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => view==="day"? setCursor(d=>{ const n=new Date(d); n.setDate(n.getDate()+1); return n;}) : view==="week"? setCursor(d=>{ const n=new Date(d); n.setDate(n.getDate()+7); return n;}) : setCursor(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" className="rounded-full ml-1" onClick={()=>{ setSelectedDate(new Date().toISOString().slice(0,10)); setEditing(null); setOpen(true);}}><Plus className="h-3.5 w-3.5" /> Evento</Button>
        </div>
      </div>

      {view==="month" && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--card-soft)]">
            {WEEK.map((w) => <div key={w} className="py-2.5 text-center text-[11px] tracking-wide font-medium text-[var(--faint)] uppercase">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 auto-rows-[86px] sm:auto-rows-[108px] divide-x divide-y divide-[var(--border)]">
            {cells.map((c, i) => {
              const dayEvents = c.dateStr ? (eventsByDate[c.dateStr]||[]) : [];
              const more = dayEvents.length>3 ? dayEvents.length-3 : 0;
              return (
                <div key={i} onClick={()=> c.dateStr && openCreate(c.dateStr)} className="p-1 sm:p-2 flex flex-col gap-0.5 bg-[var(--card)] hover:bg-[var(--card-soft)] transition-colors cursor-pointer">
                  {c.d ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className={`h-6 w-6 grid place-items-center rounded-full text-xs font-medium ${c.isToday ? "bg-[var(--accent)] text-white" : "text-[var(--foreground)]"}`}>{c.d}</span>
                      </div>
                      <div className="space-y-0.5 mt-1 overflow-hidden">
                        {dayEvents.slice(0,3).map(ev=>(
                          <div key={ev.id} onClick={(e)=>{ e.stopPropagation(); setDetail(ev);}} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium truncate border flex items-center gap-1" style={{ background: CAT_COLOR[ev.category]+"15", borderColor: CAT_COLOR[ev.category]+"30", color: CAT_COLOR[ev.category] }}>
                            {!ev.all_day && <span className="hidden sm:inline">{formatTime(ev.starts_at)}</span>} {ev.title}
                          </div>
                        ))}
                        {more>0 && <div className="text-[10px] text-[var(--faint)]">+{more} mais</div>}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view==="week" && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="grid grid-cols-8 border-b border-[var(--border)] bg-[var(--card-soft)]">
            <div className="p-2 text-[11px] text-[var(--faint)]">Hora</div>
            {weekDays.map(d=> <div key={d.toISOString()} className="p-2 text-center text-xs font-medium">{d.toLocaleDateString("pt-BR",{ weekday:"short", day:"2-digit"})}</div>)}
          </div>
          <div className="grid grid-cols-8 divide-x divide-[var(--border)]">
            <div className="divide-y divide-[var(--border)]">
              {Array.from({length:12},(_,i)=> <div key={i} className="h-[48px] text-[10px] text-[var(--faint)] p-1">{String(7+i).padStart(2,"0")}:00</div>)}
            </div>
            {weekDays.map(d=>{
              const ds=d.toISOString().slice(0,10);
              const dayEvs=eventsByDate[ds]||[];
              return (
                <div key={ds} onClick={()=>openCreate(ds)} className="divide-y divide-[var(--border)] cursor-pointer">
                  {Array.from({length:12},(_,h)=>{
                    const hourEvs=dayEvs.filter(ev=>{
                      if(ev.all_day) return h===0;
                      const hh=new Date(ev.starts_at).getHours();
                      return hh===7+h;
                    });
                    return <div key={h} className="h-[48px] p-0.5 space-y-0.5 overflow-hidden hover:bg-[var(--card-soft)]">{hourEvs.map(ev=> <div key={ev.id} onClick={(e)=>{e.stopPropagation(); setDetail(ev);}} className="text-[10px] rounded px-1 py-0.5 truncate" style={{ background: CAT_COLOR[ev.category]+"20", color: CAT_COLOR[ev.category]}}>{ev.title}</div>)}</div>;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view==="day" && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="font-medium capitalize">{new Intl.DateTimeFormat("pt-BR",{ weekday:"long", day:"2-digit", month:"long"}).format(cursor)}</h3>
          <div className="mt-3 space-y-1">
            {(eventsByDate[cursor.toISOString().slice(0,10)]||[]).length===0 ? <p className="text-sm text-[var(--muted-foreground)]">Nenhum evento neste dia.</p> : (eventsByDate[cursor.toISOString().slice(0,10)]||[]).map(ev=>(
              <div key={ev.id} onClick={()=>setDetail(ev)} className="flex gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] cursor-pointer">
                <div className="h-8 w-1 rounded-full" style={{ background: CAT_COLOR[ev.category]}} />
                <div>
                  <p className="text-sm font-medium">{ev.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{ev.all_day ? "Dia inteiro" : `${formatTime(ev.starts_at)}${ev.ends_at?` - ${formatTime(ev.ends_at)}`:""}`} · {ev.category}</p>
                </div>
              </div>
            ))}
          </div>
          <Button size="sm" className="rounded-full mt-4" onClick={()=>openCreate(cursor.toISOString().slice(0,10))}><Plus className="h-4 w-4" /> Novo neste dia</Button>
        </div>
      )}

      {view==="agenda" && (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
          {agendaList.length===0 ? <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">Nenhum evento futuro.</div> : agendaList.map(ev=>(
            <div key={ev.id} onClick={()=>setDetail(ev)} className="p-4 flex gap-3 hover:bg-[var(--card-soft)] cursor-pointer">
              <div className="text-center min-w-[56px]">
                <p className="text-xs uppercase text-[var(--faint)]">{new Date(ev.starts_at).toLocaleDateString("pt-BR",{ month:"short"})}</p>
                <p className="text-lg font-bold">{new Date(ev.starts_at).getDate()}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: CAT_COLOR[ev.category]}} />{ev.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{ev.all_day? "Dia inteiro" : formatTime(ev.starts_at)} · {ev.category}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <EventDialog open={open} onClose={()=>{ setOpen(false); setEditing(null); setSelectedDate(null);}} onSave={handleSave} initial={editing} initialDate={selectedDate} />

      {detail && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setDetail(null)} />
          <div className="absolute inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 w-full lg:max-w-[480px] max-h-[86dvh] overflow-auto rounded-t-[20px] lg:rounded-[20px] bg-[var(--card)] border border-[var(--border)] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: CAT_COLOR[detail.category]}} />{detail.title}</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{detail.all_day? "Dia inteiro" : `${new Date(detail.starts_at).toLocaleString("pt-BR",{ timeZone:"America/Sao_Paulo" })}${detail.ends_at?` → ${new Date(detail.ends_at).toLocaleString("pt-BR",{ timeZone:"America/Sao_Paulo"})}`:""}`}</p>
                {detail.description && <p className="text-sm mt-2">{detail.description}</p>}
              </div>
              <button onClick={()=>setDetail(null)} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center">×</button>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="soft" className="rounded-full" onClick={()=>{ setEditing(detail); setDetail(null); setOpen(true);}}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
              <Button size="sm" variant="ghost" className="rounded-full text-red-600" onClick={()=>handleDelete(detail)}><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
