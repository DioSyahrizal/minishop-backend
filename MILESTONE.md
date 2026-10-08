# MiniShop — Backend Learning Milestones

One project that grows phase by phase. Each phase adds a backend concept and has a **Done when** check you can verify yourself.

**What it is:** a small e-commerce backend (products, orders, payments, stock, notifications). It's a useful domain to learn on because it naturally needs APIs, caching, webhooks, queues, multiple services and consistency guarantees.

## Tech Stack

| Concern            | Choice                                   |
| ------------------ | ---------------------------------------- |
| Language / runtime | TypeScript + Node.js                     |
| Framework          | NestJS                                   |
| Database           | PostgreSQL + Drizzle (migrations)        |
| Cache / jobs       | Redis + BullMQ                           |
| Message broker     | RabbitMQ                                 |
| Payments           | Stripe (test mode)                       |
| Local infra        | Docker + Docker Compose                  |
| Observability      | pino, OpenTelemetry, Jaeger, Prometheus, Grafana |
| Testing / load     | Vitest, Supertest, k6                    |

## Timeline Overview

| Phase | Topic                          | Weeks  |
| ----- | ------------------------------ | ------ |
| 0     | Foundations                    | 1      |
| 1     | REST API                       | 2–3    |
| 2     | Database depth                 | 4      |
| 3     | Caching with Redis             | 5      |
| 4     | Background jobs                | 6      |
| 5     | Webhooks (in & out)            | 7      |
| 6     | Services + RabbitMQ            | 8–9    |
| 7     | Observability                  | 10     |
| 8     | Production readiness           | 11–12  |

---

## Phase 0 — Foundations (Week 1)

**Goal:** The API running locally, talking to the infrastructure containers.

- [x] Install Docker and learn the basics of `docker compose`
- [x] `compose.yml` with Postgres, Redis, RabbitMQ (with management UI)
- [x] Scaffold the NestJS project (TypeScript, oxlint, Prettier)
- [x] Env config with validation (`.env`, `.env.example`)
- [x] ORM setup + first migration
- [x] `GET /health` endpoint that checks DB connectivity

**Done when:** `docker compose up -d` starts the infrastructure, `npm run start:dev` starts the API, and `GET /health` returns `200 OK` (and `503` when the DB is stopped).

---

## Phase 1 — A REST API You'd Be Proud Of (Weeks 2–3)

**Goal:** A well-built monolith API with auth and tests.

### Resources
- [ ] `users`: register, login, profile
- [ ] `products`: CRUD (admin only for writes) — CRUD done, admin-only pending auth
- [ ] `orders`: create, list my orders, get order detail

### Auth
- [ ] Password hashing (argon2 or bcrypt)
- [ ] JWT access token + refresh token flow
- [ ] Role-based access control (`admin`, `customer`)

### API quality
- [x] Request validation (zod, schemas derived from Drizzle via `drizzle-orm/zod`)
- [x] One consistent error response format
- [ ] Correct HTTP status codes (201, 204, 400, 401, 403, 404, 409, 422)
- [ ] Pagination: offset first, then cursor-based
- [ ] Filtering and sorting on product list
- [ ] OpenAPI / Swagger docs

### NestJS building blocks
Use each one at least once, on purpose, and write down the order they run in.
- [ ] **Middleware:** request logging (method, path, status, duration)
- [ ] **Guard:** JWT auth + `@Roles()` check
- [ ] **Pipe:** zod validation pipe for bodies, params and queries — bodies done, queries pending (pagination/filtering)
- [ ] **Interceptor:** response timing or response envelope
- [x] **Exception filter:** global filter that produces the consistent error format
- [ ] **Custom decorator:** `@CurrentUser()` to read the authenticated user

### Testing
- [ ] Unit tests for services/business logic
- [ ] Integration tests against a real test database

**Done when:** a customer can sign up, browse products and place an order, and the tests cover these main paths.

---

## Phase 2 — Database Depth (Week 4)

**Goal:** Understand where most backend bugs come from: concurrency and data integrity.

- [ ] **Transactions:** placing an order reduces stock and creates the order together, or does neither
- [ ] **Race conditions:** reproduce two users buying the last item at the same time
- [ ] Fix with pessimistic locking (`SELECT ... FOR UPDATE`)
- [ ] Fix with optimistic locking (a `version` column) and compare the two approaches
- [ ] Add indexes; read `EXPLAIN ANALYZE` output
- [ ] Find and fix an N+1 query
- [ ] Constraints: unique, foreign key, check (e.g. `stock >= 0`)

**Done when:** a script firing 50 concurrent orders at a product with 10 units of stock never oversells.

---

## Phase 3 — Caching with Redis (Week 5)

**Goal:** Make reads fast without serving stale or wrong data.

- [ ] Cache-aside for product list and product detail
- [ ] TTL strategy (and why not to cache everything forever)
- [ ] Cache invalidation when an admin updates or deletes a product
- [ ] Cache stampede protection (lock or stale-while-revalidate)
- [ ] Rate limiting with Redis: fixed window, then sliding window
- [ ] Apply rate limits to `login` and `checkout`
- [ ] Benchmark before/after with k6 or autocannon

