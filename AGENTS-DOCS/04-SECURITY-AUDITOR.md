# 🔐 SECURITY AUDITOR AGENT

Ekspert w authentication, authorization, RBAC, credential handling i OWASP principles. Audytuje bezpieczeństwo aplikacji.

## 📌 Overview

| Aspekt | Szczegóły |
|--------|-----------|
| **Nazwa** | Security Auditor |
| **Specjalność** | Auth/AuthZ, RBAC, bcrypt, JWT, session security, OWASP |
| **Włącza się** | `server/auth.ts`, `server/routes.ts`, `server/lib/sheets.ts` |
| **Status** | ✅ Aktywny |
| **ID** | `security-auditor` |

## 🎯 Czym się zajmuje?

### 1. **Authentication Audit**
- Sprawdza user identity verification
- Analizuje password hashing (bcrypt)
- Sprawdza session management
- Weryfikuje JWT implementation

### 2. **Authorization Audit**
- Przegląda role-based access control (RBAC)
- Sprawdza permission checks
- Analizuje middleware auth
- Sugeruje lepsze enforcment

### 3. **Credential Handling**
- Sprawdza jak przechowywane są credentials
- Analizuje environment variables
- Weryfikuje API keys storage
- Sugeruje secure practices

### 4. **Injection Prevention**
- Sprawdza SQL injection risk
- Analizuje XSS risk
- Weryfikuje CSRF protection
- Sugeruje sanitization

### 5. **Security Best Practices**
- OWASP Top 10
- Secure headers
- HTTPS enforcement
- Rate limiting

## 🚀 Kiedy go używać?

### Automatycznie włącza się:
- Edytujesz `server/auth.ts`
- Edytujesz `server/routes.ts` (auth endpoints)
- Edytujesz `server/lib/sheets.ts` (credential handling)

### Jawnie pytaj:
```
"Security Auditor, czy auth jest bezpieczny?"
"/check-security server/auth.ts"
"Comprehensive security review"
"Vulnerability assessment"
```

## 🔒 Twoja Aktualna Architektura Security

Twoja aplikacja ma:

```
Authentication:
- Session-based (express-session)
- Passwords hashed z bcrypt
- PostgreSQL store (connect-pg-simple)

Authorization:
- 3 role system: owner, reception, instructor
- RBAC middleware (requireAuth, requireGroupAccess)
- Permission checks w endpoints

Credentials:
- Google Service Account JWT
- Environment variables (.env)
- Session secret

Sensitive Data:
- Student personal info (Google Sheets)
- Attendance records
- User passwords (hashed)
```

## 💡 Praktyczne Przykłady

### Przykład 1: Auth Flow Review

Twoja implementacja:

```typescript
// server/auth.ts
async function login(email: string, password: string) {
  const user = db.instructors.findOne({ email });

  if (!user) return { error: 'User not found' };
  if (user.password !== password) return { error: 'Invalid password' }; // ❌ PROBLEM!

  req.session.userId = user.id;
  return { success: true };
}
```

**Pytasz**:
```
"Security Auditor, comprehensive review tego login flow.
Jakie są security issues?"
```

**Agent odpowiada**:
```
KRYTYCZNE PROBLEMY:

1. ❌ PASSWORD W PLAINTEXT
   - Password powinny być HASHED z bcrypt
   - Nigdy nie porównuj plaintext
   - OBOWIĄZKOWE FIX!

2. ❌ TIMING ATTACK RISK
   - "User not found" vs "Invalid password"
   - Attacker wie czy email istnieje
   - Zawsze zwróć generic error

3. ❌ BRAK RATE LIMITING
   - Brute force attack possible
   - Trzeba rate limit na login endpoint

4. ❌ SESSION FIXATION RISK
   - Brak regenerate session po login
   - Attacker może assume session

5. ❌ BRAK SECURE HEADERS
   - Brak httpOnly flag na session cookie

Poprawnie:

import bcrypt from 'bcrypt';

async function login(
  req: Request<any, any, { email: string; password: string }>,
  res: Response
) {
  try {
    const user = await db.instructorsAuth.findFirst({
      where: { email: req.body.email }
    });

    // Zawsze hash, nawet jeśli user nie istnieje (timing attack mitigation)
    const isPasswordValid = user
      ? await bcrypt.compare(req.body.password, user.passwordHash)
      : false;

    if (!isPasswordValid) {
      // Generic error - nie zdradzamy czy email istnieje
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // ✅ Regenerate session (prevent fixation)
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session error' });
      }

      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.groupIds = user.groupIds;

      // ✅ Save session
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: 'Session save error' });
        }

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        });
      });
    });
  } catch (error) {
    logger.error('Login error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ✅ Konfiguracja session (w index.ts)
const sessionConfig = {
  store: new PostgresStore({ conString: process.env.DATABASE_URL }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,        // ✅ Prevent JavaScript access
    secure: true,          // ✅ HTTPS only
    sameSite: 'strict',    // ✅ CSRF protection
    maxAge: 1000 * 60 * 60 // 1 hour
  }
};

app.use(session(sessionConfig));

// ✅ Rate limiting
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts
  message: 'Too many login attempts, try again later'
});

app.post('/api/auth/login', loginLimiter, login);
```

