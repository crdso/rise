import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Status das integrações.
 *
 * Devolve APENAS booleanos de "está configurado". Nenhum valor de chave sai
 * daqui — nem prefixo, nem tamanho, nem máscara. Exige sessão para não virar
 * um endpoint público de reconhecimento da infraestrutura.
 */
export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = (await supabase?.auth.getClaims()) ?? { data: { claims: null } };
    if (!data?.claims?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const has = (v?: string) => !!v && v.trim().length > 0;

  return NextResponse.json({
    data: {
      supabase: isSupabaseConfigured(),
      supabaseSecretKey: has(process.env.SUPABASE_SECRET_KEY) || has(process.env.SUPABASE_SERVICE_ROLE_KEY),
      brandfetch: has(process.env.BRANDFETCH_SECRET_API_KEY),
      logodev: has(process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN),
      openai: has(process.env.OPENAI_API_KEY),
      gemini: has(process.env.GEMINI_API_KEY),
      twilio: has(process.env.TWILIO_ACCOUNT_SID) && has(process.env.TWILIO_AUTH_TOKEN),
    },
  });
}
