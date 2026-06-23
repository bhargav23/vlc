-- Security hardening for public server functions and role management.

-- 1) New signups should never be auto-promoted to admin.
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

-- 2) has_role is required by RLS, but it must not leak role status for arbitrary users.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    CASE
      WHEN auth.role() = 'service_role' THEN
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
      WHEN _user_id = auth.uid() THEN
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = _role)
      ELSE false
    END
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3) Shared rate-limit storage for public server functions.
CREATE TABLE IF NOT EXISTS public.server_rate_limits (
  scope TEXT NOT NULL,
  identifier_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, identifier_hash)
);

ALTER TABLE public.server_rate_limits ENABLE ROW LEVEL SECURITY;

-- No client policies are created. Only trusted server/service-role code should
-- read or mutate this table.

CREATE OR REPLACE FUNCTION public.check_server_rate_limit(
  _scope TEXT,
  _identifier_hash TEXT,
  _max_requests INTEGER,
  _window_seconds INTEGER
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _window_start TIMESTAMPTZ;
  _count INTEGER;
  _reset_at TIMESTAMPTZ;
BEGIN
  IF _scope IS NULL OR btrim(_scope) = '' THEN
    RAISE EXCEPTION 'scope is required';
  END IF;

  IF _identifier_hash IS NULL OR length(_identifier_hash) < 32 THEN
    RAISE EXCEPTION 'identifier hash is invalid';
  END IF;

  IF _max_requests IS NULL OR _max_requests < 1 OR _max_requests > 10000 THEN
    RAISE EXCEPTION 'max requests is invalid';
  END IF;

  IF _window_seconds IS NULL OR _window_seconds < 1 OR _window_seconds > 86400 THEN
    RAISE EXCEPTION 'window seconds is invalid';
  END IF;

  LOOP
    SELECT srl.window_start, srl.count
      INTO _window_start, _count
    FROM public.server_rate_limits AS srl
    WHERE srl.scope = _scope
      AND srl.identifier_hash = _identifier_hash
    FOR UPDATE;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public.server_rate_limits (scope, identifier_hash, window_start, count)
        VALUES (_scope, _identifier_hash, _now, 1);

        allowed := true;
        remaining := GREATEST(_max_requests - 1, 0);
        reset_at := _now + make_interval(secs => _window_seconds);
        RETURN NEXT;
        RETURN;
      EXCEPTION WHEN unique_violation THEN
        -- Another request created the row first. Loop and re-check with lock.
      END;
    ELSE
      _reset_at := _window_start + make_interval(secs => _window_seconds);

      IF _reset_at <= _now THEN
        UPDATE public.server_rate_limits
        SET window_start = _now,
            count = 1,
            updated_at = _now
        WHERE scope = _scope
          AND identifier_hash = _identifier_hash;

        allowed := true;
        remaining := GREATEST(_max_requests - 1, 0);
        reset_at := _now + make_interval(secs => _window_seconds);
        RETURN NEXT;
        RETURN;
      END IF;

      IF _count >= _max_requests THEN
        allowed := false;
        remaining := 0;
        reset_at := _reset_at;
        RETURN NEXT;
        RETURN;
      END IF;

      UPDATE public.server_rate_limits
      SET count = count + 1,
          updated_at = _now
      WHERE scope = _scope
        AND identifier_hash = _identifier_hash;

      allowed := true;
      remaining := GREATEST(_max_requests - _count - 1, 0);
      reset_at := _reset_at;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_server_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_server_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- Optional housekeeping so the table cannot grow forever.
DELETE FROM public.server_rate_limits
WHERE updated_at < now() - interval '7 days';
