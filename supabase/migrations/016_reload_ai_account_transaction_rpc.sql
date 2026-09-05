-- 016 - Ensure PostgREST exposes the compound AI finance RPC after 015.
do $$
begin
  if to_regprocedure('public.ensure_active_account_and_create_transaction_with_audit(uuid,text,text,text,text,text,text,numeric,text,uuid,text,timestamptz,text,text,boolean)') is null then
    raise exception '015 RPC ensure_active_account_and_create_transaction_with_audit is missing';
  end if;
end $$;

grant execute on function public.ensure_active_account_and_create_transaction_with_audit(uuid,text,text,text,text,text,text,numeric,text,uuid,text,timestamptz,text,text,boolean) to authenticated;
notify pgrst, 'reload schema';
