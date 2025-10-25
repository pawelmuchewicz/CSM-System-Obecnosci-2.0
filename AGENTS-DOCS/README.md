# 🤖 AGENTS DOCUMENTATION - CSM System Obecności

Kompletna dokumentacja systemu agentów Claude Code zainstalowanych w projekcie CSM System Obecności.

## 📋 Spis Treści

1. [Przegląd Systemu](#przegląd-systemu)
2. [Instalacja i Setup](#instalacja-i-setup)
3. [5 Zainstalowanych Agentów](#5-zainstalowanych-agentów)
4. [Jak Agenty Działają](#jak-agenty-działają)
5. [Dostępne Komendy](#dostępne-komendy)
6. [MCP Integracje](#mcp-integracje)
7. [Praktyczne Przykłady](#praktyczne-przykłady)
8. [FAQ](#faq)

---

## 🎯 Przegląd Systemu

### Co to jest System Agentów?

System agentów Claude Code to **5 specjalistów AI**, którzy działają w tle Twojej pracy nad kodem. Każdy agent ma specjalne umiejętności i automatycznie się włącza gdy pracujesz z odpowiednim kodem.

### Benefity

✅ **Automatyczne** - Nie musisz ich wywoływać
✅ **Zawsze dostępne** - Możesz pytać w każdej chwili
✅ **Specjalistyczne** - Każdy jest ekspertem w swojej dziedzinie
✅ **Multi-agent** - Mogą pracować razem
✅ **Niezawodne** - Nie wpływają na kod, tylko sugerują

### Jak działa?

```
                    ┌─────────────────────┐
                    │  Edytujesz plik     │
                    │  client/src/...tsx  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Claude Code Detekuje│
                    │ kontekst pliku      │
                    └──────────┬──────────┘
                               │
        ┌──────────┬──────────┬┴────┬──────────┐
        │          │          │     │          │
    Frontend    React       (Backend, DB, Security
    Developer   Perf Opt     jako potrzeba)
        │          │
        └──────────┼──────────┐
                   │          │
            ┌──────▼──────┐   │
            │  Kontekst   │   │
            │  Ready!     │   │
            └─────────────┘   │
                               │
                        ┌──────▼──────────┐
                        │ Claude daje     │
                        │ specjalistyczne │
                        │ sugestie        │
                        └─────────────────┘
```

---

## 📥 Instalacja i Setup

### Kiedy zainstalowałem agenty?

**Data**: 25 października 2025
**Metoda**: Ręczna konfiguracja poprzez `.claude/` directory
**Status**: ✅ Aktywne i gotowe

### Pliki Zainstalowane

W folderze `.claude/`:

```
.claude/
├── agents.json              # Konfiguracja 5 agentów
├── commands.json            # Dostępne komendy
├── mcps.json               # Integracje (GitHub, PostgreSQL)
├── settings.local.json     # Uprawnienia (bez zmian)
└── README.md               # Dokumentacja w .claude/
```

### Gdzie jest konfiguracja?

```
/CSM-System-Obecnosci-2.0/
├── .claude/
│   ├── agents.json         ← Tutaj definiuję agentów
│   ├── commands.json       ← Tutaj definiuję komendy
│   └── mcps.json          ← Tutaj definiuję integracje
└── AGENTS-DOCS/            ← Tutaj czytasz dokumentację
    └── (ten folder)
```

---

## 🤖 5 Zainstalowanych Agentów

### 1. Frontend Developer Agent

📄 **Pełna dokumentacja**: Czytaj `01-FRONTEND-DEVELOPER.md`

**Szybkie info:**
- **Specjalność**: React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Włącza się**: Edytujesz `client/src/**/*.tsx` lub `client/src/**/*.ts`
- **Co robi**:
  - Analizuje komponenty React
  - Sugeruje optimizacje performance
  - Sprawdza best practices TypeScript
  - Pomaga z TailwindCSS stylingiem
  - Sugeruje refactoring

**Przykład użycia:**
```
"Frontend Developer, przeanalizuj client/src/pages/attendance.tsx
i zaproponuj optymizacje dla performance"
```

---

### 2. Backend Developer Agent

📄 **Pełna dokumentacja**: Czytaj `02-BACKEND-DEVELOPER.md`

**Szybkie info:**
- **Specjalność**: Express.js, REST API, TypeScript, middleware, error handling
- **Włącza się**: Edytujesz `server/**/*.ts`
- **Co robi**:
  - Analizuje API endpoints
  - Przegląda middleware
  - Sprawdza request/response validation
  - Sugeruje error handling patterns
  - Weryfikuje route structure

**Przykład użycia:**
```
"Backend Developer, sprawdzić czy routes w server/routes.ts
mają poprawną strukturę i error handling"
```

---

### 3. Database Architect Agent

📄 **Pełna dokumentacja**: Czytaj `03-DATABASE-ARCHITECT.md`

**Szybkie info:**
- **Specjalność**: PostgreSQL, Drizzle ORM, schema design, migrations, query optimization
- **Włącza się**: Edytujesz `shared/schema.ts` lub `server/lib/**/*.ts`
- **Co robi**:
  - Przegląda schema design
  - Sugeruje indexes
  - Analizuje query efficiency
  - Wspiera migration planning
  - Optymizuje performance bazy

**Przykład użycia:**
```
"Database Architect, przeanalizuj shared/schema.ts
Czy tablica instructorsAuth potrzebuje indeksów?"
```

---

### 4. Security Auditor Agent

📄 **Pełna dokumentacja**: Czytaj `04-SECURITY-AUDITOR.md`

**Szybkie info:**
- **Specjalność**: Authentication, Authorization, RBAC, credential handling, OWASP
- **Włącza się**: Edytujesz `server/auth.ts`, `server/routes.ts`, `server/lib/sheets.ts`
- **Co robi**:
  - Sprawdza bezpieczeństwo auth/authz
  - Weryfikuje RBAC (role-based access control)
  - Analizuje credential handling
  - Detektuje injection vulnerabilities
  - Sprawdza session security

**Przykład użycia:**
```
"Security Auditor, sprawdzić czy auth system jest bezpieczny
Zwróć uwagę na: JWT, RBAC, bcrypt, session security"
```

---

### 5. React Performance Optimizer Agent

📄 **Pełna dokumentacja**: Czytaj `05-REACT-PERFORMANCE-OPTIMIZER.md`

**Szybkie info:**
- **Specjalność**: React rendering optimization, code splitting, lazy loading, bundle size
- **Włącza się**: Edytujesz `client/src/pages/**/*.tsx` lub `client/src/components/**/*.tsx`
- **Co robi**:
  - Analizuje rendering performance
  - Sugeruje memoization strategy
  - Wspiera code splitting
  - Rekomenduje lazy loading
  - Analizuje bundle size

**Przykład użycia:**
```
"React Performance Optimizer, które komponenty powinny być
lazy loaded? Jak mogę zmniejszyć bundle size?"
```

---

## 💡 Jak Agenty Działają

### Poziom 1: Automatycznie

Agenty działają **zawsze w tle**. Nie musisz nic robić.

```
Otwierasz plik: client/src/components/Button.tsx
    ↓
Frontend Developer + React Performance Optimizer = AUTO WŁĄCZENI
    ↓
Kiedy pytasz Claude o kod, oni są już w kontekście
    ↓
Dostajesz specjalistyczne odpowiedzi
```

### Poziom 2: Jawnie - Komendami

Możesz używać predefined komend:

```bash
/generate-tests      # Generuj Vitest testy
/check-security      # Audyt bezpieczeństwa
/optimize-bundle     # Analiza bundle Vite
/type-check          # Weryfikacja TypeScript
/review-schema       # Przegląd database schema
```

### Poziom 3: Jawnie - Pytając

Pytasz Claude bezpośrednio:

```
"Frontend Developer, jak zoptymalizować ten komponent?"

"Security Auditor, czy ten endpoint ma dobry auth?"

"Wszyscy agenci, jakie są problemy z performance aplikacji?"
```

### Multi-Agent Analysis

Możesz pytać wszystkich agentów naraz:

```
"Zespół agentów, przeanalizujcie nową feature /api/reports:
- Frontend: UI jest ładny i responsive?
- Backend: API jest dobrze zaprojektowane?
- Database: Schema jest efficient?
- Security: Endpoints są bezpieczne?
- Performance: Bundle size OK?"
```

Claude Code automatycznie wywoła wszystkich 5 agentów z odpowiednim kontekstem.

---

## ⚡ Dostępne Komendy

### /generate-tests
**Cel**: Generowanie testów
**Agenci**: Frontend Developer, Backend Developer
**Użycie**:
```bash
/generate-tests client/src/components/Button.tsx
/generate-tests server/routes.ts
```

### /check-security
**Cel**: Audyt bezpieczeństwa
**Agent**: Security Auditor
**Użycie**:
```bash
/check-security server/auth.ts
/check-security server/routes.ts
```

### /optimize-bundle
**Cel**: Optymizacja Vite bundle
**Agent**: React Performance Optimizer
**Użycie**:
```bash
/optimize-bundle
```

### /type-check
**Cel**: Weryfikacja TypeScript
**Agenci**: Frontend Developer, Backend Developer
**Użycie**:
```bash
/type-check
```

### /review-schema
**Cel**: Przegląd bazy danych
**Agent**: Database Architect
**Użycie**:
```bash
/review-schema shared/schema.ts
```

---

## 🔌 MCP Integracje

### GitHub MCP
**Status**: ✅ Włączony
**Co robi**:
- Zarządzanie PRami
- Zarządzanie issues
- Zarządzanie branches
- Deployment automation

**Jak używać**:
```
"Stwórz PR dla tej feature"
"Sprawdzić status GitHub Actions"
```

### PostgreSQL MCP
**Status**: ✅ Włączony
**Co robi**:
- Bezpośredni dostęp do bazy
- Query execution
- Schema inspection
- Migration management

**Jak używać**:
```
"Database Architect, sprawdzić ilość rekordów w tabeli instructorsAuth"
"Zaproponuj index dla kolumny groupIds"
```

---

## 🎯 Praktyczne Przykłady

### Scenariusz 1: Dodajesz nowy komponent React

```
KROK 1: Tworzysz plik
$ touch client/src/components/ReportCard.tsx

KROK 2: Zaczynacie kodować
- Frontend Developer agent się włącza automatycznie
- React Performance Optimizer jest gotów

KROK 3: Pytasz Claude
"Frontend Developer, czy ten komponent jest dobrze
zoptymalizowany? Czy powinienem użyć memo?"

KROK 4: Dostajesz sugestie
- Konkretne rekomendacje React best practices
- Sugestie TailwindCSS
- Performance tips
```

### Scenariusz 2: Dodajesz nowy API endpoint

```
KROK 1: Edytujesz server/routes.ts

KROK 2: Backend Developer i Security Auditor się włączają

KROK 3: Pytasz
"Backend Developer, czy error handling jest OK?
Security Auditor, czy endpoint ma dobry auth?"

KROK 4: Multi-agent analysis
- Backend Dev sprawdza strukturę API
- Security Auditor sprawdza auth/validation
- Obie odpowiedzi w jednym kontekście
```

### Scenariusz 3: Performance audit

```
KROK 1: Zaczynasz się martwić o wydajność

KROK 2: Pytasz zespół
"/optimize-bundle"

lub

"Wszyscy agenci, jakie są bottlenecks w aplikacji?"

KROK 3: Dostajesz
- Frontend: Komponenty do lazy load
- Backend: Slow queries
- Database: Missing indexes
- Performance: Bundle size issues
```

### Scenariusz 4: Security review

```
KROK 1: Przed wdrożeniem na produkcję

KROK 2: Pytasz
"/check-security server/auth.ts"

lub

"Security Auditor, comprehensive security review
zanim puszczę to na prod"

KROK 3: Dostajesz
- JWT verification
- RBAC analysis (3 role system)
- bcrypt check
- Session security
- Injection vulnerabilities
- Credential handling
```

---

## ❓ FAQ

### P: Czy agenty modyfikują mój kod automatycznie?
O: **NIE** - Agenty dają tylko sugestie i analizy. Ty decydujesz co zmienić.

### P: Czy agenty kolidują ze sobą?
O: **NIE** - Mogą pracować razem i się wspomagać (multi-agent analysis).

### P: Czy mogę wyłączyć agenta?
O: **TAK** - Edytujesz `.claude/agents.json` i zmienisz `"enabled": false`

### P: Ile agentów mogę mieć?
O: **Nieograniczona ilość** - Teorytycznie możesz dodać więcej w `.claude/agents.json`

### P: Czy mogę dodawać nowych agentów?
O: **TAK** - Dodasz nowy wpis w `.claude/agents.json` i wszystko będzie działać.

### P: Czy mogę pytać agentów w każdej chwili?
O: **TAK** - Zawsze. Agenty są zawsze dostępne.

### P: Jak wyłączyć multi-agent analysis?
O: Zmienić `"multi_agent_analysis": false` w `.claude/agents.json`

### P: Czy agenty działają offline?
O: **NIE** - Wymagają połączenia z Claude API.

### P: Czy agenty mogą edytować pliki?
O: **TAK** - Mogą edytować kod, ale tylko za Twoją zgodą.

### P: Jak usunąć agenta?
O: Usuń wpis z `.claude/agents.json` i przeładuj Claude Code.

---

## 📚 Struktura Dokumentacji AGENTS-DOCS

```
AGENTS-DOCS/
├── README.md                          ← Jesteś tutaj
├── QUICK-START.md                     ← Szybki start (5 minut)
├── SETUP-GUIDE.md                     ← Szczegółowy setup
├── 01-FRONTEND-DEVELOPER.md           ← Frontend Developer agent
├── 02-BACKEND-DEVELOPER.md            ← Backend Developer agent
├── 03-DATABASE-ARCHITECT.md           ← Database Architect agent
├── 04-SECURITY-AUDITOR.md             ← Security Auditor agent
├── 05-REACT-PERFORMANCE-OPTIMIZER.md  ← React Performance Optimizer agent
├── COMMANDS-REFERENCE.md              ← Wszystkie komendy
├── MCP-INTEGRATIONS.md                ← Integracje (GitHub, PostgreSQL)
├── WORKFLOWS.md                       ← Praktyczne workflow'i
└── TROUBLESHOOTING.md                 ← Problem solving
```

---

## 🚀 Następne Kroki

1. **Przeczytaj**: `QUICK-START.md` - 5 minutowy overview
2. **Ustaw**: `SETUP-GUIDE.md` - Szczegółowy setup
3. **Poznaj agentów**:
   - `01-FRONTEND-DEVELOPER.md`
   - `02-BACKEND-DEVELOPER.md`
   - `03-DATABASE-ARCHITECT.md`
   - `04-SECURITY-AUDITOR.md`
   - `05-REACT-PERFORMANCE-OPTIMIZER.md`
4. **Nauczysz się komend**: `COMMANDS-REFERENCE.md`
5. **Praktykuj**: `WORKFLOWS.md`

---

## 📞 Pytania?

Zawsze możesz pytać Claude:

```
"Czy agent X może mi pomóc z Y?"
"Jak ten agent działa?"
"Kiedy powinienem używać Security Auditor?"
"Czy mogę połączyć agenta X z agentem Y?"
```

Agenty są zawsze dostępne do konsultacji!

---

**Ostatnia aktualizacja**: 25 października 2025
**Status systemu**: ✅ Wszystko działające
**Wersja dokumentacji**: 1.0.0

---

Powodzenia w pracy z agentami! 🎉
