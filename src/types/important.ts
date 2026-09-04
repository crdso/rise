export type ImportantItem = {
  id: string;
  user_id: string;
  title: string;
  content?: string | null;
  tag?: string | null;
  pinned: boolean;
  remind_at?: string | null; // ISO UTC
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ImportantInput = {
  title: string;
  content?: string | null;
  tag?: string | null;
  pinned?: boolean;
  remind_at?: string | null;
};

/**
 * Aviso exibido na interface e repetido no SETUP.md.
 * O conteúdo é gravado em texto puro (com RLS por usuário e TLS em trânsito,
 * mas sem criptografia fim-a-fim). Isto NÃO é um cofre de senhas.
 */
export const IMPORTANT_SECURITY_NOTE =
  "Não guarde senhas, tokens ou chaves aqui. O conteúdo fica em texto puro no banco — protegido por conta, mas sem criptografia de ponta a ponta.";
