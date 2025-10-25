# Changelog

Wszystkie istotne zmiany w projekcie CSM System Obecności będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/),
projekt używa [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

## [1.1.0] - 2025-10-13

### Dodane
- **System powiadomień w aplikacji**
  - Tabela `notifications` w bazie danych PostgreSQL
  - API endpoints do zarządzania powiadomieniami (`/api/notifications`)
  - Komponent NotificationBell z licznikiem nieprzeczytanych powiadomień w navbar
  - Strona historii powiadomień (`/notifications`) z filtrowaniem i zarządzaniem
  - Automatyczne powiadomienia przy:
    - Dodawaniu ucznia przez instruktora → powiadomienie dla recepcji i właściciela
    - Zatwierdzaniu ucznia → powiadomienie dla instruktora
    - Wypisywaniu ucznia → powiadomienie dla instruktora
    - Dodawaniu notatki o obecności → powiadomienie dla recepcji i właściciela
  - Ikona dzwonka widoczna w widoku desktop i mobile (obok menu hamburger)
  - Auto-odświeżanie licznika co 30 sekund

- **Funkcjonalność resetowania hasła**
  - Strona "Zapomniałem hasła" (`/forgot-password`)
  - Strona resetowania hasła z tokenem (`/reset-password`)
  - Tabela `password_reset_tokens` w bazie danych
  - Email z linkiem do resetowania hasła (nodemailer)
  - API endpoints: `/api/auth/forgot-password`, `/api/auth/reset-password`

- **Ulepszenia UI**
  - Logo Creative Dance na stronie logowania
  - Link "Zapomniałem hasła" na stronie logowania

### Zmienione
- Navbar: Ikona dzwonka z powiadomieniami zawsze widoczna w widoku mobilnym
- Package.json: Dodane zależności `nodemailer` i `@types/nodemailer`

### Techniczne
- `server/lib/notifications.ts` - Funkcje helper do tworzenia powiadomień
- `server/lib/email.ts` - Funkcje do wysyłania emaili
- `server/routes.ts` - Dodane endpointy dla powiadomień i resetowania hasła
- `shared/schema.ts` - Dodane tabele notifications i passwordResetTokens
- `client/src/components/notification-bell.tsx` - Nowy komponent
- `client/src/pages/notifications.tsx` - Nowa strona
- `client/src/pages/forgot-password.tsx` - Nowa strona
- `client/src/pages/reset-password.tsx` - Nowa strona

## [1.0.0] - 2025-02-XX

### Dodane
- Podstawowy system zarządzania obecnością uczniów
- Integracja z Google Sheets jako główne źródło danych
- System autentykacji z rolami: właściciel, recepcja, instruktor
- Panel administracyjny dla właściciela i recepcji
- Zarządzanie uczniami (dodawanie, zatwierdzanie, wypisywanie)
- System raportów obecności z eksportem do PDF
- Cache'owanie danych z Google Sheets
- Widok mobilny i desktop
- Baza danych PostgreSQL (Neon) dla użytkowników i konfiguracji
- Deployment na Coolify z automatycznym CI/CD z GitHub

### Funkcjonalności
- Oznaczanie obecności uczniów
- Dodawanie notatek do obecności
- Zarządzanie grupami tanecznymi
- Zarządzanie użytkownikami (instruktorzy, recepcja)
- Przypisywanie instruktorów do grup
- System uprawnień oparty na rolach
- Health check endpoint dla monitoringu

---

## Instrukcje dla przyszłych aktualizacji

### Jak aktualizować CHANGELOG:

1. **Przy każdej większej zmianie** dodaj wpis do sekcji `[Unreleased]`
2. **Przy release** przenieś zmiany z `[Unreleased]` do nowej wersji z datą
3. **Używaj kategorii**:
   - `Dodane` - nowe funkcjonalności
   - `Zmienione` - zmiany w istniejących funkcjonalnościach
   - `Przestarzałe` - funkcjonalności do usunięcia w przyszłości
   - `Usunięte` - usunięte funkcjonalności
   - `Naprawione` - poprawki błędów
   - `Bezpieczeństwo` - zmiany związane z bezpieczeństwem

### Przykład wpisu:
```markdown
## [1.2.0] - 2025-03-15

### Dodane
- Eksport raportów do formatu Excel
- Powiadomienia push dla instruktorów

### Naprawione
- Poprawka błędu przy zapisywaniu obecności dla dużych grup
```
