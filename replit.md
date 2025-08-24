# Overview

This is a student attendance management web application built to streamline tracking and recording student attendance through Google Sheets integration. The application allows educators to load student lists from Google Sheets, filter by groups, mark attendance for specific dates, and save the data back to Google Sheets with conflict detection to handle concurrent edits.

The system features a responsive React frontend with a clean, professional interface using TailwindCSS and shadcn/ui components, backed by an Express.js server that handles Google Sheets API integration through service account authentication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript for type safety and developer experience
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: TailwindCSS for utility-first styling with shadcn/ui component library
- **Build Tool**: Vite for fast development and optimized production builds

The frontend follows a component-based architecture with clear separation between UI components (`components/ui/`), feature components (`components/`), and pages (`pages/`). The application uses React Query for efficient data fetching, caching, and synchronization with the backend.

## Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript for type safety across the stack
- **API Design**: RESTful endpoints for groups, students, and attendance operations
- **Database Integration**: Drizzle ORM configured for PostgreSQL (though currently using Google Sheets as primary storage)
- **Authentication**: Google Service Account JWT authentication for Sheets API access

The server implements a clean API layer with proper error handling and uses googleapis library for Google Sheets integration. The architecture supports future database migration while maintaining Google Sheets as the current data source.

## Data Storage Solutions
- **Primary Storage**: Google Sheets with structured worksheets:
  - Students sheet (id, first_name, last_name, group_id, active, class, phone)
  - Sessions sheet (id, group_id, date)
  - Attendance sheet (session_id, student_id, status, updated_at)
- **Database Preparation**: Drizzle ORM with PostgreSQL support configured for future migration
- **Caching**: Client-side caching through React Query with configurable stale time

The Google Sheets integration provides immediate accessibility and familiar interface for educators while the prepared database infrastructure allows for scalable growth.

## Authentication and Authorization
- **Google Sheets Access**: Service account authentication using JWT tokens
- **Environment Variables**: Secure credential management through environment variables
- **API Security**: Server-side validation of requests with proper error handling

The system uses Google Cloud Service Account credentials to access sheets on behalf of the application, eliminating the need for user-based OAuth flows while maintaining security.

## Core Features Implementation
- **Conflict Detection**: Last-write-wins conflict resolution with user notification
- **Real-time Updates**: Automatic data refresh and invalidation through React Query
- **Responsive Design**: Mobile-first approach with sticky headers and touch-friendly interfaces
- **Polish Locale Support**: Proper sorting and formatting for Polish educational institutions
- **Data Validation**: Schema validation using Zod for type-safe data operations

# External Dependencies

## Google Services Integration
- **Google Sheets API**: Core data storage and retrieval through googleapis library
- **Service Account Authentication**: JWT-based authentication for server-to-server communication
- **Required Permissions**: Spreadsheets read/write access scope

## UI and Styling Framework
- **Radix UI**: Headless component primitives for accessible UI components
- **TailwindCSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe variant handling for component styling

## Development and Build Tools
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Fast development server and build tool with HMR
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer for vendor prefixes

## Data Management
- **TanStack Query**: Server state management and caching
- **Drizzle ORM**: Type-safe database operations (prepared for future use)
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting utilities

## Development Dependencies
- **Replit Integration**: Runtime error overlay and development banner
- **Connect-pg-simple**: PostgreSQL session store (prepared for future use)
- **Wouter**: Lightweight routing library for React applications