begin;

-- Payment reconciliation only. Logistics approval and supplier dispatch are separate gates.
create table public.p06_physical_orders (
  id uuid primary key default gen_random_uuid(),
  hotmart_transaction text not null unique,
  product_id text not null references public.products(id),
  offer_id uuid not null references public.offers(id),
  price_version_id uuid not null references public.price_versions(id),
  sku text not null,
  currency text not null check (currency = 'BRL'),
  amount_minor integer not null check (amount_minor > 0),
  payment_status text not null check (payment_status in ('APPROVED','COMPLETE','CANCELLED','REFUNDED','CHARGEBACK','PARTIALLY_REFUNDED')),
  state text not null check (state in ('WAITING_LOGISTICS','CANCELLED','MANUAL_REVIEW','SUPPLIER_SUBMITTED')),
  last_verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.p06_physical_receipts (
  inbox_id uuid primary key references public.webhook_inbox(id),
  order_id uuid not null references public.p06_physical_orders(id),
  readback_status text not null,
  verified_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index p06_physical_orders_product_idx on public.p06_physical_orders(product_id);
create index p06_physical_orders_offer_idx on public.p06_physical_orders(offer_id);
create index p06_physical_orders_price_idx on public.p06_physical_orders(price_version_id);
create index p06_physical_receipts_order_idx on public.p06_physical_receipts(order_id);
alter table public.p06_physical_orders enable row level security;
alter table public.p06_physical_receipts enable row level security;
revoke all on public.p06_physical_orders, public.p06_physical_receipts from public, anon, authenticated;
revoke all on public.p06_physical_orders, public.p06_physical_receipts from service_role;
grant select, insert, update on public.p06_physical_orders, public.p06_physical_receipts to service_role;

create function public.reconcile_p06_payment(p_inbox_id uuid, p_product_id text, p_sale jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_inbox public.webhook_inbox%rowtype;
  v_product public.products%rowtype;
  v_offer public.offers%rowtype;
  v_price public.price_versions%rowtype;
  v_order public.p06_physical_orders%rowtype;
  v_receipt public.p06_physical_receipts%rowtype;
  v_transaction text := p_sale->>'transaction';
  v_status text := p_sale->>'status';
  v_expected_status text;
  v_verified_at timestamptz := (p_sale->>'verifiedAt')::timestamptz;
  v_state text;
  v_previous_state text;
  v_previous_status text;
  v_new boolean;
begin
  select * into v_inbox from public.webhook_inbox where id=p_inbox_id for update;
  if not found or v_inbox.provider <> 'hotmart' or v_inbox.signature_verified is not true
    or v_inbox.processing_state = 'QUARANTINED' then
    raise exception 'p06_untrusted_inbox';
  end if;
  select * into v_receipt from public.p06_physical_receipts where inbox_id=p_inbox_id;
  if found then
    select * into v_order from public.p06_physical_orders where id=v_receipt.order_id;
    return jsonb_build_object('orderId',v_order.id,'state',v_order.state,'duplicate',true);
  end if;
  v_expected_status := case v_inbox.event_type
    when 'PURCHASE_APPROVED' then 'APPROVED' when 'PURCHASE_COMPLETE' then 'COMPLETE'
    when 'PURCHASE_CANCELED' then 'CANCELLED' when 'PURCHASE_REFUNDED' then 'REFUNDED'
    when 'PURCHASE_CHARGEBACK' then 'CHARGEBACK'
    when 'PURCHASE_PARTIALLY_REFUNDED' then 'PARTIALLY_REFUNDED' else null end;
  if (v_expected_status is not null and v_status=v_expected_status
    and v_verified_at > clock_timestamp()-interval '5 minutes'
    and v_verified_at <= clock_timestamp()+interval '30 seconds'
    and v_transaction ~ '^[A-Za-z0-9_-]{1,100}$'
    and v_inbox.payload->>'event'=v_inbox.event_type
    and v_inbox.payload#>>'{data,purchase,transaction}'=v_transaction
    and v_inbox.payload#>>'{data,product,id}'=p_sale->>'hotmartProductId'
    and v_inbox.payload#>>'{data,purchase,offer,code}'=p_sale->>'hotmartOfferCode') is not true then
    raise exception 'p06_readback_or_inbox_mismatch';
  end if;
  select * into v_product from public.products where id=p_product_id;
  if not found or (v_product.physical and not v_product.personalized
    and v_product.metadata->>'project'='P06'
    and v_product.metadata->>'price_version'='p06-2026-10-07-v1'
    and p_product_id ~ '^P06-(ARI|CAP|AQU)-(EMB-A001-SWT01|GRV-A001-PST01)$'
    and v_product.metadata->>'sku'='ATV-' || p_product_id ||
      case when p_product_id like '%-EMB-%' then '-PRE-M' else '-HOR4030' end) is not true then
    raise exception 'p06_product_mismatch';
  end if;
  select * into v_offer from public.offers where code=p_product_id || '-BRL-V1' and product_id=p_product_id;
  if not found or (v_offer.checkout_provider='hotmart' and v_offer.hotmart_product_id=p_sale->>'hotmartProductId'
    and v_offer.hotmart_offer_code=p_sale->>'hotmartOfferCode') is not true then
    raise exception 'p06_offer_mismatch';
  end if;
  select * into v_price from public.price_versions where offer_id=v_offer.id
    and currency='BRL' and amount_minor=case when p_product_id like '%-EMB-%' then 39900 else 24900 end
    order by created_at desc, id limit 1;
  if not found or (p_sale->>'currency'='BRL' and jsonb_typeof(p_sale->'amountMinor')='number'
    and (p_sale->>'amountMinor')::numeric=v_price.amount_minor) is not true then
    raise exception 'p06_price_mismatch';
  end if;
  -- Serialize different inbox IDs belonging to the same transaction.
  perform pg_advisory_xact_lock(hashtextextended('p06:' || v_transaction,0));
  select * into v_order from public.p06_physical_orders where hotmart_transaction=v_transaction for update;
  v_new := not found;
  if not v_new and (v_order.product_id<>p_product_id or v_order.offer_id<>v_offer.id
    or v_order.sku<>v_product.metadata->>'sku' or v_order.amount_minor<>v_price.amount_minor) then
    raise exception 'p06_transaction_binding_conflict';
  end if;
  if not v_new and v_verified_at<v_order.last_verified_at then raise exception 'p06_stale_readback'; end if;
  v_previous_state := v_order.state;
  v_previous_status := v_order.payment_status;
  v_state := case
    when v_order.state in ('CANCELLED','MANUAL_REVIEW') then v_order.state
    when v_status='PARTIALLY_REFUNDED' then 'MANUAL_REVIEW'
    when v_status in ('CANCELLED','REFUNDED','CHARGEBACK') then
      case when v_order.state='SUPPLIER_SUBMITTED' then 'MANUAL_REVIEW' else 'CANCELLED' end
    when v_order.state='SUPPLIER_SUBMITTED' then 'SUPPLIER_SUBMITTED'
    else 'WAITING_LOGISTICS' end;
  -- A late approval never revives a cancellation or erases the financial reversal.
  if v_order.state in ('CANCELLED','MANUAL_REVIEW') and v_status in ('APPROVED','COMPLETE') then
    v_status := v_order.payment_status;
  end if;
  if v_new then
    insert into public.p06_physical_orders(hotmart_transaction,product_id,offer_id,price_version_id,sku,currency,amount_minor,payment_status,state,last_verified_at)
    values(v_transaction,p_product_id,v_offer.id,v_price.id,v_product.metadata->>'sku','BRL',v_price.amount_minor,v_status,v_state,v_verified_at)
    returning * into v_order;
  else
    update public.p06_physical_orders set payment_status=v_status,state=v_state,last_verified_at=v_verified_at,updated_at=now()
      where id=v_order.id returning * into v_order;
  end if;
  insert into public.p06_physical_receipts(inbox_id,order_id,readback_status,verified_at)
    values(p_inbox_id,v_order.id,p_sale->>'status',v_verified_at);
  if v_new or v_previous_state is distinct from v_state or v_previous_status is distinct from v_status then
    insert into public.outbox_events(aggregate_type,aggregate_id,event_type,payload,correlation_id)
    values('p06_physical_order',v_order.id::text,'P06_PAYMENT_RECONCILED',
      jsonb_build_object('orderId',v_order.id,'sku',v_order.sku,'state',v_state,'paymentStatus',v_status),p_inbox_id);
  end if;
  update public.webhook_inbox set processing_state='PROCESSED',processed_at=now(),last_error_code=null,attempts=attempts+1 where id=p_inbox_id;
  return jsonb_build_object('orderId',v_order.id,'state',v_state,'duplicate',false);
end;
$$;
revoke all on function public.reconcile_p06_payment(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_p06_payment(uuid,text,jsonb) to service_role;
comment on function public.reconcile_p06_payment(uuid,text,jsonb) is
  'Service-only atomic financial reconciliation. Requires fresh official API readback. Never dispatches or grants digital access.';
commit;
