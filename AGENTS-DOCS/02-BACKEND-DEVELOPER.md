# 🔧 BACKEND DEVELOPER AGENT

Ekspert w Express.js, REST API design, TypeScript, middleware i error handling. Optymalizuje backendu i API endpoints.

## 📌 Overview

| Aspekt | Szczegóły |
|--------|-----------|
| **Nazwa** | Backend Developer |
| **Specjalność** | Express.js, REST API, TypeScript, middleware, error handling |
| **Włącza się** | `server/**/*.ts`, `shared/schema.ts` |
| **Status** | ✅ Aktywny |
| **ID** | `backend-developer` |

## 🎯 Czym się zajmuje?

### 1. **API Endpoint Design**
- Przegląda REST structure
- Sprawdza HTTP methods (GET, POST, PUT, DELETE)
- Analizuje request/response format
- Sugeruje lepszy design

### 2. **Middleware Architecture**
- Sprawdza middleware order
- Analizuje auth middleware
- Weryfikuje error handling
- Sugeruje optimization

### 3. **Request Validation**
- Sprawdza Zod schemas
- Analizuje input validation
- Sugeruje type safety
- Weryfikuje sanitization

### 4. **Error Handling**
- Analizuje error responses
- Sprawdza error codes
- Sugeruje consistent error format
- Wspiera error recovery

### 5. **TypeScript w Express**
- Type safety dla request/response
- Proper typing dla handlers
- Middleware typing
- Route typing

## 🚀 Kiedy go używać?

### Automatycznie włącza się:
- Edytujesz `server/routes.ts`
- Edytujesz `server/auth.ts`
- Edytujesz pliki w `server/lib/`
- Edytujesz `shared/schema.ts`

### Jawnie pytaj:
```
"Backend Developer, design nowy endpoint"
"Czy ten API jest well-designed?"
"Jak poprawić error handling?"
"Czy middleware jest w dobrej kolejności?"
```

## 💡 Praktyczne Przykłady

### Przykład 1: Endpoint Review

Twoja aplikacja ma endpoint:

```typescript
// server/routes.ts
app.post('/api/students', (req, res) => {
  const { name, email } = req.body;

  if (!name) res.status(400).send('Name required');
  if (!email) res.status(400).send('Email required');

  // dodaj do bazy
  db.students.push({ name, email });

  res.json({ success: true });
});
```

**Pytasz**:
```
"Backend Developer, review tego endpoint.
Jakie problemy widzisz?"
```

**Agent odpowiada**:
```
Problemy znalezione:

1. ❌ Brak auth - kto może dodawać studentów?
2. ❌ Brak Zod validation - type unsafe
3. ❌ Brak error handling - co jeśli DB fails?
4. ❌ Inconsistent error format - czasem status, czasem text
5. ❌ Brak logging - trudno debugować
6. ❌ Brak response typing

Poprawnie powinno być:

const createStudentSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  class: z.string()
});

app.post('/api/students',
  requireAuth, // ← Auth middleware
  requireGroupAccess, // ← Authorization
  (req: Request, res: Response<Student | ApiError>) => {
    try {
      const data = createStudentSchema.parse(req.body);
      const student = await db.students.insert(data);

      res.status(201).json(student);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      } else {
        logger.error('Failed to create student', error);
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    }
  }
);
```

### Przykład 2: Middleware Order

Twoja konfiguracja middleware:

```typescript
// server/index.ts
app.use(express.json());
app.use(requireAuth);           // ❌ Złe miejsce!
app.use('/api/public', publicRoutes); // Przed auth!
app.use(errorHandler);          // ❌ Powinno być na końcu!
```

**Pytasz**:
```
"Backend Developer, middleware order jest poprawny?"
```

**Agent odpowiada**:
```
Problemy:

1. ❌ errorHandler nie na końcu - nie złapie ALL errors
2. ❌ requireAuth przed publicRoutes - publiczne endpointy nie zadziałają
3. ❌ Brak CORS middleware
4. ❌ Brak logging middleware
5. ❌ Brak rate limiting

Poprawnie:

// 1. Parse JSON
app.use(express.json());

// 2. Logging
app.use(logger.middleware);

// 3. Public routes (bez auth)
app.use('/api/public', publicRoutes);

// 4. Auth middleware (dla protected routes)
app.use(requireAuth);

// 5. Protected routes
app.use('/api', authRoutes);

// 6. Error handling (ZAWSZE na końcu!)
app.use(errorHandler);
```

### Przykład 3: Validation z Zod

Twoja implementacja:

```typescript
app.post('/api/attendance', (req, res) => {
  const { sessionId, studentId, status } = req.body;

  // Ręczna walidacja - nie skaluje się
  if (!sessionId) return res.status(400).send('No sessionId');
  if (!studentId) return res.status(400).send('No studentId');
  if (!status) return res.status(400).send('No status');

  if (status !== 'present' && status !== 'absent' && status !== 'excused') {
    return res.status(400).send('Invalid status');
  }

  // ...
});
```

**Pytasz**:
```
"Backend Developer, jak to powinno być typed z Zod?"
```

