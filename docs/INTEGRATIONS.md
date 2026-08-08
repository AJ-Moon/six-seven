# Integrations

- PostgreSQL/Supabase: authoritative application database. FastAPI uses `DATABASE_URL`; the browser Supabase client is currently used for realtime order subscriptions.
- OpenAI: current chatbot and menu parser call OpenAI directly. A provider abstraction, structured outputs, redaction, asynchronous execution, and audit trail are planned.
- Mapbox: browser address search and delivery-location UX.
- Messaging: no production adapters. Phase 5 starts with deterministic mock email/SMS/WhatsApp providers.
