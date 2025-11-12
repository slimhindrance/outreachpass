# OutreachPass Frontend

Professional networking application for conferences and events.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query + Zustand
- **Authentication**: AWS Cognito
- **Deployment**: S3 + CloudFront

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Access to OutreachPass API (https://outreachpass.base2ml.com)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (static export to `out/`)
- `npm run start` - Start production server (not used for S3 deployment)
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## Project Structure

```
frontend-outreachpass/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authenticated routes
│   ├── (public)/          # Public routes
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/            # React components
│   ├── ui/               # UI components (buttons, cards, etc.)
│   └── shared/           # Shared components
├── lib/                   # Utilities and helpers
│   ├── api/              # API client
│   ├── auth/             # Authentication logic
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Helper functions
├── types/                # TypeScript type definitions
├── config/               # Application configuration
└── public/               # Static assets
```

## Environment Variables

See `.env.local.example` for required environment variables.

## Deployment

The application is configured for static export and deployed to S3 + CloudFront.

```bash
# Build static site
npm run build

# Deploy to S3 (requires AWS CLI configured)
./scripts/deploy.sh
```

## Features

### Public Pages
- Landing page with features and CTAs
- Enhanced contact card views
- Public event listings

### Admin Dashboard
- Event management (CRUD)
- Attendee management with CSV import
- Analytics and reporting
- Brand configuration

### Attendee Portal
- Profile management
- Digital pass access
- QR code display
- Wallet pass downloads

### Exhibitor Portal
- Lead capture interface
- Lead management and export
- Booth analytics

## API Integration

The frontend integrates with the OutreachPass backend API:
- Base URL: https://outreachpass.base2ml.com
- Authentication: AWS Cognito with JWT tokens
- Documentation: https://outreachpass.base2ml.com/docs

## Contributing

1. Create feature branch
2. Make changes
3. Run linting and type checking
4. Submit pull request

## License

Proprietary - Base2ML
