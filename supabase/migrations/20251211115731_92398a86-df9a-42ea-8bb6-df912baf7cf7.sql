-- Fix search_path for get_category_totals function
CREATE OR REPLACE FUNCTION public.get_category_totals(start_date timestamp with time zone, end_date timestamp with time zone)
 RETURNS TABLE(category_id integer, name text, emoji text, color text, total_amount_cents bigint)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path = public
AS $$
    SELECT
        c.id as category_id,
        c.name,
        c.emoji,
        c.color,
        SUM(t.amount_cents) AS total_amount_cents
    FROM
        public.transactions t
    JOIN
        public.categories c ON t.category_id = c.id
    WHERE
        t.user_id = auth.uid()
        AND t.type = 'expense'
        AND t.date >= start_date
        AND t.date <= end_date
    GROUP BY
        c.id, c.name, c.emoji, c.color
    ORDER BY
        total_amount_cents DESC;
$$;

-- Fix search_path for get_daily_totals function
CREATE OR REPLACE FUNCTION public.get_daily_totals(start_date timestamp with time zone, end_date timestamp with time zone)
 RETURNS TABLE(date text, income bigint, expense bigint)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path = public
AS $$
    WITH daily_data AS (
        SELECT
            date_trunc('day', t.date) AS day,
            t.type,
            SUM(t.amount_cents) AS total_cents
        FROM
            public.transactions t
        WHERE
            t.user_id = auth.uid()
            AND t.date >= start_date
            AND t.date <= end_date
        GROUP BY
            day, t.type
    )
    SELECT
        to_char(d.day, 'DD/MM') AS date,
        COALESCE(SUM(CASE WHEN d.type = 'income' THEN d.total_cents ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN d.type = 'expense' THEN d.total_cents ELSE 0 END), 0) AS expense
    FROM
        daily_data d
    GROUP BY
        d.day
    ORDER BY
        d.day ASC;
$$;