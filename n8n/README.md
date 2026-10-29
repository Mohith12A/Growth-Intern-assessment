# n8n integration handoff

The API writes `integration_jobs` records for each saved registration: `sheets_sync` and `registration_confirmation`. This keeps registration durable during integration outages. Before connecting n8n, create authenticated backend worker endpoints with bounded retries and idempotency keys; do not give n8n direct MongoDB access. Configure provider credentials only in n8n, and record safe delivery outcomes back through the backend. No workflow is active until approved email and Sheets credentials are configured.
