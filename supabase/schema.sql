-- =================================================================
-- Fantasy Board – Supabase Schema
-- =================================================================
-- Run this in your Supabase SQL Editor to create all tables.
-- WARNING: This drops and recreates all tables!
-- =================================================================

-- Drop old tables (order matters due to foreign keys)
DROP TABLE IF EXISTS sync_state CASCADE;
DROP TABLE IF EXISTS leaderboard_cache CASCADE;
DROP TABLE IF EXISTS team_match_points CASCADE;
DROP TABLE IF EXISTS player_match_points CASCADE;
DROP TABLE IF EXISTS fantasy_team_players CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS fantasy_teams CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS points_tracking CASCADE;  -- old schema table

-- Players (keyed by normalized name from CricketData API)
CREATE TABLE IF NOT EXISTS players (
    api_player_id TEXT PRIMARY KEY,
    display_name  TEXT NOT NULL DEFAULT ''
);

-- Fantasy teams (one per friend)
CREATE TABLE IF NOT EXISTS fantasy_teams (
    id         SERIAL PRIMARY KEY,
    team_name  TEXT NOT NULL,
    owner      TEXT NOT NULL DEFAULT ''
);

-- Roster: which players belong to which fantasy team
CREATE TABLE IF NOT EXISTS fantasy_team_players (
    id                   SERIAL PRIMARY KEY,
    fantasy_team_id      INT  NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    api_player_id        TEXT NOT NULL REFERENCES players(api_player_id) ON DELETE CASCADE,
    is_captain           BOOLEAN NOT NULL DEFAULT FALSE,
    is_vicecaptain       BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from_time  TIMESTAMPTZ,
    effective_to_time    TIMESTAMPTZ,
    UNIQUE (fantasy_team_id, api_player_id)
);

-- Real cricket matches
CREATE TABLE IF NOT EXISTS matches (
    api_match_id   TEXT PRIMARY KEY,
    match_date     DATE,
    start_time     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    team_a         TEXT NOT NULL DEFAULT '',
    team_b         TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT '',
    result         TEXT NOT NULL DEFAULT '',
    last_synced_at TIMESTAMPTZ
);

-- Per-player points for each match
CREATE TABLE IF NOT EXISTS player_match_points (
    api_match_id  TEXT NOT NULL REFERENCES matches(api_match_id) ON DELETE CASCADE,
    api_player_id TEXT NOT NULL REFERENCES players(api_player_id) ON DELETE CASCADE,
    points        NUMERIC NOT NULL DEFAULT 0,
    breakdown     JSONB,
    PRIMARY KEY (api_match_id, api_player_id)
);

-- Aggregated fantasy-team points per match
CREATE TABLE IF NOT EXISTS team_match_points (
    api_match_id    TEXT NOT NULL REFERENCES matches(api_match_id) ON DELETE CASCADE,
    fantasy_team_id INT  NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    points          NUMERIC NOT NULL DEFAULT 0,
    PRIMARY KEY (api_match_id, fantasy_team_id)
);

-- Leaderboard cache (total points per fantasy team)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    fantasy_team_id INT PRIMARY KEY REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    total_points    NUMERIC NOT NULL DEFAULT 0,
    last_updated    TIMESTAMPTZ
);

-- Sync state (single-row table, id = 1)
CREATE TABLE IF NOT EXISTS sync_state (
    id                        INT PRIMARY KEY DEFAULT 1,
    last_completed_match_time TIMESTAMPTZ,
    CHECK (id = 1)
);

-- Seed the sync_state row
INSERT INTO sync_state (id) VALUES (1) ON CONFLICT DO NOTHING;
