# Security hardening changes

This version includes the requested production hardening:

- New signups are always assigned the `customer` role. Admin roles must be granted manually by a trusted operator.
- `has_role` no longer reveals roles for arbitrary user IDs. It is blocked for anonymous users and only allows authenticated users to check their own role. The service role can still perform trusted checks.
- `placeOrder` validates delivery dates on the server against the current date in `Asia/Kolkata`, allowing only today through the next 7 days.
- Public server functions now use a Supabase-backed rate limiter:
  - `placeOrder`: request fingerprint limit plus phone-number limit.
  - `logWhatsAppOrderIntent`: request fingerprint limit plus optional phone-number limit.

## Apply database changes

Deploy the new Supabase migration:

```bash
supabase db push
```

Or paste and run this migration in the Supabase SQL editor:

```text
supabase/migrations/20260624120000_security_hardening.sql
```

## Grant your first admin manually

After your trusted admin user signs up, run this in Supabase SQL editor, replacing the email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'your-admin-email@example.com'
on conflict (user_id, role) do nothing;
```
