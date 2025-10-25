# ⚡ COMMANDS REFERENCE

Kompletna referenca wszystkich dostępnych komend do pracy z agentami.

## 📋 Dostępne Komendy

### 1. /generate-tests

**Cel**: Automatyczne generowanie testów

**Agenci**: Frontend Developer, Backend Developer

**Użycie**:
```bash
/generate-tests client/src/components/Button.tsx
/generate-tests server/routes.ts
/generate-tests
```

**Co robi**:
- Generuje Vitest test files
- Tworzy unit tests dla funkcji
- Tworzy integration tests dla endpoints
- Setup test fixtures
- Mocking strategies

**Przykład**:
```
/generate-tests client/src/pages/attendance.tsx

RESULT:
- attendance.test.tsx (created)
- Test cases dla każdej komponenty
- Mocking dla API calls
- Snapshot tests
```

---

### 2. /check-security

**Cel**: Audyt bezpieczeństwa kodu

**Agent**: Security Auditor

**Użycie**:
```bash
/check-security server/auth.ts
/check-security server/routes.ts
/check-security
```

**Co robi**:
- Sprawdza authentication
- Sprawdza authorization (RBAC)
- Szuka injection vulnerabilities
- Sprawdza credential handling
- Weryfikuje secure headers

**Przykład**:
```
/check-security server/auth.ts

RESULT:
Security Report:
✅ bcrypt hashing: OK
⚠️  Rate limiting: MISSING
❌ Session fixation: VULNERABLE
```

---

### 3. /optimize-bundle

**Cel**: Analiza i optymizacja bundle size

**Agent**: React Performance Optimizer

**Użycie**:
```bash
/optimize-bundle
/optimize-bundle --analyze
/optimize-bundle --detailed
```

**Co robi**:
- Analizuje bundle composition
- Identyfikuje duże biblioteki
- Sugeruje code splitting
- Sprawdza tree shaking
- Rekomenduje lazy loading

**Przykład**:
```
/optimize-bundle

RESULT:
Bundle Analysis:
- Total size: 250KB
- Largest chunks:
  1. react-dom: 80KB
  2. recharts: 60KB
  3. your-code: 50KB

Recommendations:
1. Split pages to separate chunks (-40% initial)
2. Lazy load reports page (-30KB initial)
3. Use dynamic imports for modals
```

---

### 4. /type-check

**Cel**: Weryfikacja TypeScript typów

**Agenci**: Frontend Developer, Backend Developer

**Użycie**:
```bash
/type-check
/type-check client/src
/type-check server
```

**Co robi**:
- Sprawdza TypeScript errors
- Weryfikuje type safety
- Sugeruje lepsze typing
- Unika `any` typów
- Sprawdza Zod schemas

**Przykład**:
```
/type-check server

RESULT:
Type Checking:
✅ 0 errors
⚠️  5 warnings (implicit any)
✅ All schemas valid

Suggestions:
1. shared/schema.ts:45 - Add type for handler
2. server/lib/sheets.ts:120 - Avoid any
```

---

### 5. /review-schema

**Cel**: Przegląd database schema

**Agent**: Database Architect

**Użycie**:
```bash
/review-schema shared/schema.ts
/review-schema
```

**Co robi**:
- Analizuje schema design
- Identyfikuje missing indexes
- Sprawdza relationships
- Sugeruje normalizację
- Wspiera performance tuning

**Przykład**:
```
/review-schema shared/schema.ts

RESULT:
Schema Review:
✅ Primary keys: OK
⚠️  Indexes: MISSING on groupIds
❌ Normalization: Could improve

Recommendations:
1. Add index on instructorsAuth.groupIds
2. Create separate instructorGroups table
3. Add updatedAt timestamps
```

---

## 🎯 Kombineracje Komend

### Comprehensive Code Review

```bash
# 1. Type safety
/type-check

# 2. Security audit
/check-security server/auth.ts

# 3. Performance
/optimize-bundle

# 4. Database
/review-schema

# 5. Tests
/generate-tests
```

### Frontend Optimization

```bash
# 1. Type check
/type-check client/src

# 2. Bundle optimization
/optimize-bundle

# 3. Tests
/generate-tests client/src/pages/attendance.tsx
```

### Backend Hardening

