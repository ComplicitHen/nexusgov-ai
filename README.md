# NexusGov AI

**Compliance-First AI Orchestration Platform for the Public Sector**

A secure, multi-tenant web portal designed for Swedish municipalities and public institutions to monitor, access, and manage various AI models while enforcing GDPR compliance, cost control, and data sovereignty.

## Features

### Core Capabilities
- **Multi-Tenant Organization Management**: Hierarchical structure (Municipality → Sub-units → Users)
- **GDPR Compliance Layer**: EU-hosted models, PII screening, zero data retention (ZDR)
- **RAG (Retrieval-Augmented Generation)**: Upload documents, ask questions with verifiable citations
- **Multi-Model AI Access**: Access to multiple AI models via OpenRouter
- **Cost Control**: Budget management at org and sub-unit levels
- **Custom AI Assistants**: No-code builder for department-specific bots
- **Meeting Intelligence**: Audio transcription with Whisper, automated minutes generation
- **Audit Logging**: Complete DPO audit trail for compliance

### GDPR Features
- **Model Filtering**: Restrict to EU-hosted models in strict mode
- **PII Detection**: Automatic screening for Swedish SSNs (personnummer), names, addresses
- **Data Residency**: Visual indicators showing where data is processed
- **Citation System**: Every AI response links to source documents with highlighted excerpts

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **Authentication**: Firebase Auth (EU region) + BankID/SAML integration
- **Database**: PostgreSQL/Firestore
- **Vector Database**: Qdrant (for RAG)
- **AI Orchestration**: OpenRouter API
- **Deployment**: Auto-deploy to Hetzner VPS via GitHub Actions

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- PostgreSQL (or Firestore)
- Qdrant (for vector search)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd nexusgov-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Required Environment Variables

See `.env.example` for the complete list. Key variables:
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `NEXT_PUBLIC_FIREBASE_*`: Firebase configuration (EU region)
- `QDRANT_URL`: Vector database URL
- `DATABASE_URL`: PostgreSQL connection string

## Deployment

This project auto-deploys to VPS when pushing to `main` branch. See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup instructions.

**Quick deploy:**
1. Add `SSH_PRIVATE_KEY` to GitHub repository secrets
2. Push to `main` branch
3. GitHub Actions handles the rest

## Project Structure

```
nexusgov-ai/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   ├── chat/              # Chat interface components
│   ├── dashboard/         # Dashboard views
│   └── admin/             # Admin panel components
├── lib/                   # Core libraries
│   ├── auth/              # Authentication logic
│   ├── ai/                # AI model integrations
│   ├── db/                # Database utilities
│   └── utils/             # Utility functions
├── types/                 # TypeScript type definitions
├── hooks/                 # Custom React hooks
└── public/                # Static assets
```

## Key Compliance Features

### GDPR "Strict Mode"
Restricts all AI requests to:
- EU-hosted models (Azure Sweden, Mistral Europe)
- Models with valid Data Processing Agreements (DPA)
- Zero data retention policies

### PII Screening
Automatically detects and flags:
- Swedish SSNs (personnummer): `YYYYMMDD-XXXX`
- Names, addresses, phone numbers
- Actions: Warn, Block, or Anonymize

### Audit Trail
Every interaction logged with:
- User ID, Organization, Sub-unit
- Model used, timestamp
- PII-masked query/response
- Data residency location

## Development

```bash
# Run development server
npm run dev

# Run type checking
npm run type-check

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Contributing

This is a public sector project focused on compliance and data sovereignty. Contributions must maintain GDPR compliance and security standards.

## License

[Specify your license]

## Support

For issues and questions, please contact your system administrator or open an issue in the repository.
