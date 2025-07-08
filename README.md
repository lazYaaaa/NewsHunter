# NewsFlow - RSS News Aggregator

A modern RSS news aggregator built with React, Express, PostgreSQL, and TypeScript. NewsFlow aggregates news from multiple RSS sources and provides a clean, searchable interface for browsing articles.

## Features

- **RSS Feed Management**: Add and manage multiple RSS sources
- **Real-time Updates**: Automatic feed parsing and article aggregation
- **Advanced Search**: Full-text search across articles and sources
- **Smart Filtering**: Filter by categories, sources, and time ranges
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark/Light Theme**: Toggle between dark and light modes
- **PostgreSQL Storage**: Persistent data storage with type-safe database operations

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **Tailwind CSS** for styling

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** database with Neon serverless
- **Drizzle ORM** for type-safe database operations
- **Custom RSS Parser** for feed processing

## Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database 

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd newsflow
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
DATABASE_URL=<your-postgresql-url>
SESSION_SECRET=<random-session-secret>
```

4. **Initialize database**
```bash
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5002`

## Database Setup

NewsFlow uses PostgreSQL with Drizzle ORM. The database schema includes:

- **Users**: User authentication data
- **Sources**: RSS feed sources
- **Articles**: Parsed news articles
- **Sessions**: User session storage

### Schema Migration
```bash
# Apply schema changes to database
npm run db:push

# Generate migration files (if needed)
npm run db:generate
```


### Local Development Setup

Для запуска на своем компьютере смотрите подробную инструкцию в [`LOCAL_SETUP.md`](LOCAL_SETUP.md).

**Быстрый старт:**
1. Скачайте проект
2. `npm install`
3. Создайте `.env` с `DATABASE_URL` и `SESSION_SECRET`
4. `npm run db:push`
5. `npm run dev`

### Manual Deployment

1. **Build the application**
```bash
npm run build
```

2. **Set environment variables**
```bash
DATABASE_URL=<your-postgresql-url>
SESSION_SECRET=<secure-random-string>
```

3. **Start production server**
```bash
npm start
```

## Configuration

### RSS Sources

Default RSS sources are automatically added:
- TechCrunch (Technology)
- BBC News (General)
- Hacker News (Technology)

### Adding Custom Sources

1. Navigate to the sidebar
2. Click "Add Source"
3. Enter RSS feed URL and details
4. Sources are automatically validated

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Secret for session encryption | Yes |
| `NODE_ENV` | Environment mode | No |

## API Documentation

Full API documentation is available in [`docs/api.md`](docs/api.md).

### Key Endpoints

- `GET /api/articles` - Fetch articles with filtering
- `GET /api/sources` - Get RSS sources
- `POST /api/refresh` - Refresh all feeds
- `GET /api/auth/user` - Get current user
- `GET /api/stats` - Get application statistics

## Development

### Project Structure
```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and config
├── server/          # Express backend
│   ├── services/    # Business logic
│   ├── routes.ts    # API routes
│   ├── storage.ts   # Database operations
│   └── index.ts     # Server entry point
├── shared/          # Shared types and schemas
└── docs/            # Documentation
```

### Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run db:push      # Apply schema changes
npm run db:generate  # Generate migrations

# Type checking
npm run type-check
```

### Adding New Features

1. **Database Changes**: Update `shared/schema.ts`
2. **API Endpoints**: Add routes in `server/routes.ts`
3. **Storage Layer**: Update `server/storage.ts`
4. **Frontend**: Add components in `client/src/`

## Testing

### Manual Testing

1. **RSS Parsing**: Test with various RSS feed formats
2. **Search**: Verify search functionality across articles
3. **Authentication**: Test login/logout flows
4. **Responsive**: Check mobile and desktop layouts

### Testing RSS Feeds

```bash
# Test RSS parsing
curl -X POST http://localhost:5000/api/refresh

# Check articles
curl http://localhost:5000/api/articles
```

## Troubleshooting

### Common Issues

1. **Database Connection**
   - Verify `DATABASE_URL` is set correctly
   - Check database is accessible
   - Run `npm run db:push` to ensure schema is up to date

2. **RSS Parsing Errors**
   - Check RSS feed URLs are valid
   - Verify network connectivity
   - Review server logs for parsing errors

3. **Authentication Issues**
   - Check session secret is configured
   - Verify database sessions table exists

4. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run type-check`
   - Verify all dependencies are installed

### Debug Mode

Enable debug logging:
```bash
DEBUG=express:* npm run dev
```

## Performance

- **Article Caching**: TanStack Query caches API responses
- **Database Indexing**: Optimized queries with proper indexes
- **Lazy Loading**: Components load on demand
- **RSS Throttling**: Feeds refresh at controlled intervals

## Security

- **Session Management**: Secure session storage in PostgreSQL
- **Input Validation**: Zod schemas validate all inputs
- **SQL Injection**: Protected by Drizzle ORM parameterized queries


## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check this README and documentation
2. Review GitHub issues
3. Contact project maintainers

---

**Built with using React, Express, and PostgreSQL**