### Przykład 2: RBAC Audit

Twoja implementacja:

```typescript
// server/routes.ts
app.delete('/api/students/:id', requireAuth, async (req, res) => {
  // ❌ Czy owner tylko?
  const student = await getStudent(req.params.id);
  await db.deleteStudent(student.id);
  res.json({ success: true });
});

app.post('/api/groups', requireAuth, async (req, res) => {
  // ❌ Czy any logged in user może createować?
  const group = await createGroup(req.body);
  res.json(group);
});
```

**Pytasz**:
```
"Security Auditor, role-based access control audit.
Czy endpointy mają proper authorization?"
```

**Agent odpowiada**:
```
PROBLEMY ZNALEZIONE:

1. ❌ DELETE /api/students/:id
   - Brak check czy user ma permission
   - Any logged in user może delete!
   - Kto ma delete permission? (owner tylko?)

2. ❌ POST /api/groups
   - Kto może createować grupy?
   - Powinno być ograniczone na role

3. ⚠️ RBAC nie enforced konsekwentnie
   - Brak centralized permission check

Poprawnie:

// shared/schema.ts
export enum Role {
  OWNER = 'owner',
  RECEPTION = 'reception',
  INSTRUCTOR = 'instructor'
}

export enum Permission {
  MANAGE_STUDENTS = 'manage_students',
  VIEW_ATTENDANCE = 'view_attendance',
  EDIT_ATTENDANCE = 'edit_attendance',
  MANAGE_GROUPS = 'manage_groups'
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    Permission.MANAGE_STUDENTS,
    Permission.MANAGE_GROUPS,
    Permission.VIEW_ATTENDANCE,
    Permission.EDIT_ATTENDANCE
  ],
  [Role.RECEPTION]: [
    Permission.VIEW_ATTENDANCE,
    Permission.EDIT_ATTENDANCE,
    Permission.MANAGE_STUDENTS
  ],
  [Role.INSTRUCTOR]: [
    Permission.VIEW_ATTENDANCE,
    Permission.EDIT_ATTENDANCE
  ]
};

// server/auth.ts
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.session.role as Role;
    const hasPermission = ROLE_PERMISSIONS[userRole]?.includes(permission);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission
      });
    }

    next();
  };
};

// server/routes.ts
app.delete(
  '/api/students/:id',
  requireAuth,
  requirePermission(Permission.MANAGE_STUDENTS),
  async (req, res) => {
    // ✅ Now authorized!
    const student = await getStudent(req.params.id);
    // ... verify group access
    await db.deleteStudent(student.id);
    res.json({ success: true });
  }
);

app.post(
  '/api/groups',
  requireAuth,
  requirePermission(Permission.MANAGE_GROUPS),
  async (req, res) => {
    // ✅ Now authorized - owner only
    const group = await createGroup(req.body);
    res.json(group);
  }
);
```

### Przykład 3: Google Sheets Credentials

Twoja implementacja:

```typescript
// server/lib/sheets.ts
const jwtClient = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// ❌ Credentiels w environment variables OK
// ❌ Ale co jeśli .env file wycieknie?
```

**Pytasz**:
```
"Security Auditor, jak secure jest credential handling?
Chcę aby Google service account był safe."
```

**Agent odpowiada**:
```
CURRENT STATE:
✅ Service account key w .env (good)
✅ Key not committed to git (.gitignore)
✅ Limited scopes (csak spreadsheets)

RECOMMENDATIONS:

1. ✅ Environment variables są OK dla Neon/Railway
   Ale dodaj extra protections:

// server/lib/sheets.ts
const validateCredentials = () => {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL');
  }
  if (!process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing GOOGLE_PRIVATE_KEY');
  }
  if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  }
};

// Validate on startup
validateCredentials();

2. ✅ Encrypt GOOGLE_PRIVATE_KEY w production
   Use Coolify secrets management

3. ✅ Rotate service account key regularly
   - Create new key
   - Update environment variable
   - Delete old key

4. ✅ Audit Google Sheets access
   - Who has access to spreadsheets?
   - Are permissions minimal?
   - Check Google Cloud Audit Logs

5. ✅ Limit service account permissions
   - Use only necessary scopes
   - Limit to specific spreadsheets
   - Remove unnecessary roles in Google Cloud

6. ⚠️ MONITORING:
   Add alerts for:
   - Unauthorized API calls
   - Suspicious access patterns
   - Failed authentications

7. ⚠️ BACKUP PLAN:
   If credentials are leaked:
   - Immediately revoke key in Google Cloud
   - Generate new key
   - Update all environment variables
   - Monitor for unauthorized access
```

### Przykład 4: SQL Injection Prevention

Twoja aplikacja używa Drizzle ORM, które jest safe. Ale sprawdzenie:

