# 🤖 Claude Code Agents Configuration

## ✅ Zainstalowane Agenty (TIER 1)

Twoja aplikacja ma **5 specjalistów**, którzy działają **automatycznie** w tle:

### 1. **Frontend Developer** 👨‍💻
- **Gdzie działa**: `client/src/**/*.tsx`, `client/src/**/*.ts`
- **Specjalność**: React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Co robi**: Optymalizuje komponenty, suggestionuje best practices, sprawdza TypeScript
- **Kiedy się włącza**: Edytujesz plik w `client/src/`

### 2. **Backend Developer** 🔧
- **Gdzie działa**: `server/**/*.ts`
- **Specjalność**: Express.js, REST API, middleware, error handling
- **Co robi**: Analizuje API endpoints, middleware, request validation
- **Kiedy się włącza**: Edytujesz plik w `server/`

### 3. **Database Architect** 🗄️
- **Gdzie działa**: `shared/schema.ts`, `server/lib/**/*.ts`
- **Specjalność**: PostgreSQL, Drizzle ORM, schema design, migrations
- **Co robi**: Przegląda strukturę bazy, sugeruje indexes, optimizuje queries
- **Kiedy się włącza**: Pracujesz ze schematem lub bazą danych

### 4. **Security Auditor** 🔐
- **Gdzie działa**: `server/auth.ts`, `server/routes.ts`, `server/lib/sheets.ts`
- **Specjalność**: Authentication, Authorization, RBAC, credential handling
- **Co robi**: Audituje bezpieczeństwo, sprawdza JWT, bcrypt, session security
- **Kiedy się włącza**: Pracujesz z auth lub sensitive data

### 5. **React Performance Optimizer** ⚡
- **Gdzie działa**: `client/src/pages/**/*.tsx`, `client/src/components/**/*.tsx`
- **Specjalność**: Rendering optimization, code splitting, lazy loading, bundle size
- **Co robi**: Analizuje wydajność, sugeruje memoization, code splitting
- **Kiedy się włącza**: Edytujesz komponenty w `client/`

---

## 🎯 Jak Agenty Działają

### **Automatycznie (zawsze włączone)**
```
Otwierasz: client/src/pages/attendance.tsx
    ↓
Frontend Developer + React Performance Optimizer się włączają
    ↓
Claude daje sugestie specyficzne dla React/performance
```

### **Jawnie - Pytając Claude**
```
"Frontend Developer, przeanalizuj ten komponent
 i zaproponuj optymizacje React (memo, lazy loading)"

→ Frontend Developer agent się włącza z pełnym kontekstem
→ Dostajesz specjalistyczną odpowiedź
```

---

## 📝 Dostępne Komendy

Możesz używać tych komend w przyszłości:

```bash
/generate-tests      # Generuj testy dla komponentów/endpoints
/check-security      # Sprawdź bezpieczeństwo (auth, validation)
/optimize-bundle     # Analizuj i optymalizuj bundle Vite
/type-check          # Weryfikuj TypeScript types
/review-schema       # Przegląd database schema i indexes
```

---

## 🔌 MCP Integracje

### **GitHub MCP** (github-mcp)
- Zarządzanie PRami, issues, branches
- Deployment automation
- Status: ✅ Włączony

### **PostgreSQL MCP** (postgresql-mcp)
- Bezpośredni dostęp do bazy
- Query execution, migrations
- Status: ✅ Włączony

---

## 📚 Praktyczne Przykłady

### Przykład 1: Dodajesz nowy komponent
```
1. Tworzysz: client/src/components/AttendanceForm.tsx
2. Frontend Developer agent się włącza automatycznie
3. Kiedy skończysz: "Frontend Developer, zoptymalizuj ten komponent"
4. Claude Code analizuje i daje sugestie
```

### Przykład 2: Tworzysz nowy API endpoint
```
1. Edytujesz: server/routes.ts
2. Backend Developer agent się włącza
3. Pytasz: "Backend Developer, czy error handling i validation są OK?"
4. Dostaniesz specjalistyczną reviewę
```

### Przykład 3: Audyt bezpieczeństwa
```
/check-security server/auth.ts

→ Security Auditor analizuje:
  - JWT implementation
  - RBAC (3 role system)
  - bcrypt hashing
  - Session security
  - Google Sheets credentials
```

---

## 🔄 Multi-Agent Analysis

Możesz pytać zespół agentów naraz:

```
"Zespół, przeanalizujcie nową feature:
- Frontend: UI jest optimized?
- Backend: API secure?
- Database: Schema efficient?
- Security: Auth OK?"
```

Claude Code automatycznie wywoła wszystkich agentów.

---

## ✨ Co się zmieniło w `.claude/`

### Nowe pliki:
- **agents.json** - Konfiguracja 5 agentów
- **commands.json** - Dostępne komendy
- **mcps.json** - Integracje (GitHub, PostgreSQL)
- **README.md** - Ten plik (dokumentacja)

### Bez zmian:
- **settings.local.json** - Oryginalne uprawnienia (zachowane)

---

## 🚀 Następne Kroki

### Teraz (Tier 1 - Gotowe ✅)
5 agentów pracuje automatycznie

### W przyszłości (Tier 2 - Opcjonalne)
Możemy dodać:
- API Tester agent
- TypeScript Type Checker agent
- Testing Expert agent
- DevOps Engineer agent
- Code Reviewer agent

### Jak pytać o działanie agentów?
Zawsze możesz pytać:
```
"Jak frontend developer agent byłby przydatny do optymizacji
 tego komponentu?"

"Security Auditor, sprawdzić czy ten endpoint ma RBAC?"

"Wszyscy agenci, jak poprawimy performance aplikacji?"
```

---

## 📊 Status Systemu

```
✅ Frontend Developer Agent     - AKTYWNY
✅ Backend Developer Agent      - AKTYWNY
✅ Database Architect Agent     - AKTYWNY
✅ Security Auditor Agent       - AKTYWNY
✅ React Performance Optimizer  - AKTYWNY

📦 GitHub MCP                   - GOTOWY
📦 PostgreSQL MCP               - GOTOWY

⚡ Auto-activation              - WŁĄCZONE
🔄 Multi-agent analysis        - WŁĄCZONE
💡 Context-aware               - WŁĄCZONE
```

---

## 🎓 Podsumowanie

**Agenty działają automatycznie** - nie musisz nic robić. Każdy raz gdy edytujesz kod:

1. Claude Code automatycznie włącza odpowiednich agentów
2. Dostajesz specjalistyczne sugestie
3. Możesz jawnie pytać agentów używając `/commands` lub prompts

**Zawsze możesz pytać Claude o działanie agentów** - bez ograniczeń!
