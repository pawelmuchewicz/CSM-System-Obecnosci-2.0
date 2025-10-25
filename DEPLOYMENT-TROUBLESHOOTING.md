# Deployment Troubleshooting Guide

## Problem: Bad Gateway (502 Error) w Coolify

### Przyczyny i rozwiązania

#### 1. Brak zmiennych środowiskowych
**Symptom:** Aplikacja crashuje podczas startu, zanim wywoła `server.listen()`

**Rozwiązanie:**
Upewnij się, że wszystkie wymagane zmienne środowiskowe są ustawione w Coolify:

```env
DATABASE_URL=postgresql://neondb_owner:***@***.neon.tech/neondb?sslmode=require&channel_binding=require
SESSION_SECRET=your-secret-key-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=dance-attendance-sa@danceattendance.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=(multiline - edytuj w "Normal view")
GOOGLE_SHEETS_SPREADSHEET_ID=1qtM0b8yBwdYvv3fH9gmblmiKo0grqGT1ylNxFgDprUvE
NODE_ENV=production
PORT=5000
```

**WAŻNE:** `GOOGLE_PRIVATE_KEY` musi być w formacie:
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgk...
...
-----END PRIVATE KEY-----
```

W Coolify używaj `\n` dla nowych linii lub edytuj w trybie "Normal view" (nie "Base64").

#### 2. Timeout połączenia z bazą danych
**Symptom:** Aplikacja czeka na połączenie z bazą > 30s i zostaje zabita przez Coolify

**Rozwiązanie:**
- Sprawdź, czy Neon PostgreSQL jest dostępny
- Sprawdź, czy `DATABASE_URL` jest poprawny
- Zwiększ timeout w Coolify (Build & Deploy > Deploy Timeout)

**Poprawka w kodzie:** Dodano retry mechanism w `server/db.ts`

#### 3. Build directory nie istnieje
**Symptom:** `serveStatic()` rzuca błąd "Could not find the build directory"

**Rozwiązanie:**
- Upewnij się, że `npm run build` zostało wykonane w fazie build
- Sprawdź logi buildu w Coolify

**Poprawka w kodzie:** `server/vite.ts` nie rzuca już błędu, tylko loguje ostrzeżenie

#### 4. Port conflict
**Symptom:** Aplikacja crashuje z błędem "EADDRINUSE"

**Rozwiązanie:**
- Upewnij się, że `PORT=5000` w zmiennych środowiskowych
- Sprawdź, czy inna aplikacja nie używa portu 5000

#### 5. Google Sheets credentials invalid
**Symptom:** Błąd "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL" lub "Invalid private key format"

**Rozwiązanie:**
- Sprawdź format `GOOGLE_PRIVATE_KEY` (musi zawierać `-----BEGIN PRIVATE KEY-----`)
- Upewnij się, że nie ma dodatkowych spacji ani znaków
- W Coolify używaj trybu "Normal view" do edycji multiline env vars

**Poprawka w kodzie:** Walidacja credentials jest teraz lazy (tylko gdy używane), nie przy starcie

## Jak debugować problemy

### 1. Sprawdź logi w Coolify
1. Przejdź do aplikacji w Coolify
2. Kliknij "Logs" (ikona dokumentu)
3. Poszukaj błędów PRZED komunikatem "SERVER STARTED SUCCESSFULLY"

### 2. Użyj health check endpoint
Po wdrożeniu odwiedź:
```
http://your-app.coolify.domain/health
```

Odpowiedź powinna być:
```json
{
  "status": "ok",
  "timestamp": "2025-01-25T10:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "database": "configured",
  "googleSheets": "configured"
}
```

### 3. Testuj API bezpośrednio
```bash
curl http://your-app.coolify.domain/
```

Jeśli to działa, ale strona frontendowa nie - problem jest z static files.

### 4. SSH do kontenera (jeśli dostępne)
```bash
# W Coolify: Application > Terminal
ls -la dist/
ls -la dist/public/
cat logs/combined-*.log
```

## Poprawki wprowadzone w kodzie

### 1. `/server/lib/sheets.ts`
- Zmieniono `throw Error` przy imporcie na lazy validation w funkcji `validateGoogleCredentials()`
- Credentials są teraz sprawdzane tylko gdy używane (w `getSheets()`)

### 2. `/server/index.ts`
- Dodano global error handlers (`uncaughtException`, `unhandledRejection`)
- Dodano szczegółowe logowanie podczas startu
- Dodano try-catch wokół całej inicjalizacji
- Dodano obsługę błędów serwera (`server.on('error')`)
- Poprawiono obsługę static files w production

### 3. `/server/routes.ts`
- Dodano health check endpoint: `GET /health`
- Dodano root endpoint: `GET /`
- Dodano test połączenia z bazą przy starcie (nie blokuje startu jeśli fail)

### 4. `/server/vite.ts`
- `serveStatic()` nie rzuca już błędu jeśli brak dist/
- Sprawdza alternatywne ścieżki
- Loguje ostrzeżenia zamiast crashować

### 5. `/server/db.ts`
- Dodano retry mechanism dla połączenia z bazą
- Zwiększono timeout do 10s
- Dodano test połączenia przed zwróceniem instance

### 6. `/server/auth.ts`
- Dodano ostrzeżenie jeśli `SESSION_SECRET` nie jest ustawiony
- Dodano logowanie po skonfigurowaniu session middleware

## Checklist przed wdrożeniem

- [ ] `npm run build` działa lokalnie bez błędów
- [ ] Wszystkie zmienne środowiskowe są ustawione w Coolify
- [ ] `GOOGLE_PRIVATE_KEY` jest w poprawnym formacie (multiline)
- [ ] `DATABASE_URL` zawiera `sslmode=require`
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] Build command w Coolify: `npm run build`
- [ ] Start command w Coolify: `npm run start`
- [ ] Port w Coolify: `5000`

## Znane problemy

### Problem: "logs directory not writable"
**Rozwiązanie:** Winston próbuje utworzyć `logs/` directory. Jeśli filesystem jest read-only, logi nie będą zapisywane na dysk, ale aplikacja powinna działać (logi w console są dostępne).

### Problem: Sessions są tracone po restart
**Rozwiązanie:** Używamy in-memory session store. Sesje są tracone po restarcie aplikacji. To jest akceptowalne dla tego use case. Użytkownicy będą musieli się zalogować ponownie.

## Kontakt z supportem

Jeśli problem nadal występuje:
1. Zbierz logi z Coolify (ostatnie 100 linii)
2. Sprawdź response z `/health` endpoint
3. Sprawdź czy `curl http://localhost:5000/health` działa w kontenerze
4. Skontaktuj się z administratorem z tymi informacjami
