import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const user = '10000000-0000-4000-8000-000000000001';
const inter = '20000000-0000-4000-8000-000000000001';
const mercado = '20000000-0000-4000-8000-000000000002';
const debt = '30000000-0000-4000-8000-000000000001';
const key = n => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const tx = (n, type = 'expense', amount = 50) => `select public.create_transaction_idempotent_with_audit('${key(n)}','${type}',${amount},'Normal',null,null,'${inter}','2026-09-06T12:00:00Z',null,null,false)`;
const payment = n => `select public.add_debt_payment_idempotent_with_audit('${key(n)}','${debt}',25,'2026-09-06T12:00:00Z',null,true,'${inter}',null,null)`;
const transfer = (n, from = inter, to = mercado, amount = 233) => `select public.create_account_transfer_idempotent_with_audit('${key(n)}','${from}','${to}',${amount},'2026-09-06T12:00:00Z',null) as result`;

async function setup() {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    insert into auth.users values('${user}'); select set_config('request.jwt.claim.sub','${user}',false);`);
  const files = (await readdir('supabase/migrations')).filter(f => Number(f.slice(0, 3)) <= 20).sort();
  for (const file of files) {
    const sql = (await readFile(`supabase/migrations/${file}`, 'utf8')).replace(/create extension if not exists "pgcrypto";/i, '');
    await db.exec(sql);
  }
  await db.exec(`insert into accounts(id,user_id,name,type,initial_balance) values
    ('${inter}','${user}','Inter','checking',500),('${mercado}','${user}','Mercado Pago','wallet',100);
    insert into debts(id,user_id,person,kind,amount) values('${debt}','${user}','Teste','owed',500);`);
  return db;
}

test('020 reproduces composite-to-UUID failure in BOTH wrappers; failed writes roll back', async () => {
  const db = await setup();
  try {
    await assert.rejects(db.query(tx(1)), /invalid input syntax for type uuid/);
    await assert.rejects(db.query(payment(2)), /invalid input syntax for type uuid/);
    for (const table of ['transactions', 'debt_payments', 'financial_operation_idempotency', 'audit_logs']) {
      assert.equal((await db.query(`select count(*)::int n from ${table}`)).rows[0].n, 0, table);
    }
  } finally { await db.close(); }
});

test('021: normal expense, income and debt payment, retries, distinct keys and audit', async () => {
  const db = await setup();
  try {
    await db.exec(await readFile('supabase/migrations/021_atomic_account_transfers.sql', 'utf8'));
    await db.query(tx(1)); await db.query(tx(1));
    await db.query(tx(2, 'income', 100)); await db.query(tx(2, 'income', 100));
    await db.query(tx(3));
    await assert.rejects(db.query(tx(1, 'expense', 51)), /idempotency key reuse/);
    assert.equal((await db.query('select count(*)::int n from transactions')).rows[0].n, 3);
    await db.query(payment(4)); await db.query(payment(4));
    assert.equal((await db.query('select count(*)::int n from debt_payments')).rows[0].n, 1);
    assert.equal((await db.query('select count(*)::int n from transactions')).rows[0].n, 4);
    assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n, 4);
    const pay = (await db.query('select * from debt_payments')).rows[0];
    assert.ok(pay.transaction_id);
    assert.equal((await db.query('select paid_amount from debts')).rows[0].paid_amount, '25.00');
    await assert.rejects(db.query(`select delete_transaction_guarded_with_audit('${pay.transaction_id}')`), /linked debt payment/);
    await assert.rejects(db.query(`select update_transaction_guarded_with_audit('${pay.transaction_id}','{"amount":10}')`), /linked debt payment/);
    await db.query(payment(5));
    assert.equal((await db.query('select count(*)::int n from debt_payments')).rows[0].n, 2);
  } finally { await db.close(); }
});

test('021: atomic transfer balances, metrics, retries, keys, guards and second-leg rollback', async () => {
  const db = await setup();
  try {
    await db.exec(await readFile('supabase/migrations/021_atomic_account_transfers.sql', 'utf8'));
    const first = (await db.query(transfer(10))).rows[0].result;
    const retry = (await db.query(transfer(10))).rows[0].result;
    assert.deepEqual(retry, first);
    const summary = (await db.query("select finance_summary('2026-09') result")).rows[0].result;
    assert.deepEqual(summary, { totalBalance: 600, accountBalances: { [inter]: 267, [mercado]: 333 }, month: { income: 0, expense: 0, count: 0 } });
    assert.equal(first.transactions.length, 2);
    assert.ok(first.transactions.every(t => t.transfer_id === first.transfer.id));
    assert.equal((await db.query("select count(*)::int n from audit_logs where entity='account_transfer'")).rows[0].n, 1);
    await db.query(transfer(11));
    assert.equal((await db.query('select count(*)::int n from account_transfers')).rows[0].n, 2);
    await assert.rejects(db.query(transfer(10, inter, mercado, 234)), /idempotency key reuse/);
    await assert.rejects(db.query(transfer(12, inter, inter)), /same transfer account/);
    await assert.rejects(db.query(transfer(12, inter, mercado, 0)), /invalid transfer/);
    await assert.rejects(db.query(transfer(12, inter, mercado, -1)), /invalid transfer/);
    await assert.rejects(db.query(transfer(12, inter, mercado, 0.001)), /invalid transfer/);
    const leg = first.transactions[0].id;
    // Both old and guarded RPCs, plus direct writes, must reject individual mutation.
    for (const name of ['delete_transaction_with_audit', 'delete_transaction_guarded_with_audit'])
      await assert.rejects(db.query(`select ${name}('${leg}')`), /transfer is immutable/);
    for (const name of ['update_transaction_with_audit', 'update_transaction_guarded_with_audit'])
      await assert.rejects(db.query(`select ${name}('${leg}','{"amount":1}')`), /transfer is immutable/);
    await assert.rejects(db.query(`update transactions set transfer_id=null where id='${leg}'`), /transfer is immutable/);
    await assert.rejects(db.query(`delete from account_transfers where id='${first.transfer.id}'`), /transfer is immutable/);
    await assert.rejects(db.query(`update account_transfers set amount=1 where id='${first.transfer.id}'`), /transfer is immutable/);

    // Inject a real PostgreSQL exception specifically on the SECOND insert.
    await db.exec(`create function fail_incoming_transfer() returns trigger language plpgsql as $$ begin
      if new.transfer_id is not null and new.type='income' then raise exception 'controlled second leg failure'; end if;
      return new; end $$;
      create trigger test_second_leg before insert on transactions for each row execute function fail_incoming_transfer();`);
    const counts = async () => (await db.query(`select (select count(*) from transactions)::int tx,
      (select count(*) from account_transfers)::int transfers, (select count(*) from audit_logs)::int audits,
      (select count(*) from financial_operation_idempotency)::int keys`)).rows[0];
    const before = await counts();
    await assert.rejects(db.query(transfer(13)), /controlled second leg failure/);
    assert.deepEqual(await counts(), before);
    await db.exec('drop trigger test_second_leg on transactions');
    await db.query(transfer(13)); // failed key is reusable after rollback
    await assert.rejects(db.query(`insert into account_transfers(user_id,from_account_id,to_account_id,amount,occurred_at)
      values('${user}','${inter}','${mercado}',1,now())`), /incomplete transfer/);

    // auth.uid, ownership, inactive/missing accounts and read-only RLS.
    const other = '10000000-0000-4000-8000-000000000002';
    await db.exec(`insert into auth.users values('${other}'); select set_config('request.jwt.claim.sub','${other}',false);`);
    await assert.rejects(db.query(transfer(14)), /account not found/);
    await db.exec(`select set_config('request.jwt.claim.sub','',false)`);
    await assert.rejects(db.query(transfer(14)), /unauthorized/);
    await db.exec(`select set_config('request.jwt.claim.sub','${user}',false); update accounts set is_active=false where id='${mercado}'`);
    await assert.rejects(db.query(transfer(14)), /account not found/);
    await db.exec(`update accounts set is_active=true where id='${mercado}'; set role authenticated;`);
    await db.query(transfer(15));
    assert.equal((await db.query('select count(*)::int n from account_transfers')).rows[0].n, 4);
    await assert.rejects(db.query(`insert into account_transfers(user_id,from_account_id,to_account_id,amount,occurred_at)
      values('${user}','${inter}','${mercado}',1,now())`), /permission denied/);
    await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
    assert.equal((await db.query('select count(*)::int n from account_transfers')).rows[0].n, 0);
  } finally { await db.close(); }
});

test('021 preserves auto account creation, saved 020 responses and absent payment dates on retries', async () => {
  const db = await setup();
  try {
    // Seed the response format stored by 020, before transactions gains transfer_id.
    await db.exec(`insert into financial_operation_idempotency(user_id,operation,idempotency_key,fingerprint,response)
      values('${user}','transaction','${key(1)}',md5(concat_ws('|','expense',50::numeric,'Normal',null::uuid,null::text,'${inter}'::uuid,'2026-09-06T12:00:00Z'::timestamptz,null::text,null::text,false)),
      '{"id":"${key(99)}","type":"expense","amount":50}');`);
    await db.exec(await readFile('supabase/migrations/021_atomic_account_transfers.sql', 'utf8'));
    assert.equal((await db.query(`select (public.create_transaction_idempotent_with_audit('${key(1)}','expense',50,'Normal',null,null,'${inter}','2026-09-06T12:00:00Z',null,null,false)).id id`)).rows[0].id, key(99));
    const ensure = `select ensure_active_account_and_create_transaction_with_audit('${key(20)}','Nova Conta','checking',null,null,null,'income',100,'Receita',null,null,'2026-09-06T12:00:00Z',null,null,false) result`;
    const first = (await db.query(ensure)).rows[0].result;
    assert.deepEqual((await db.query(ensure)).rows[0].result, first);
    assert.equal((await db.query("select count(*)::int n from accounts where name='Nova Conta'")).rows[0].n, 1);
    const noDate = payment(21).replace("'2026-09-06T12:00:00Z'", 'null');
    await db.query(noDate); await db.query(noDate);
    assert.equal((await db.query('select count(*)::int n from debt_payments')).rows[0].n, 1);
  } finally { await db.close(); }
});
