# RFC-20261117: Live Audit Report Trust and Evidence

- **Status:** PROPOSED — backlog and acceptance criteria only; no implementation or contract amendment in this change.
- **Date:** 2026-11-17
- **Source:** Manual browser review of the deployed product and read-only audits of public URLs.
- **Related tasks:** `T-305` through `T-311` in [`spec/tasks.md`](../../tasks.md).
- **Contract boundary:** Preserve `INV-01` through `INV-10`. Public audits remain read-only and must not submit forms, perform purchases, or open unsolicited pull requests on external repositories.

## 1. Summary

Pramana currently provides a useful, zero-auth public HTML and accessibility census. The live report is readable and distinguishes public HTML mode from the connected demo. However, testing found that client-rendered content can be absent while the report still returns a clean `PASS`, and the UI can initially display heuristic client estimates while the server audit is still pending. The report score and remediation therefore need stronger evidence and state guarantees before customers should rely on them as checkout health verdicts.

This proposal records the field evidence and defines implementation tasks. It does not change product contracts or claim the current reports meet the acceptance criteria below.

## 2. Manual Field Evidence

All submissions were made through the deployed UI at `https://pramana-ai-eta.vercel.app/`. They caused public HTML fetches only. No form was submitted, no account was created, and no purchase or repository change was attempted. `/api/health` returned HTTP 200. The browser console had zero errors and zero warnings in the inspected session.

| Target | Settled server report | Review observation |
|---|---|---|
| `https://www.google.com` | HTTP 200; approximately 6.7 s; 223.4 KB; `MEDIUM`, 88/100; 11/12 controls passed; 2 unlabeled inputs; revenue N/A. | Before the response settled, the UI displayed a different client-generated profile: `LOW`, 96/100, 42 ms, and 54.8 KB. The final server response replaced it later. A live verdict must not look final while this request is pending. |
| `https://github.com` | HTTP 200; approximately 6.8 s; 512.6 KB; `PASS`, 99/100; 12/12 controls passed; revenue N/A. | The settled UI matched the server response. The report appropriately made no public-route revenue claim. |
| `https://www.apple.com/shop/buy-iphone` | HTTP 200; approximately 6.5 s; 747.7 KB; `MEDIUM`, 94/100; 2 of 4 parsed images reported without alt text; revenue N/A. | Classified as a generic public landing surface despite being a commerce discovery page. It was not a checkout interaction test. |
| `https://www.apple.com/shop/bag` | HTTP 200; approximately 6.6 s; 267.1 KB; `PASS`, 99/100; revenue N/A. | The returned page's first heading was “Please enable JavaScript.” The parser counted 992 static nodes and 39 scripts, marked the audit limitation false, and scored the shell as clean. The actual bag UI was not inspected. |

The health endpoint reported that `GEMINI_API_KEY` is configured. That is not evidence of the account's billing plan or actual charges. Audit responses included `telemetry_cost_usd: 0.024`; the current API defines this as a fixed amortized estimate, not observed provider usage or billing. Keep these meanings separate in all customer-facing telemetry.

## 3. Proposed Behavior and Acceptance Criteria

### T-305 — Fail closed on unrendered page shells and classify commerce surfaces

1. Extend limitation detection beyond a low total-node threshold. Shell signals must include JavaScript-required messages (including “Please enable JavaScript”), a mismatch between requested surface and useful main content, and script-heavy documents whose counted nodes are mostly shared navigation/footer content.
2. A detected shell returns an explicit `CLIENT_SPA_SHELL` or equivalent limitation and `UNVERIFIED` verdict. It must not receive a clean numeric readiness score, a “no issues” statement, or a page-specific fix based only on shared navigation.
3. Treat retail routes such as `/shop/bag` as commerce/bag surfaces even when payment fields are absent. Distinguish product discovery, bag/cart, and direct payment surfaces. A commerce classification alone does not authorize conversion or revenue estimates; without merchant analytics, those values remain null/not applicable.
4. Regression acceptance: an Apple-bag-like fixture with many navigation nodes, many scripts, and a JavaScript-required main-content message must never return `PASS`.

### T-306 — Keep pending and final report states honest

1. Show a pending state from URL submission until the server response settles. Do not show a final-looking severity, score, latency, or “audit complete” state sourced from `buildClientAuditProfile` while the request is pending.
2. On success, display the server payload for the exact submitted URL, including its path, mode, status, and final measurements.
3. On timeout/network/API failure, show an explicit failure or clearly labeled deterministic fallback. Never describe a client estimate or fallback as a live scrape.
4. Ignore stale or out-of-order responses if a user starts another audit. An earlier result must not appear under a later URL, even when both URLs share a hostname.
5. Regression acceptance: with a delayed `/api/audit` response, the UI remains pending; after completion its visible verdict, score, page title, and counts match the response payload.

