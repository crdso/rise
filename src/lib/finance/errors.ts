const GENERIC = "Não foi possível registrar a operação. Tente novamente.";

// Only fixed, allowlisted messages cross the server/UI boundary.
export function financialError(error: { message?: string; code?: string; details?: string; hint?: string }) {
  console.error("[rise-finance]", { code: error.code, message: error.message, details: error.details, hint: error.hint });
  const known: Record<string, { error: string; status: number }> = {
    "account not found": { error: "Conta não encontrada ou indisponível. Confira as contas selecionadas.", status: 400 },
    "same transfer account": { error: "Escolha contas diferentes para origem e destino.", status: 400 },
    "invalid transfer": { error: "Confira o valor, as contas e a data da transferência.", status: 400 },
    "idempotency key reuse": { error: "Esta confirmação já foi usada com outros dados. Revise e confirme novamente.", status: 409 },
    "transfer is immutable": { error: "Os lançamentos de uma transferência não podem ser alterados ou excluídos individualmente.", status: 409 },
    "linked debt payment transaction must be changed through the payment flow": { error: "Esta transação está vinculada a um pagamento de dívida.", status: 409 },
    "debt not found": { error: "Dívida não encontrada.", status: 404 },
    "category not found": { error: "Categoria não encontrada.", status: 400 },
    "transaction not found": { error: "Transação não encontrada.", status: 404 },
  };
  return known[error.message ?? ""] ?? { error: GENERIC, status: 500 };
}
