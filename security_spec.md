# Security Specification (`security_spec.md`) — Pusat Informasi Kebijakan SDM Aparatur (`sdmaapp`)

## 1. Data Invariants & Master Source of Truth

1. **Default-Deny Catch-All**: Every path not explicitly matched under `/databases/{database}/documents` is strictly denied (`allow read, write: if false;`).
2. **Verified Admin Gate (`isAdmin()`)**:
   - Only authenticated users with `request.auth.token.email_verified == true` who are either a bootstrapped administrator (`sitianggraini.s.02@gmail.com` or official `@menpan.go.id` allowlisted accounts) OR exist in `/databases/$(database)/documents/admins/$(request.auth.uid)` may create, update, or delete any document.
   - Unverified email tokens (`email_verified == false`) are strictly rejected even if the email string matches an admin address.
3. **PII Isolation on `/admins/{adminUid}`**:
   - Contains administrator email addresses (`email`).
   - `list` is strictly disabled (`allow list: if false;`) to prevent directory scraping.
   - `get` is restricted solely to `request.auth.uid == adminUid || isAdmin()`.
   - Self-elevation is impossible: only an existing `isAdmin()` can create/update `/admins/{adminUid}`.
4. **Relational Integrity (`Policy -> Category`)**:
   - A `Policy` document (`/policies/{policyId}`) cannot be created or updated unless its `categoryId` points to an existing or concurrently created `/categories/{categoryId}` document (`exists(...) || existsAfter(...)`).
5. **Draft Isolation & Query Enforcement (`allow list`)**:
   - Public visitors (`request.auth == null`) can ONLY `get` or `list` `/policies` and `/deputyNews` where `resource.data.status == 'published'`. Draft and review items are mathematically inaccessible to non-admins.
   - Public visitors can ONLY `get` or `list` `/categories`, `/sources`, and `/heroSlides` where `resource.data.isPublic == true`.
   - `/siteContent/{docId}` disables `list` (`allow list: if false;`) and allows `get` only on `docId == 'aboutPage'` when `resource.data.visibility == 'public'`.
   - Zero `get()` or `exists()` calls appear inside any `allow list` rule (preventing O(N) read amplification).
6. **Temporal & Identity Immutability**:
   - Every `create` requires `incoming().authorUid == request.auth.uid` (or `incoming().uid == adminUid` for `/admins`), `incoming().createdAt == request.time`, and `incoming().updatedAt == request.time`.
   - Every `update` wraps logic inside `isValid[Entity](incoming())`, enforces `incoming().createdAt == existing().createdAt` and `incoming().authorUid == existing().authorUid`, requires `incoming().updatedAt == request.time`, and restricts modified keys via `affectedKeys().hasOnly(...)`.
7. **Volumetric & ID Hardening**:
   - Every single-document target (`get`, `create`, `update`, `delete`) enforces `isValidId(docId)` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`).
   - Every string field enforces `.size()` bounds matching `firebase-blueprint.json`, and every array enforces `.size() <= MAX` plus element type check on index `0` when non-empty.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Unauthenticated Policy Creation**: `auth = null`, `POST /policies/pol-1` with valid shape -> **MUST DENY**.
2. **Payload 2 — Email Spoofing Attack (`email_verified: false`)**: `auth = { uid: 'spoof-1', email: 'sitianggraini.s.02@gmail.com', email_verified: false }` attempting `create` on `/categories/cat-test` -> **MUST DENY**.
3. **Payload 3 — Self-Assigned Admin Privilege Escalation**: Regular verified user `auth = { uid: 'user-99', email: 'attacker@gmail.com', email_verified: true }` attempting `setDoc` on `/admins/user-99` with `role: 'superadmin'` -> **MUST DENY**.
4. **Payload 4 — PII Leak on `/admins` (`get` & `list`)**: Authenticated non-admin attempting `getDoc(/admins/adm-01)` or `getDocs(/admins)` -> **MUST DENY**.
5. **Payload 5 — Shadow Field Injection ("Ghost Field")**: Verified admin creating `/deputyNews/news-1` with all valid fields PLUS `isSuperVerified: true` -> **MUST DENY** via `hasOnly()`.
6. **Payload 6 — Draft Policy Scraping via `list` / `get`**: Unauthenticated visitor reading `/policies/pol-draft-1` (`status: 'draft'`) or listing all `/policies` without `where('status', '==', 'published')` -> **MUST DENY**.
7. **Payload 7 — Orphaned Foreign Key (`Policy.categoryId`)**: Verified admin creating `/policies/pol-orphan` referencing non-existent `categoryId: 'cat-does-not-exist'` -> **MUST DENY** via `exists()`.
8. **Payload 8 — Identity Spoofing (`authorUid` mismatch)**: Verified admin `uid = 'admin-1'` creating `/sources/src-1` with `authorUid: 'someone-else'` -> **MUST DENY**.
9. **Payload 9 — Client Timestamp Forgery**: Verified admin creating `/heroSlides/hero-slide-1` with a forged past/future timestamp instead of `serverTimestamp()` (`request.time`) -> **MUST DENY**.
10. **Payload 10 — Immortal Field Mutation (`createdAt` / `authorUid` tampering on `update`)**: Verified admin updating `/deputyNews/news-1` while altering `createdAt` or `authorUid` -> **MUST DENY**.
11. **Payload 11 — ID Poisoning (2KB junk document ID)**: Verified admin creating `/categories/{200-char-invalid-id$#@!}` -> **MUST DENY** via `isValidId()`.
12. **Payload 12 — Value Poisoning on Update (`affectedKeys` type/size bypass)**: Verified admin updating whitelisted key `title` on `/deputyNews/news-1` with a boolean `true` or 5,000-char string (exceeding `maxLength: 300`) -> **MUST DENY** via `isValidDeputyNews(incoming())` wrapping `allow update`.

---

## 3. Red Team Audit Matrix

| Collection | Shadow Update (`hasOnly`) | Email Spoofing (`email_verified`) | PII Isolation | Secure `allow list` (No `get`/`exists`, checks `resource.data`) | `isValid[Entity]` Wraps `update` | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/admins/{adminUid}` | PASS | PASS | PASS (`list: false`, owner/admin `get`) | PASS (`list: false`) | PASS | SECURE |
| `/categories/{categoryId}` | PASS | PASS | N/A (No PII) | PASS (`existing().isPublic == true`) | PASS | SECURE |
| `/sources/{sourceId}` | PASS | PASS | N/A (No PII) | PASS (`existing().isPublic == true`) | PASS | SECURE |
| `/policies/{policyId}` | PASS | PASS | N/A (No PII) | PASS (`existing().status == 'published'`) | PASS | SECURE |
| `/deputyNews/{newsId}` | PASS | PASS | N/A (No PII) | PASS (`existing().status == 'published'`) | PASS | SECURE |
| `/heroSlides/{slideId}` | PASS | PASS | N/A (No PII) | PASS (`existing().isPublic == true`) | PASS | SECURE |
| `/siteContent/{docId}` | PASS | PASS | N/A (No PII) | PASS (`list: false`) | PASS | SECURE |
