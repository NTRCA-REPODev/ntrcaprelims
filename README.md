# Online Exam Web Application

A comprehensive online examination system with Node.js backend and vanilla frontend.

## Features

### User Features
- User registration with name and district
- Real-time exam taking with timer
- Automatic scoring with negative marking (-0.25 for wrong answers)
- Exam review with explanations
- District-wise leaderboard rankings
- User profile management

### Admin Features
- Exam import via JSON format
- System metrics monitoring
- User analytics

### System Features
- Responsive mobile-first design
- Real-time timer with auto-submit
- Secure API with user authentication
- PostgreSQL database with optimized queries
- Production-ready deployment setup

## Technology Stack

**Backend:**
- Node.js + Express
- PostgreSQL (via pg driver)
- CORS enabled for frontend integration

**Frontend:**
- Vanilla HTML, CSS, JavaScript
- Mobile-first responsive design
- LocalStorage for user session management
- Fetch API for backend communication

## Quick Start

### Prerequisites
- Node.js 16+ installed
- PostgreSQL database (local or cloud like Neon)

### Backend Setup

1. Clone and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and settings
```

3. Create database schema:
```bash
psql -d your_database_url -f schema.sql
```

4. Start the server:
```bash
npm start
# Or for development:
npm run dev
```

### Frontend Setup

1. Serve the public folder using any static server:
```bash
# Using Python (if installed)
cd public && python -m http.server 8080

# Using Node.js serve package
npx serve public

# Using live-server for development
npx live-server public
```

2. Update API_BASE_URL in `public/app.js` to match your backend URL

## Database Schema

The application uses 4 main tables:

- **users**: Store user information (id, name, district)
- **exams**: Store exam metadata (title, description, timing, marks)
- **questions**: Store questions with options and correct answers
- **attempts**: Store user submissions and scores

See `schema.sql` for complete schema with indexes and constraints.

## API Endpoints

### Public Endpoints
- `POST /register` - User registration
- `GET /exams` - List available exams
- `GET /exams/:id/leaderboard` - View leaderboard

### Authenticated Endpoints (require X-User-Id header)
- `GET /me` - Get user profile
- `GET /exams/:id` - Get exam details
- `GET /exams/:id/questions` - Get exam questions (during exam time)
- `POST /exams/:id/submit` - Submit exam answers
- `GET /exams/:id/review` - Review submitted exam

### Admin Endpoints (require Authorization: Bearer token)
- `POST /admin/import` - Import exam from JSON
- `GET /admin/metrics` - Get system metrics

## Deployment

### Backend Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NODE_ENV`: `production`
   - `ADMIN_TOKEN`: Your secure admin token

### Frontend Deployment (GitHub Pages)

1. Push the `public` folder to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Update `API_BASE_URL` in `app.js` to your deployed backend URL

### Database Setup (Neon)

1. Create a free PostgreSQL database at [Neon](https://neon.tech)
2. Run the schema.sql file to create tables
3. Use the connection string in your environment variables

## Exam JSON Format

```json
{
  "title": "Sample Exam",
  "description": "This is a sample exam",
  "startTime": "2024-01-15T10:00:00.000Z",
  "endTime": "2024-01-15T12:00:00.000Z",
  "marksPerQuestion": 1,
  "questions": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": 1,
      "explanation": "2 + 2 equals 4"
    }
  ]
}
```

## Admin Access

- Navigate to `/admin.html`
- Enter password: `FahimsirNTRCA`
- Import exams and view system metrics

## Security Features

- User-based access control for exam attempts
- Admin token authentication for management features
- SQL injection prevention with parameterized queries
- CORS configuration for cross-origin requests
- Input validation and sanitization

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT License - feel free to use for educational or commercial projects.