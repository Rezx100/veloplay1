# Sports Streaming Platform

A cutting-edge live sports streaming platform delivering immersive, interactive fan experiences with advanced mobile-responsive content presentation and engagement tools.

## Features

- Real-time sports game streaming
- Support for multiple sports leagues (NBA, NFL, NHL, MLB)
- Mobile-responsive design
- Live game updates and statistics
- User authentication and account management
- Subscription management for premium content

## Tech Stack

- **Frontend**: React, TailwindCSS, shadcn/ui components
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
- **State Management**: React Query
- **Routing**: Wouter

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- PostgreSQL

### Installation

1. Clone the repository
   ```
   git clone https://github.com/Rezx100/sports.git
   cd sports
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=your_postgres_connection_string
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   ```

4. Start the development server
   ```
   npm run dev
   ```

## Project Structure

- `client/`: Frontend React application
- `server/`: Express.js backend
- `shared/`: Shared types and schemas
- `drizzle/`: Database migrations

## Deployment

### Deploying to Vercel

This project is configured to be deployed on Vercel. Follow these steps:

1. Push your code to GitHub
   ```
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. Import your repository in the Vercel dashboard
   - Go to [vercel.com/new](https://vercel.com/new)
   - Connect your GitHub account and select the repository
   - Choose "Other" as the Framework Preset
   
3. Configure the project
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
   
4. Environment Variables
   Add the following environment variables in the Vercel dashboard:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service key
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key

5. Deploy
   - Click "Deploy" and wait for the build to complete
   - Your app will be available at `[project-name].vercel.app`

## License

[MIT](LICENSE)