```typescript
// ✅ SAFE - Drizzle parametrizes queries
const student = await db.select()
  .from(students)
  .where(eq(students.id, req.params.id))
  .first();

// ❌ UNSAFE - Raw SQL (jeśli gdzieś używane)
const result = await db.execute(
  `SELECT * FROM students WHERE id = '${req.params.id}'`
);
```

**Pytasz**:
```
"Security Auditor, czy aplikacja jest vulnerable na SQL injection?"
```

**Agent odpowiada**:
```
GOOD NEWS:
✅ Drizzle ORM parametrizes all queries
✅ Type-safe queries prevent injection
✅ No raw SQL found in codebase

RECOMMENDATIONS:
1. Nigdy nie używaj raw SQL z user input
2. Zawsze używaj Drizzle query builder
3. Validate all inputs (Zod)
4. Test inputs na edge cases

Example (never do this):
❌ BAD:
\`SELECT * FROM students WHERE name = '${name}'\`

✅ GOOD:
db.select()
  .from(students)
  .where(eq(students.name, name))
  .all()
```

## 📋 Checklista: Kiedy Pytać?

| Sytuacja | Pytanie |
|----------|---------|
| Login flow | "Czy auth jest bezpieczny?" |
| RBAC issues | "Authorization audit?" |
| Credentials | "Jak safe są credentials?" |
| Production | "/check-security before deploy" |
| Vulnerabilities | "Security vulnerabilities?" |
| Rate limiting | "Czy API jest protected?" |
| HTTPS | "Są secure headers?" |

## 🔧 Integracja z Innymi Agentami

### Security Auditor + Backend Developer
Gdy pracujesz nad auth endpoints.

```
"Backend Developer, endpoint design OK?
 Security Auditor, czy jest secure?"
```

### Security Auditor + Database Architect
Gdy pracujesz z sensitive data.

```
"Database Architect, schema encryption?
 Security Auditor, access control OK?"
```

## 📊 Capability Matrix

| Umiejętność | Level | Przykład |
|------------|-------|---------|
| Authentication | 🟢 Expert | bcrypt, JWT, sessions, MFA |
| Authorization | 🟢 Expert | RBAC, permissions, middleware |
| Credential mgmt | 🟢 Expert | Keys, certificates, rotation |
| Injection prevention | 🟢 Expert | SQL, XSS, CSRF, LDAP |
| OWASP Top 10 | 🟢 Expert | All vulnerabilities |
| Secure headers | 🟢 Expert | CSP, HSTS, X-Frame-Options |
| Encryption | 🟢 Expert | TLS, at-rest, in-transit |
| Auditing | 🟡 Good | Logging, monitoring, alerts |

## 🚫 Kiedy NIE Pytać?

- Frontend logic (pytaj Frontend Developer)
- API design (pytaj Backend Developer)
- Database structure (pytaj Database Architect)
- Infrastructure security (pytaj DevOps)

## 💬 Najlepsze Prompts

### Comprehensive Audit
```
"Security Auditor, comprehensive security review:
- Authentication mechanism
- Authorization (RBAC)
- Credential handling
- Injection prevention
- Secure headers
- Rate limiting"
```

### Specific Check
```
"Security Auditor, audit tego endpoint:
- POST /api/auth/login
- Jakie security best practices breaking?"
```

### Vulnerability Assessment
```
"/check-security server/auth.ts
Szukaj: SQL injection, XSS, CSRF, auth bypass"
```

### RBAC Review
```
"Security Auditor, RBAC audit:
- Czy role system (owner, reception, instructor) jest poprawny?
- Czy permissions są enforced?"
```

## 🎓 Best Practices (Co wie ten agent)

1. ✅ Passwords zawsze hashed (bcrypt)
2. ✅ Sessions secure (httpOnly, secure, sameSite)
3. ✅ Rate limiting na auth endpoints
4. ✅ RBAC enforced na każdym endpoint
5. ✅ SQL injection prevention (ORM)
6. ✅ XSS prevention (escape, CSP)
7. ✅ CSRF protection (tokens, sameSite)
8. ✅ Secure headers (HSTS, CSP, X-Frame)
9. ✅ Credentials nie w kod/git
10. ✅ Audit logging wszystko

## 📈 Security Checklist

- [ ] Passwords hashed z bcrypt
- [ ] Sessions httpOnly
- [ ] HTTPS enforced
- [ ] RBAC implemented
- [ ] Rate limiting
- [ ] Input validation (Zod)
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Security headers
- [ ] Credentials in .env
- [ ] .env not in git
- [ ] Secrets rotated regularly
- [ ] Audit logs enabled
- [ ] Error messages generic

## 🔗 Powiązane

- **Backend Developer**: Dla auth endpoints
- **Database Architect**: Dla data security
- **QUICK-START.md**: Szybki overview
- **README.md**: Pełna dokumentacja

---

**Wersja**: 1.0.0
**Data**: 25 października 2025
**Status**: ✅ Aktywny i gotowy do pracy
