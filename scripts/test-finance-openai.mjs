// Opt-in live smoke test. Uses only synthetic phrases; never writes to Supabase.
// Run: node --import tsx --env-file=.env.local scripts/test-finance-openai.mjs
import { registerHooks } from 'node:module';
import assert from 'node:assert/strict';

// Next normally supplies this server-only alias; this script also runs only on Node.
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === 'server-only' ? 'next/dist/compiled/server-only/empty.js' : specifier, context);
} });
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for the opt-in live smoke test');
const providerModule = await import('../src/lib/ai/openai-provider.ts');
const { OpenAIProvider } = providerModule.default ?? providerModule;
const provider = new OpenAIProvider();
const context = { now: '2026-09-06T12:00:00-03:00', timezone: 'America/Sao_Paulo' };
const cases = [
  ['gastei 50 reais no Inter', 'expense', 50],
  ['recebi 100 reais no Inter', 'income', 100],
  ['mandei 233 reais do inter pro mercado pago', 'transfer', 233, /inter/i, /mercado pago/i],
  ['mandei 233 do inter pro mercado pago', 'transfer', 233, /inter/i, /mercado pago/i],
  ['transferi 100 do nubank pro inter', 'transfer', 100, /nubank/i, /inter/i],
  ['passei 50 reais do BB pra carteira', 'transfer', 50, /bb|banco do brasil/i, /carteira/i],
  ['joguei 200 do mercado pago no nubank', 'transfer', 200, /mercado pago/i, /nubank/i],
  ['movi 300 da conta X para conta Y', 'transfer', 300, /(?:conta )?x/i, /(?:conta )?y/i],
];
for (let start = 0; start < cases.length; start += 2) {
  const results = await Promise.allSettled(cases.slice(start, start + 2).map(async ([input, expected, amount, from, to]) => {
    const result = await provider.parse(input, context);
    assert.equal(result.intent, expected === 'transfer' ? 'transfer' : 'transaction');
    assert.equal(result.data.amount, amount);
    assert.ok(result.data.occurredAt);
    assert.equal(result.missingFields.length, 0);
    assert.ok(result.confidence >= 0.75);
    if (expected === 'transfer') {
      assert.match(result.data.fromAccount, from); assert.match(result.data.toAccount, to);
    } else {
      assert.equal(result.data.type, expected); assert.match(result.data.account, /inter/i);
    }
    console.log(`PASS: ${input} → ${expected}`);
  }));
  for (const result of results) if (result.status === 'rejected') throw result.reason;
}