### T-307 — Ground every finding and remediation in evidence

1. Each finding must show the observed evidence that supports it: the inspected role/name or markup fact, the relevant snippet/attribute, and whether it came from static HTML or a rendered browser capture.
2. Mark observations separately from inferences. Include the limitation and confidence for each claim; do not imply layout, contrast, click, or payment-flow evidence that was not collected.
3. A suggested fix must name the finding it addresses and be derived from that finding. If only a shared navigation control was parsed, do not present its generic CSS adjustment as a fix for an unrendered cart.
4. Keep `INV-03`: role, accessible name, and visual geometry remain identity evidence when available; CSS/XPath selectors may be displayed only as diagnostic text, never as the resolution mechanism.

### T-308 — Add deterministic regression coverage and a live smoke matrix

1. Add local HTML fixtures for: an accessible static information page; a commerce product page; a bag/cart route without payment inputs; a JavaScript shell with substantial navigation/footer markup; and upstream auth, bot-wall, rate-limit, and server-error responses.
2. Test API classification, limitations, severity, score behavior, revenue nullability, and remediation eligibility for each fixture.
3. Test delayed success, network failure, malformed/error response, and out-of-order UI responses. Assert the final displayed result matches the corresponding server response.
4. Add relevant cases to `spec/smoke.md`; retain all current `spec/evals.md` thresholds. A known unrendered-shell fixture has a hard zero false-PASS gate.
5. Keep live external-site checks manual/read-only and record the URL, timestamp, HTTP status, audit mode, and report verdict. Do not make CI correctness depend on third-party sites staying unchanged.

### T-309 — Make cost and model telemetry auditable

1. Represent credential configuration, actual model/provider calls, estimated marginal cost, measured token usage, and verified account billing as distinct fields.
2. If usage is not returned by the provider/router ledger, label the fixed `$0.024` value as an estimate or mark measured cost unavailable. Do not call the estimate an actual charge.
3. Do not infer a free-tier billing account from `GEMINI_API_KEY` being present. Only report verified `$0.00` account billing when the evidence source supports that statement.
4. Keep the hard constraints: `$0.00` recurring infrastructure per `INV-01` and measured/estimated per-audit budget within the documented `INV-06` ceiling, with the basis disclosed.

### T-310 — Separate static public scans from browser audits

1. Keep public HTML mode explicitly limited to static HTML/ARIA inspection until a browser runtime actually executes for that request.
2. To claim a rendered live audit, use an allowed zero-cost runner from `INV-01` and an isolated, disposable context from `INV-09`.
3. Capture the evidence needed for the claim (at minimum hydrated DOM, screenshot/viewport, console and failed network responses); do not claim mobile overlap, contrast, dead clicks, or checkout behavior without the corresponding browser evidence.
4. Default external-site runs to read-only. Do not submit payment, account, or other state-changing forms. No third-party repository PR is available without an explicitly connected repository and the full `INV-04` gate.
5. If the browser path is not implemented, product copy and report labels must stay within the public HTML capability boundary.

### T-311 — Validate comprehension and actionability with target users

1. Recruit five D2C checkout engineering/product users and observe them reviewing a report for a public page they recognize. Do not coach them through the claims.
2. Before the sessions, record the hypotheses and decision thresholds. Check whether users can distinguish static HTML from browser replay, verify a finding from its evidence, and state a reasonable next action.
3. Record anonymized observations and confusing labels. Five sessions can reveal comprehension problems; they cannot establish market size, conversion rates, or willingness to pay.
4. If users confuse `PASS` with a verified checkout or cannot find the evidence for a finding, fix the report and repeat before using it for customer outreach.

## 4. Non-Goals and Invariant Guardrails

- Do not fabricate revenue loss, conversion percentages, audit cost, or browser evidence.
- Do not add paid services or require a card-backed account; preserve `INV-01`.
- Do not run destructive fuzzing, load tests, checkout purchases, or state-changing flows against public sites.
- Do not push changes to third-party repositories or bypass isolated-branch/AST gates.
- Do not relax benchmark gates after observing results. Any invariant change still requires an ADR and a spec-only amendment commit.

## 5. Delivery Order

1. **Trust blockers:** `T-305` and `T-306`.
2. **Evidence and repeatability:** `T-307` and `T-308`.
3. **Truthful operating claims:** `T-309` and `T-310`.
4. **User comprehension:** `T-311`.

No implementation task is marked complete by this proposal. Each task must update the relevant smoke/evaluation evidence and `AGENT_LOG.md` when implemented.
