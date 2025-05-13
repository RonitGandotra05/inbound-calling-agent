# Vapi Receptionist SaaS

A Next.js 14 wrapper application for Vapi AI that allows users to create their own AI receptionist to manage appointments and handle calls.

## Features

- User authentication with email/password
- Automatic Vapi assistant creation on signup
- System prompt customization
- Call logs with transcripts and summaries
- Availability slot management
- Patient booking system

## Tech Stack

- Next.js 14 (App Router + Server Components)
- TypeScript
- Prisma ORM with PostgreSQL
- NextAuth.js for authentication
- Tailwind CSS + shadcn/ui components
- Axios for API requests
- Vapi for AI assistant and phone number management

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vapi-wrapper.git
   cd vapi-wrapper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Update the values in `.env.local` with your own:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `VAPI_PRIVATE_KEY`: Your Vapi API key (for server use)
   - `VAPI_PUBLIC_KEY`: Your Vapi public key (for browser SDK)
   - `NEXTAUTH_SECRET`: A random string for JWT encryption
   - `NEXTAUTH_URL`: Your app's URL (in development, use http://localhost:3000)

4. Generate Prisma client:
   ```bash
   npm run generate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
vapi-wrapper/
├─ app/
│  ├─ api/                 # API routes
│  ├─ dashboard/           # Dashboard pages
│  ├─ globals.css          # Global styles
│  ├─ layout.tsx           # Root layout
│  ├─ page.tsx             # Home page with auth
├─ lib/
│  ├─ prisma.ts            # Prisma client
│  ├─ vapi.ts              # Vapi API client
├─ prisma/
│  ├─ schema.prisma        # Database schema
├─ scripts/
│  ├─ seed_slots.ts        # Slot generation script
├─ auth.ts                 # NextAuth configuration
├─ middleware.ts           # Next.js middleware
```

## API Routes

- `POST /api/onboard` - Register a new user
- `PUT /api/assistant` - Update assistant system prompt
- `POST /api/vapi/webhook` - Receive Vapi call events
- `GET /api/slots` - Get availability slots
- `POST /api/bookings` - Create a new booking

## Seed Data

To seed availability slots for an assistant:

```bash
npm run seed -- <assistant-id>
```

## License

[MIT](LICENSE) 