**Done when:** you have numbers showing latency/throughput before and after caching, and updates appear immediately after invalidation.

---

## Phase 4 — Background Jobs (Week 6)

**Goal:** Move slow or unreliable work out of the request path.

- [ ] Add BullMQ (Redis-backed queue) and a separate worker process
- [ ] Send order confirmation emails via a job (use Mailpit locally)
- [ ] Generate invoice PDFs as a job
- [ ] Retries with exponential backoff
- [ ] Failed-job handling and inspection
- [ ] Scheduled/delayed job: cancel unpaid orders after 30 minutes and release their stock

**Done when:** the checkout API responds fast, and the email still arrives even if the worker was down for a while.

---

## Phase 5 — Webhooks, Both Directions (Week 7)

**Goal:** Integrate with external systems safely.

### Receiving (Stripe, test mode)
- [ ] Create a PaymentIntent at checkout
- [ ] Webhook endpoint for `payment_intent.succeeded` / `payment_intent.payment_failed`
- [ ] Verify the webhook signature (needs the raw request body)
- [ ] Idempotency: store processed event IDs and ignore duplicates
- [ ] Use the Stripe CLI to forward events to localhost

### Sending (outgoing webhooks)
- [ ] Let "merchants" register a webhook URL for `order.paid`
- [ ] Sign payloads with HMAC (with timestamp to prevent replay)
- [ ] Deliver via background job, retry with backoff
- [ ] Delivery log (status, attempts, response code)
- [ ] Auto-disable endpoints that keep failing
- [ ] Build a tiny receiver app to test your own webhooks

**Done when:** replaying the same Stripe event twice doesn't mark the order paid twice, and your outgoing webhooks survive a receiver that's temporarily down.

---

## Phase 6 — Split into Services with RabbitMQ (Weeks 8–9)

**Goal:** Learn how services communicate and stay consistent without a shared transaction.

### Services
- [ ] `order-service`
- [ ] `payment-service`
- [ ] `inventory-service`
- [ ] `notification-service`
- [ ] Each service owns its own database/schema

### Event flow
```
order.created → stock.reserved → payment.succeeded → order.confirmed
                                 payment.failed    → stock.released → order.cancelled
```

### Concepts
- [ ] Exchanges (topic), queues, routing keys
- [ ] Manual ack/nack and prefetch
- [ ] Dead-letter queues (DLQ) for messages that keep failing
- [ ] Idempotent consumers (the same message may arrive more than once)
- [ ] **Outbox pattern:** write to the DB and publish an event without losing either
- [ ] **Saga pattern:** compensating actions when a later step fails
- [ ] Decide sync (HTTP/gRPC) vs async (events), and write down why
- [ ] Try `@nestjs/microservices` for RabbitMQ, compare it with plain `amqplib`, and note what the abstraction hides (exchanges, ack control, DLQ setup)

**Done when:** you can kill `notification-service`, place orders, restart it, and it catches up with no lost messages.

---

## Phase 7 — Observability (Week 10)

**Goal:** See what your system is doing across services.

- [ ] Structured JSON logging (pino)
- [ ] Correlation ID passed through HTTP headers and message headers
- [ ] Distributed tracing with OpenTelemetry + Jaeger
- [ ] Metrics with Prometheus: request rate, error rate, latency, queue depth
- [ ] Grafana dashboard
- [ ] Liveness and readiness health checks per service

**Done when:** you can find a slow request in Jaeger and see which service caused it.

---

## Phase 8 — Production Readiness (Weeks 11–12)

**Goal:** Ship it and learn where it breaks.

- [ ] API gateway / reverse proxy (nginx or Traefik)
- [ ] Graceful shutdown: finish in-flight requests and messages before exit
- [ ] Dockerfile for the API (multi-stage, non-root) + `api` service in compose
- [ ] CI with GitHub Actions: lint, test, build Docker images
- [ ] Deploy to Railway, Fly.io, or a VPS
- [ ] Secrets management (no secrets in the repo)
- [ ] Security basics: `helmet` headers, explicit CORS config, request body size limits
- [ ] Dependency scanning in CI (`npm audit` or Snyk)
- [ ] Load test with k6 and write down the first bottleneck

**Done when:** it's deployed, CI is green, and you have a short write-up of the load test results.

---

## Stretch Goals

- [ ] Real-time order status with WebSockets or Server-Sent Events (fed by RabbitMQ events)
- [ ] OAuth login with GitHub or Google (Passport strategy), linked to existing accounts
- [ ] Event sourcing for orders: rebuild order state from its event history
- [ ] Build a small frontend client for your own API
- [ ] Replace or compare RabbitMQ with Kafka
- [ ] Full-text product search (Meilisearch)
- [ ] gRPC between internal services
- [ ] Kubernetes basics (deploy with k3d/kind)

---

## Habits

- **Keep a `NOTES.md` per phase:** what you built, what broke, what trade-offs you chose. This turns into good interview material.
- **Break things on purpose:** kill containers, send duplicate requests, cut the network. Backend skill is mostly knowing how things fail.
- **Read alongside:** *Designing Data-Intensive Applications* (Martin Kleppmann). Chapters 5–9 line up with phases 2–6.
