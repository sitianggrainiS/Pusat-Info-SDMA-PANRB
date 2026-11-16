# Security Specification (`security_spec.md`) — KOMPAK SDMA (`sdmapanrbinfo`)

- **Firebase Project ID**: `sdmapanrbinfo`
- **Firestore Database ID**: `ai-studio-remixpusatinform-46fee186-88a5-4814-abf8-e77cd9762854`

## 1. Data Invariants & Master Source of Truth

1. **Default-Deny Catch-All**: Every path not explicitly matched under `/databases/{database}/documents` is strictly denied (`allow read, write: if false;`).
2. **Pure UID-Based Admin Gate (`isAdmin()` & `isSuperAdmin()`)**:
   - No hardcoded email allowlists or frontend passwords are used as proof of authorization.
   - Only authenticated Firebase Auth users (`request.auth != null`) whose UID exists at `/databases/$(database)/documents/admins/$(request.auth.uid)` with `isActive != false` and a valid institutional role (`superadmin`, `content_manager`, `legal_reviewer`, `editor`) are granted `isAdmin()` privileges.
   - Only accounts with `role == 'superadmin'` and `isActive != false` are granted `isSuperAdmin()` privileges to manage `/admins/{adminId}`.
   - Newly authenticated Firebase users without a corresponding `/admins/{uid}` document are automatically denied admin access (`PERMISSION_DENIED`) and signed out on the client.
3. **PII Isolation on `/admins/{adminId}`**:
   - Contains administrator emails and organizational profiles.
   - `get` is restricted solely to `request.auth.uid == adminId || isSuperAdmin()`.
   - `list`, `create`, `update`, and `delete` are restricted solely to `isSuperAdmin()`.
   - Self-elevation is blocked: only an existing `isSuperAdmin()` can create, update, or delete `/admins/{adminId}`, and `incoming().uid == adminId` / `incoming().uid == existing().uid` is enforced.
4. **Draft Isolation & Query Enforcement (`allow list` / `allow get`)**:
   - Public visitors (`request.auth == null`) or non-admin users can ONLY read `/policies` and `/deputy_news` documents where `existing().status == 'published'`. Draft and review items are readable only by UID-authorized admins (`isAdmin()`).
   - Public visitors can read `/hero_slides`, `/categories`, `/sources`, and `/about_page/main`.
5. **Shadow-Field Prevention & Update-Gap Protection**:
   - Every `create` and `update` invokes `isValid[Entity](incoming())`, which validates both `hasAll([...required])` and `hasOnly([...allowed])` plus strict types and `.size()` bounds.
   - Every `update` validates `incoming().diff(existing()).affectedKeys().hasOnly([...mutableFields])` and enforces `id` / `uid` immutability (`incoming().id == existing().id`).
6. **Path Variable Hardening**:
   - Every single-document operation (`get`, `create`, `update`, `delete`) enforces `isValidId(docId)` (`1..128` chars, `^[a-zA-Z0-9_\-]+$`).

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Unauthenticated Policy Creation**: `auth = null`, `setDoc(/policies/pol-1, ...)` -> **DENIED**.
2. **Payload 2 — Unmapped Authenticated User Write**: `auth = { uid: 'regular-user-1', email: 'tim.kontensdma@menpan.go.id' }` WITHOUT `/admins/regular-user-1` document attempting `create` on `/categories/cat-test` -> **DENIED** (email string alone grants zero privileges).
3. **Payload 3 — Self-Assigned Admin Privilege Escalation**: Authenticated non-admin user `auth = { uid: 'user-99' }` attempting `setDoc(/admins/user-99, { uid: 'user-99', email: 'attacker@gmail.com', role: 'superadmin' })` -> **DENIED** (`isSuperAdmin()` required).
4. **Payload 4 — PII Leak on `/admins` (`get` & `list`)**: Authenticated non-superadmin attempting `getDoc(/admins/other-uid)` or `getDocs(/admins)` -> **DENIED**.
5. **Payload 5 — Shadow Field Injection ("Ghost Field")**: Authorized admin creating `/deputy_news/news-1` with valid fields PLUS `isSuperVerified: true` -> **DENIED** via `hasOnly()`.
6. **Payload 6 — Draft Policy Scraping via `list` / `get`**: Unauthenticated visitor reading `/policies/pol-draft-1` (`status: 'draft'`) or listing `/policies` without `where('status', '==', 'published')` -> **DENIED**.
7. **Payload 7 — Draft Deputy News Scraping**: Unauthenticated visitor reading `/deputy_news/news-draft-1` (`status: 'draft'`) -> **DENIED**.
8. **Payload 8 — About Page Arbitrary Doc Enumeration**: Public visitor attempting `getDocs(/about_page)` (`list`) or reading `/about_page/internal_notes` -> **DENIED**.
9. **Payload 9 — Unbounded Units Array Attack on `/about_page/main`**: Authorized admin writing `units` array with > 20 items or non-map element at index 0 -> **DENIED**.
10. **Payload 10 — ID Mutation on Update**: Authorized admin updating `/policies/pol-1` while changing `id` to `'pol-2'` -> **DENIED**.
11. **Payload 11 — ID Poisoning (Invalid / Oversized Doc ID)**: Authorized admin creating `/categories/{200-char-invalid-id$#@!}` -> **DENIED** via `isValidId()`.
12. **Payload 12 — Value Poisoning on Update (`affectedKeys` type/size bypass)**: Authorized admin updating `title` on `/deputy_news/news-1` with boolean `true` or 5,000-char string (> `maxLength: 300`) -> **DENIED** via `isValidDeputyNews(incoming())`.

---

## 3. Red Team Audit Matrix

| Collection | Shadow Update (`hasOnly`) | UID / Role Spoofing | PII Isolation | Secure `allow list` | `isValid[Entity]` Wraps `update` | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/admins/{adminId}` | PASS | PASS (`isSuperAdmin()`) | PASS (`uid == adminId \|\| isSuperAdmin()`) | PASS (`isSuperAdmin()`) | PASS | SECURE |
| `/policies/{policyId}` | PASS | PASS (`isAdmin()`) | N/A | PASS (`existing().status == 'published' \|\| isAdmin()`) | PASS | SECURE |
| `/deputy_news/{newsId}` | PASS | PASS (`isAdmin()`) | N/A | PASS (`existing().status == 'published' \|\| isAdmin()`) | PASS | SECURE |
| `/hero_slides/{slideId}` | PASS | PASS (`isAdmin()`) | N/A | PASS (`if true` public banner) | PASS | SECURE |
| `/categories/{categoryId}` | PASS | PASS (`isAdmin()`) | N/A | PASS (`if true` public taxonomy) | PASS | SECURE |
| `/about_page/{docId}` | PASS | PASS (`isAdmin()`) | N/A | PASS (`isAdmin()`) | PASS | SECURE |
| `/sources/{sourceId}` | PASS | PASS (`isAdmin()`) | N/A | PASS (`if true` public legal refs) | PASS | SECURE |
