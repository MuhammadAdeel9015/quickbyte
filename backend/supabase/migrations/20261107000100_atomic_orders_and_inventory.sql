CREATE OR REPLACE FUNCTION public.quickbite_create_order_atomic(
  p_order jsonb,
  p_items jsonb,
  p_status_history jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_order_id text;
BEGIN
  IF jsonb_typeof(p_order) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_status_history) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ORDER_PAYLOAD';
  END IF;

  v_order_id := p_order->>'id';
  IF v_order_id IS NULL OR v_order_id = '' OR p_order->>'status' IS DISTINCT FROM 'Pending' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ORDER_PAYLOAD';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_status_history) AS history(entry)
    WHERE entry->>'status' = 'Pending'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INITIAL_ORDER_HISTORY_REQUIRED';
  END IF;

  INSERT INTO public.orders (
    id, customer_id, customer_name, customer_phone, delivery_address, total,
    status, rider_id, payment_method, created_at, updated_at
  )
  VALUES (
    v_order_id,
    p_order->>'customer_id',
    p_order->>'customer_name',
    COALESCE(p_order->>'customer_phone', ''),
    p_order->>'delivery_address',
    (p_order->>'total')::numeric,
    'Pending',
    NULLIF(p_order->>'rider_id', ''),
    COALESCE(p_order->>'payment_method', 'Cash'),
    COALESCE((p_order->>'created_at')::timestamptz, now()),
    COALESCE((p_order->>'updated_at')::timestamptz, now())
  );

  INSERT INTO public.order_items (
    order_id, menu_item_id, name, quantity, unit_price, line_total
  )
  SELECT
    v_order_id, item.menu_item_id, item.name, item.quantity, item.unit_price, item.line_total
  FROM jsonb_to_recordset(p_items) AS item(
    menu_item_id text,
    name text,
    quantity integer,
    unit_price numeric,
    line_total numeric
  );

  INSERT INTO public.order_status_history (order_id, status, at, by_user_id)
  SELECT
    v_order_id,
    entry->>'status',
    COALESCE((entry->>'at')::timestamptz, now()),
    entry->>'by_user_id'
  FROM jsonb_array_elements(p_status_history) AS history(entry);

  RETURN v_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.quickbite_update_order_atomic(
  p_order_id text,
  p_expected_status text,
  p_changes jsonb,
  p_status_history jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_next_status text;
  v_next_rider_id text;
  v_actor_id text;
  v_stock record;
  v_available numeric;
  v_quantity_to_deduct numeric;
  v_quantity_after numeric;
BEGIN
  IF jsonb_typeof(p_changes) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_status_history) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ORDER_PAYLOAD';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF (p_changes ?| ARRAY[
       'customer_id', 'customer_name', 'customer_phone', 'delivery_address',
       'total', 'payment_method', 'items', 'order_items'
     ]) AND v_order.status <> 'Pending' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ORDER_PREPARATION_STARTED';
  END IF;

  IF (p_changes - 'status' - 'rider_id' - 'updated_at') <> '{}'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ORDER_FIELDS_NOT_EDITABLE';
  END IF;

  v_next_status := COALESCE(p_changes->>'status', v_order.status);

  IF v_order.status = 'Confirmed' AND v_next_status = 'Confirmed' THEN
    RETURN p_order_id;
  END IF;

  IF v_order.status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ORDER_STATUS_CHANGED';
  END IF;

  IF v_next_status IS DISTINCT FROM v_order.status
     AND NOT EXISTS (
       SELECT 1
       FROM jsonb_array_elements(p_status_history) AS history(entry)
       WHERE entry->>'status' = v_next_status
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ORDER_STATUS_HISTORY_REQUIRED';
  END IF;

  IF v_next_status IS DISTINCT FROM v_order.status
     AND NOT (
       (v_order.status = 'Pending' AND v_next_status IN ('Confirmed', 'Cancelled'))
       OR (v_order.status = 'Confirmed' AND v_next_status IN ('Assigned', 'Cancelled'))
       OR (v_order.status = 'Assigned' AND v_next_status IN ('Accepted', 'Rejected', 'Cancelled'))
       OR (v_order.status = 'Accepted' AND v_next_status = 'Picked Up')
       OR (v_order.status = 'Picked Up' AND v_next_status = 'On the Way')
       OR (v_order.status = 'On the Way' AND v_next_status = 'Delivered')
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ORDER_TRANSITION';
  END IF;

  v_next_rider_id := CASE
    WHEN p_changes ? 'rider_id' THEN p_changes->>'rider_id'
    ELSE v_order.rider_id
  END;

  IF v_order.rider_id IS NOT NULL
     AND v_next_rider_id IS NOT NULL
     AND v_next_rider_id IS DISTINCT FROM v_order.rider_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RIDER_ALREADY_ASSIGNED';
  END IF;

  IF v_next_status = 'Assigned' AND v_next_rider_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSIGNED_ORDER_REQUIRES_RIDER';
  END IF;

  IF v_order.status = 'Pending' AND v_next_status = 'Confirmed'
     AND NOT EXISTS (
       SELECT 1
       FROM public.inventory_transactions
       WHERE reference_order_id = p_order_id
         AND reason = 'order_confirmation'
     ) THEN
    v_actor_id := p_status_history->0->>'by_user_id';

    FOR v_stock IN
      SELECT
        ingredient.inventory_item_id,
        SUM(ingredient.quantity_required * item.quantity)::numeric AS quantity_to_deduct
      FROM public.order_items AS item
      JOIN public.menu_item_ingredients AS ingredient
        ON ingredient.menu_item_id = item.menu_item_id
      WHERE item.order_id = p_order_id
      GROUP BY ingredient.inventory_item_id
      ORDER BY ingredient.inventory_item_id
    LOOP
      SELECT stock.quantity INTO v_available
      FROM public.inventory_items AS stock
      WHERE stock.id = v_stock.inventory_item_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'INVENTORY_ITEM_NOT_FOUND';
      END IF;

      IF v_available < v_stock.quantity_to_deduct THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INSUFFICIENT_STOCK';
      END IF;

      v_quantity_after := v_available - v_stock.quantity_to_deduct;
      UPDATE public.inventory_items
      SET quantity = v_quantity_after, updated_at = now()
      WHERE id = v_stock.inventory_item_id;

      INSERT INTO public.inventory_transactions (
        inventory_item_id, quantity_change, quantity_after, reason,
        reference_order_id, actor_user_id
      )
      VALUES (
        v_stock.inventory_item_id,
        -v_stock.quantity_to_deduct,
        v_quantity_after,
        'order_confirmation',
        p_order_id,
        v_actor_id
      );
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = v_next_status,
      rider_id = v_next_rider_id,
      updated_at = COALESCE((p_changes->>'updated_at')::timestamptz, now())
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, status, at, by_user_id)
  SELECT
    p_order_id,
    entry->>'status',
    COALESCE((entry->>'at')::timestamptz, now()),
    entry->>'by_user_id'
  FROM jsonb_array_elements(p_status_history) AS history(entry);

  RETURN p_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.quickbite_create_order_atomic(jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quickbite_update_order_atomic(text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quickbite_create_order_atomic(jsonb, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.quickbite_update_order_atomic(text, text, jsonb, jsonb) TO service_role;
