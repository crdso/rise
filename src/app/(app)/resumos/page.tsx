import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function ResumosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Resumos</h1>
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent-soft)] to-transparent" />
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--accent)]" /> Seu agosto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-bold">R$ 2.483,72</p>
          <p className="text-sm text-[var(--muted-foreground)]">Você gastou 12% menos que em julho. Sua maior categoria foi Alimentação.</p>
          <Button variant="soft" size="sm">Ver relatório completo →</Button>
        </CardContent>
      </Card>
    </div>
  );
}
