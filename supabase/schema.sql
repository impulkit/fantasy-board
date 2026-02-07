-- SQL Schema for Fantasy Cricket App

-- Table for players
CREATE TABLE players (
    player_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    team VARCHAR(100) NOT NULL,
    position VARCHAR(50),
    performance_points INT DEFAULT 0
);

-- Table for fantasy teams
CREATE TABLE fantasy_teams (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    owner VARCHAR(100) NOT NULL,
    total_points INT DEFAULT 0
);

-- Table for matches
CREATE TABLE matches (
    match_id SERIAL PRIMARY KEY,
    match_date TIMESTAMP NOT NULL,
    team_one_id INT,
    team_two_id INT,
    FOREIGN KEY (team_one_id) REFERENCES fantasy_teams(team_id),
    FOREIGN KEY (team_two_id) REFERENCES fantasy_teams(team_id)
);

-- Table for points tracking
CREATE TABLE points_tracking (
    tracking_id SERIAL PRIMARY KEY,
    team_id INT,
    match_id INT,
    points_awarded INT,
    FOREIGN KEY (team_id) REFERENCES fantasy_teams(team_id),
    FOREIGN KEY (match_id) REFERENCES matches(match_id)
);

-- Table for sync state
CREATE TABLE sync_state (
    sync_id SERIAL PRIMARY KEY,
    last_sync TIMESTAMP NOT NULL,
    is_synced BOOLEAN DEFAULT FALSE
);
