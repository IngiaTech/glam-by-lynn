# Glam by Lynn - Enterprise Web Application

Enterprise-grade web application for a makeup artist and beauty business serving clients in Kenya. Combines makeup services booking, e-commerce for beauty products, and a 2026 vision showcase for future salon/spa/barbershop.

## Project Overview

**Business:** Glam by Lynn  
**Locations:** Kitui and Nairobi, Kenya  
**Brand Colors:** Black and Light Pink

### Core Features

1. **Makeup Services & Booking**
   - Bridal makeup packages (various team sizes)
   - Regular makeup services
   - Makeup artistry classes
   - Calendar-based booking with time slots
   - Location-based transport pricing
   - 50% deposit tracking

2. **E-Commerce Platform**
   - Full product catalog with filtering and search
   - Brand and category organization
   - Product variants (size, color, etc.)
   - Shopping cart and wishlist
   - Guest and authenticated checkout
   - Promo codes and discounts
   - Reviews and ratings

3. **2026 Vision Showcase**
   - Future premium salon/spa/barbershop vision
   - Mobile bridal van concept
   - Interest registration for funding proposals

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth:** NextAuth.js (Google OAuth)
- **State:** React Query + React Context
- **Forms:** React Hook Form + Zod
- **Deployment:** Vercel

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 15+
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **Auth:** OAuth2 + JWT
- **Testing:** Pytest
- **Deployment:** AWS EC2 (Docker)

## Project Structure

```
glam-by-lynn/
├── docs/                    # Documentation
│   ├── DATABASE_SCHEMA.md
│   └── ...
├── frontend/                # Next.js application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities and helpers
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/routes/     # API endpoints
│   │   ├── core/           # Configuration
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   └── tests/              # Test files
├── PROJECT_PLAN.md         # Complete project plan
└── README.md               # This file
```

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 15+
- **Git**
- **Docker** (optional, for containerization)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Create PostgreSQL database:**
   ```bash
   createdb glam_by_lynn
   ```

6. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

7. **Start development server:**
   ```bash
   uvicorn app.main:app --reload
   ```

   API will be available at `http://localhost:8000`
   Swagger docs at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Application will be available at `http://localhost:3000`

### Running Tests

**Backend:**
```bash
cd backend
pytest
pytest --cov=app tests/  # With coverage
```

**Frontend:**
```bash
cd frontend
npm test
npm run test:coverage  # With coverage
```

## Development Workflow

We follow a structured Git workflow for all development:

1. **Pick an issue** from the [GitHub Issues](https://github.com/CaptainMumo/glam-by-lynn/issues)
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/issue-{number}-{short-description}
   ```
3. **Implement the feature** following TDD (Test-Driven Development)
4. **Write tests** (unit and integration)
5. **Ensure tests pass:**
   ```bash
   # Backend
   pytest
   
   # Frontend
   npm test
   ```
6. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: description of changes (#issue-number)"
   ```
7. **Push to GitHub:**
   ```bash
   git push origin feature/issue-{number}-{short-description}
   ```
8. **Create a Pull Request** referencing the issue
9. **Review and merge** to main branch
10. **Test on deployed environment**
11. **Close the issue**

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or updates
- `chore:` Build process or auxiliary tool changes

Example: `feat: implement Google OAuth authentication (#15)`

## Project Milestones

- **Phase 1: Foundation** - Project setup, database, authentication (Weeks 1-2)
- **Phase 2: Admin Panel** - Product, service, and content management (Weeks 3-4)
- **Phase 3: E-Commerce** - Customer-facing shop features (Weeks 5-7)
- **Phase 4: Booking System** - Service booking with calendar (Weeks 8-9)
- **Phase 5: Content & Vision** - Gallery and 2026 vision (Weeks 10-11)
- **Phase 6: Polish & Launch** - Optimization and deployment (Week 12)

View all milestones and issues: [GitHub Milestones](https://github.com/CaptainMumo/glam-by-lynn/milestones)

## Documentation

- **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - Complete technical specification
- **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - Database design and schema
- **[API Documentation](http://localhost:8000/docs)** - Interactive API docs (when backend is running)

## Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Backend (AWS EC2)
1. Launch EC2 instance (t2.micro for free tier)
2. Install Docker and Docker Compose
3. Clone repository and configure .env
4. Run with Docker Compose
5. Configure Nginx reverse proxy
6. Setup SSL with Let's Encrypt

See detailed deployment instructions in `PROJECT_PLAN.md`.

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/glam_by_lynn
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Contributing

1. Pick an unassigned issue from GitHub Issues
2. Follow the development workflow described above
3. Ensure all tests pass before creating PR
4. Request review from maintainers
5. Address any feedback and get approval
6. Merge and close issue

## License

Proprietary - All rights reserved by Glam by Lynn

## Contact

For questions or support, please contact:
- **Business Owner:** Lynn
- **GitHub:** [CaptainMumo](https://github.com/CaptainMumo)
- **Repository:** [glam-by-lynn](https://github.com/CaptainMumo/glam-by-lynn)

---

**Built with ❤️ for the beauty and wellness industry in Kenya**
