# Attendance - System Frekwencji

Aplikacja webowa do zarządzania frekwencją studentów z integracją Google Sheets.

## Funkcjonalności

- 📊 Ładowanie listy studentów z Google Sheets
- 🔍 Filtrowanie według grup i sortowanie (polskie locale)
- ✅ Oznaczanie obecności/nieobecności dla wybranej daty
- 💾 Zapisywanie frekwencji do Google Sheets z wykrywaniem konfliktów
- 📱 Responsywny interfejs z sticky header
- 🔄 Automatyczne odświeżanie danych

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: Express.js, Node.js
- **Integracja**: Google Sheets API (googleapis)
- **Narzędzia**: ESLint, Prettier, Vite

## Struktura Google Sheets

Aplikacja wymaga arkusza Google Sheets z trzema kartami:

### Students (A:G)