**Agent odpowiada**:
```
Użyj Zod schemas (już masz w shared/schema.ts):

import { z } from 'zod';

const setAttendanceSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.enum(['present', 'absent', 'excused']),
  notes: z.string().optional()
});

type SetAttendanceRequest = z.infer<typeof setAttendanceSchema>;

app.post<unknown, unknown, SetAttendanceRequest>(
  '/api/attendance',
  requireAuth,
  (req: Request<unknown, unknown, SetAttendanceRequest>, res) => {
    try {
      const data = setAttendanceSchema.parse(req.body);

      // data jest teraz fully typed!
      const result = await setAttendance(
        data.sessionId,
        data.studentId,
        data.status
      );

      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      }
    }
  }
);
```

### Przykład 4: Error Handling Strategy

Twoja implementacja:

```typescript
app.get('/api/students/:id', async (req, res) => {
  const student = await getStudent(req.params.id);
  res.json(student); // ❌ Co jeśli studenta nie ma?
});
```

**Pytasz**:
```
"Backend Developer, jak poprawnie handleować errors?"
```

**Agent odpowiada**:
```
Consistent error handling:

interface ApiError {
  error: string;
  details?: any;
  code?: string;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  status: 'success' | 'error';
}

app.get<{ id: string }, ApiResponse<Student>>(
  '/api/students/:id',
  requireAuth,
  async (req, res) => {
    try {
      const student = await getStudent(req.params.id);

      if (!student) {
        return res.status(404).json({
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student nie znaleziony'
          },
          status: 'error'
        });
      }

      res.json({
        data: student,
        status: 'success'
      });
    } catch (error) {
      logger.error('Failed to fetch student', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Nie można pobrać studenta'
        },
        status: 'error'
      });
    }
  }
);
```

## 📋 Checklista: Kiedy Pytać?

| Sytuacja | Pytanie |
|----------|---------|
| Nowy endpoint | "Design tego endpointu?" |
| Endpoint powolny | "Jak zoptymalizować?" |
| Error chaos | "Jak standardyzować errors?" |
| Auth issues | "Czy auth jest poprawny?" |
| Middleware issues | "Order middleware OK?" |
| Type unsafe | "Jak typed powinno być?" |
| Validation | "Jak validować dane?" |

## 🔧 Integracja z Innymi Agentami

### Backend Developer + Database Architect
Gdy pracujesz z bazą danych.

```
"Backend Developer, endpoint design OK?
 Database Architect, czy query jest eficjentny?"
```

### Backend Developer + Security Auditor
Gdy pracujesz z auth/sensitive data.

```
"Backend Developer, API struktura OK?
 Security Auditor, czy bezpieczeństwo jest OK?"
```

## 📊 Capability Matrix

| Umiejętność | Level | Przykład |
|------------|-------|---------|
| Express.js | 🟢 Expert | Routes, middleware, error handling |
| REST API | 🟢 Expert | Design, versioning, standards |
| TypeScript | 🟢 Expert | Types, generics, inference |
| Validation | 🟢 Expert | Zod, custom validators |
| Error handling | 🟢 Expert | Consistent, recovery, logging |
| Request/Response | 🟢 Expert | Types, formatting, consistency |
| Middleware | 🟢 Expert | Auth, logging, compression |
| Testing | 🟡 Good | Integration tests |
| Performance | 🟡 Good | Caching, optimization |

## 🚫 Kiedy NIE Pytać?

- Frontend logic (pytaj Frontend Developer)
- Database schema (pytaj Database Architect)
- Performance DB (pytaj Database Architect)
- Security deep-dive (pytaj Security Auditor)
- Infra/Deployment (pytaj DevOps Engineer)

## 💬 Najlepsze Prompts

### Endpoint Design
```
"Backend Developer, design endpoint dla:
- Endpoint: POST /api/groups
- Body: { name, description }
- Auth: owner only
- Response: Group object"
```

### Code Review
```
"Backend Developer, review server/routes.ts:
- Struktura endpoints
- Error handling
- Validation
- Type safety"
```

### Optimization
```
"Backend Developer, optimize ten endpoint:
- Zbyt wolny?
- Zbyt dużo logic?
- Jak split na mniejsze pieces?"
```

### Type Safety
```
"Backend Developer, add TypeScript types:
- Request types z Zod
- Response types
- Error types
- Middleware types"
```

## 🎓 Best Practices (Co wie ten agent)

1. ✅ Każdy endpoint powinien być clearly defined
2. ✅ Validation powinno być w jednym miejscu (Zod)
3. ✅ Error handling powinien być consistent
4. ✅ Auth/Authz powinno być w middleware
5. ✅ Logging powinno być na każdym level
6. ✅ Types powinny być explicit
7. ✅ Endpoints powinne być RESTful
8. ✅ Status codes powinny być poprawne
9. ✅ Response format powinien być consistent
10. ✅ Rate limiting dla public endpoints

## 📈 Performance Tips (co będzie sugerować)

- Caching dla frequently accessed data
- Database query optimization
- Pagination dla large datasets
- Compression middleware
- Rate limiting
- Request timeout
- Connection pooling
- Async/await patterns

## 🔗 Powiązane

- **Security Auditor**: Dla bezpieczeństwa
- **Database Architect**: Dla optymizacji DB
- **QUICK-START.md**: Szybki overview
- **README.md**: Pełna dokumentacja

---

**Wersja**: 1.0.0
**Data**: 25 października 2025
**Status**: ✅ Aktywny i gotowy do pracy
