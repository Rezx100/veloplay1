-- Create stream_sources table
CREATE TABLE IF NOT EXISTS stream_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  league_id VARCHAR NOT NULL,
  priority INTEGER DEFAULT 1,
  team_name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on team_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_stream_sources_team_name ON stream_sources(team_name);

-- Create index on league_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_stream_sources_league_id ON stream_sources(league_id);