```bash
# 1. Security audit
/check-security server/routes.ts

# 2. Type safety
/type-check server

# 3. Tests
/generate-tests server/routes.ts

# 4. Database review
/review-schema shared/schema.ts
```

---

## 💡 Use Cases

### Usecase 1: Przed Deploymentem

```bash
# 1. Comprehensive security check
/check-security server/auth.ts
/check-security server/routes.ts

# 2. Type safety
/type-check

# 3. Bundle analysis
/optimize-bundle

# 4. Database review
/review-schema

# 5. Generate/run tests
npm run test

# ✅ Ready to deploy!
```

### Usecase 2: Performance Optimization Sprint

```bash
# 1. Bundle analysis
/optimize-bundle --detailed

# 2. Component review
Pytaj: "Frontend Developer, performance audit?"

# 3. Database optimization
/review-schema

# 4. API optimization
Pytaj: "Backend Developer, query optimization?"

# 5. Benchmark
npm run test
# Compare before/after metrics
```

### Usecase 3: Security Audit

```bash
# 1. Comprehensive security check
/check-security

# 2. Schema security review
Pytaj: "Security Auditor, database access control?"

# 3. API security
/check-security server/routes.ts

# 4. Generate tests
/generate-tests

# ✅ Security hardened!
```

---

## 🚫 Komendy które mogą być ADDED w przyszłości

Jeśli chcesz, możesz dodać te komendy do `.claude/commands.json`:

```json
{
  "name": "lint-code",
  "trigger": "/lint",
  "agent": "frontend-developer, backend-developer"
}

{
  "name": "format-code",
  "trigger": "/format",
  "agent": "frontend-developer, backend-developer"
}

{
  "name": "generate-docs",
  "trigger": "/docs",
  "agent": "frontend-developer, backend-developer"
}

{
  "name": "profile-performance",
  "trigger": "/profile",
  "agent": "react-performance-optimizer"
}

{
  "name": "audit-dependencies",
  "trigger": "/audit",
  "agent": "security-auditor"
}
```

---

## 📊 Komenda Matryca

| Komenda | Agent(y) | Czas | Output |
|---------|----------|------|--------|
| /generate-tests | FD, BD | 2-5 min | Test files |
| /check-security | SA | 1-3 min | Security report |
| /optimize-bundle | RPO | 1-2 min | Bundle analysis |
| /type-check | FD, BD | < 1 min | Type errors |
| /review-schema | DA | 1-2 min | Schema review |

**Legendy**:
- FD = Frontend Developer
- BD = Backend Developer
- DA = Database Architect
- SA = Security Auditor
- RPO = React Performance Optimizer

---

## 🎓 Best Practices

### ✅ DO's
- Używaj komend regularnie
- Kombinuj komendy dla comprehensive reviews
- Review output od agentów
- Implement recommendations
- Run before deployments

### 🚫 DON'Ts
- Nie ignoruj warnings
- Nie skip security checks
- Nie commituj bez /type-check
- Nie deployuj bez /check-security
- Nie ignoruj performance warnings

---

## 🔧 Jak Dodać Swoją Komendę?

Jeśli chcesz dodać nową komendę:

1. Edytuj `.claude/commands.json`
2. Dodaj nowy wpis:

```json
{
  "name": "my-command",
  "description": "Co robi ta komenda",
  "trigger": "/my-command",
  "agent": "frontend-developer",
  "example": "/my-command [optional-args]"
}
```

3. Przeładuj Claude Code

---

## 📱 Keyboard Shortcuts

Jeśli chcesz szybko wywoływać komendy:

- Setup `.claude/hotkeys.json` (jeśli twoja edycja wspiera)
- Lub użyj command palette:
  - Cmd+K (Mac) / Ctrl+K (Windows)
  - Type `/command-name`

---

**Wersja**: 1.0.0
**Data**: 25 października 2025

---

Chcesz nauczyć się więcej? Czytaj:
- `README.md` - Pełna dokumentacja
- `01-FRONTEND-DEVELOPER.md` - Frontend Developer agent
- `02-BACKEND-DEVELOPER.md` - Backend Developer agent
- `03-DATABASE-ARCHITECT.md` - Database Architect agent
- `04-SECURITY-AUDITOR.md` - Security Auditor agent
- `05-REACT-PERFORMANCE-OPTIMIZER.md` - React Performance Optimizer agent
