import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createElement } from "react";

test('Quick Add UI: preview before write, same-key retry, new-key operation and safe PostgreSQL error', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element, SVGElement: dom.window.SVGElement, localStorage: dom.window.localStorage,
    getComputedStyle: dom.window.getComputedStyle, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window) });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  const { render, fireEvent, waitFor, cleanup } = await import('@testing-library/react');
  const { QuickAdd } = await import('../src/components/rise/QuickAdd');
  const { ToastProvider } = await import('../src/components/ui/toast');
  const { AIParserService } = await import('../src/lib/ai/parser');
  const { resolveTransferAccount } = await import('../src/lib/ai/transfer-accounts');
  const { financialError } = await import('../src/lib/finance/errors');
  const accounts = [{ id: '10000000-0000-4000-8000-000000000001', name: 'Inter' }, { id: '10000000-0000-4000-8000-000000000002', name: 'Mercado Pago' }];
  const originalFetch = globalThis.fetch;
  const originalLog = console.error;
  const technicalLogs: unknown[] = [];
  console.error = (...args) => { technicalLogs.push(args); };
  const writes: Array<{ key: string | null; data: Record<string, unknown> }> = [];
  let closed = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url) === '/api/ai/parse') {
      const { input } = JSON.parse(String(init?.body));
      const data = await new AIParserService().parse(input, { now: '2026-09-06T12:00:00-03:00', timezone: 'America/Sao_Paulo' });
      assert.equal(data.intent, 'transfer');
      if (data.intent !== 'transfer') throw new Error('Unexpected intent');
      return Response.json({ data: { ...data, fromAccountResolution: resolveTransferAccount(data.data.fromAccount, accounts), toAccountResolution: resolveTransferAccount(data.data.toAccount, accounts) }, provider: 'mock' });
    }
    assert.equal(String(url), '/api/transfers');
    writes.push({ key: new Headers(init?.headers).get('Idempotency-Key'), data: JSON.parse(String(init?.body)) });
    if (writes.length === 1) {
      const safe = financialError({ code: '22P02', message: 'invalid input syntax for type uuid: "(9fa26385-0000-4000-8000-000000000001,expense,233.00)"' });
      return Response.json({ error: safe.error }, { status: safe.status });
    }
    return Response.json({ data: { transfer: { id: 'transfer' }, transactions: [] } });
  };
  try {
    const ui = render(createElement(ToastProvider, null, createElement(QuickAdd, { open: true, onClose: () => { closed++; } })));
    const parse = async (text: string) => {
      fireEvent.change(ui.getByRole('textbox'), { target: { value: text } });
      fireEvent.click(ui.getByRole('button', { name: 'Interpretar' }));
      await waitFor(() => assert.ok(ui.getByText('Transferência')));
    };
    await parse('mandei 233 reais do inter pro mercado pago');
    assert.equal(writes.length, 0);
    assert.ok(ui.getByText('Inter → Mercado Pago'));
    assert.ok(ui.getByText(/233,00/));
    fireEvent.click(ui.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => assert.ok(ui.getByRole('alert')));
    assert.doesNotMatch(ui.container.textContent ?? '', /uuid|9fa26385|invalid input|22P02/i);
    assert.match(JSON.stringify(technicalLogs), /22P02/);
    fireEvent.click(ui.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => assert.equal(closed, 1));
    assert.equal(writes.length, 2);
    assert.ok(writes[0].key);
    assert.equal(writes[0].key, writes[1].key);
    assert.deepEqual(writes[0].data, writes[1].data);
    await waitFor(() => assert.equal(ui.queryByText('Transferência'), null));
    await parse('mandei 233 reais do inter pro mercado pago');
    fireEvent.click(ui.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => assert.equal(closed, 2));
    assert.notEqual(writes[2].key, writes[0].key);
    await waitFor(() => assert.equal(ui.queryByText('Transferência'), null));
    await parse('mandei 233 do inter pro inter');
    assert.equal(ui.queryByRole('button', { name: 'Confirmar' }), null);
    assert.ok(ui.getByText('Escolha contas diferentes para origem e destino.'));
    fireEvent.click(ui.getByRole('button', { name: 'Revisar' }));
    await waitFor(() => assert.equal(ui.queryByText('Transferência'), null));
    await parse('mandei 233 do inter pro banco inexistente');
    assert.equal(ui.queryByRole('button', { name: 'Confirmar' }), null);
    assert.ok(ui.getByText(/Cadastre a conta antes de transferir/));
    assert.equal(writes.length, 3);
  } finally {
    cleanup(); globalThis.fetch = originalFetch; console.error = originalLog; dom.window.close();
  }
});
