DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.orders'::regclass
          AND conname = 'orders_no_card_on_delivery'
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_no_card_on_delivery
            CHECK (payment_method IS DISTINCT FROM 'card') NOT VALID;
    END IF;
END $$;
