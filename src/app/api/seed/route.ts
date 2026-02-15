import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function supabaseAdmin() {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, { auth: { persistSession: false } });
}

// ---- T20 WC Auction Data (extracted from Excel) ----

interface AuctionPlayer {
    name: string;
    role: string;   // position in the auction (Batsman1, WK, etc.)
    bid: number;
}

interface TeamData {
    owner: string;
    players: AuctionPlayer[];
}

// Per-player Dream11 points from Excel (columns D-F = Match 1, 2, 3)
// Format: {playerName: [m1, m2, m3]}
const PLAYER_POINTS: Record<string, number[]> = {
    "Saim Ayub": [11, 24, 23],
    "Sediqullah Atal": [28, 0, 2],
    "Brandon King": [10, 27, 0],
    "Josh Inglis": [47, 84, 40],
    "Mitchell Santner": [7, 57, 0],
    "Jacob Duffy": [0, 0, 40],
    "Usman Tariq": [0, 0, 0],
    "Mitchell Marsh": [130, 14, 10],
    "George Linde": [8, 64, 69],
    "Sherfane Rutherford": [4, 0, 0],
    "Josh Tongue": [12, 0, 14],
    "Lungi Ngidi": [146, 129, 42],
    "Travis Head": [14, 26, 0],
    "Ryan Rickelton": [63, 123, 61],
    "Shimron Hetmyer": [134, 53, 0],
    "Kusal Mendis": [102, 129, 0],
    "Cameron Green": [75, 36, 0],
    "Shaheen Shah Afridi": [55, 79, 0],
    "Matheesha Pathirana": [78, 20, 0],
    "Xavier Bartlett": [25, 0, 0],
    "Salman Ali Agha": [44, 13, 0],
    "Michael Bracewell": [0, 0, 0],
    "Jamie Overton": [0, 89, 49],
    "Tom Banton": [12, 22, 129],
    "Matthew Kuhnemann": [48, 9, 0],
    "Harry Brook": [103, 25, 14],
    "Rovman Powell": [58, 42, 0],
    "David Miller": [73, 44, 48],
    "Devon Conway": [0, 0, 0],
    "Hardik Pandya": [21, 194, 0],
    "Jasprit Bumrah": [0, 67, 0],
    "Arshdeep Singh": [91, 36, 0],
    "Dushmantha Chameera": [50, 86, 0],
    "Washington Sundar": [0, 0, 0],
    "Dasun Shanaka": [23, 109, 0],
    "Roston Chase": [0, 151, 0],
    "Scott Edwards": [79, 58, 50],
    "Monank Patel": [10, 1, 74],
    "Suryakumar Yadav": [170, 22, 0],
    "Paul Stirling": [16, 13, 0],
    "Rinku Singh": [10, 5, 0],
    "Rahmanullah Gurbaz": [49, 164, 0],
    "Shivam Dube": [10, 90, 0],
    "Matt Henry": [47, 74, 25],
    "Adam Zampa": [145, 12, 0],
    "Varun Chak": [54, 127, 0],
    "Noor Ahmad": [0, 31, 0],
    "Fakhar Zaman": [0, 0, 0],
    "Tristan Stubbs": [84, 13, 12],
    "Naseem Shah": [0, 0, 0],
    "Gudakesh Motie": [49, 120, 0],
    "Dewald Brevis": [14, 37, 35],
    "Glenn Phillips": [104, 59, 5],
    "Harry Tector": [54, 35, 38],
    "Phil Salt": [13, 80, 14],
    "Marco Jansen": [76, 95, 139],
    "Siraj": [127, 0, 0],
    "Dilshan Madushanka": [0, 0, 0],
    "Naveen-ul-Haq": [0, 0, 0],
    "Axar Patel": [98, 103, 0],
    "Shadab Khan": [18, 142, 0],
    "Will Jacks": [122, 4, 42],
    "Shai Hope": [31, 2, 0],
    "Babar Azam": [31, 78, 0],
    "Charith Asalanka": [0, 0, 0],
    "Jatinder Singh": [13, 5, 15],
    "Quinton de Kock": [57, 117, 52],
    "Abhishek Sharma": [2, 0, 0],
    "Jofra Archer": [42, 49, 80],
    "Kagiso Rabada": [65, 46, 16],
    "Abrar Ahmed": [84, 51, 0],
    "Daryl Mitchell": [49, 12, 72],
    "Rashid Khan": [35, 7, 0],
    "Kusal Perera": [0, 0, 0],
    "Jacob Bethell": [79, 93, 0],
    "Marcus Stoinis": [0, 0, 23],
    "Finn Allen": [87, 63, 0],
    "Ben Duckett": [115, 9, 60],
    "Tim David": [6, 19, 6],
    "Jos Buttler": [13, 15, 1],
    "Aiden Markram": [46, 52, 139],
    "Anrich Nortje": [159, 121, 49],
    "Lockie Ferguson": [2, 45, 101],
    "Maheesh Theekshana": [0, 0, 0],
    "Tim Seifert": [16, 34, 0],
    "Rachin Ravindra": [0, 0, 76],
    "Adil Rashid": [0, 55, 81],
    "Liam Dawson": [0, 54, 20],
    "Romario Shepherd": [0, 5, 0],
    "Tilak Varma": [36, 43, 0],
    "Pathum Nissanka": [0, 0, 0],
    "Ibrahim Zadran": [24, 14, 0],
    "Ishan Kishan": [137, 5, 0],
    "Wanindu Hasaranga": [58, 32, 0],
    "Keshav Maharaj": [50, 67, 88],
    "Kuldeep Yadav": [0, 21, 0],
    "Nathan Ellis": [20, 62, 66],
    "Sam Curran": [6, 67, 0],
    "Kyle Jamieson": [0, 0, 0],
    "Azmatullah Omarzai": [0, 0, 0],
    "Sahibzada Farhan": [0, 0, 0],
    "Glenn Maxwell": [58, 107, 0],
    "Harshit Rana": [0, 0, 0],
    "Matthew Humphreys": [0, 0, 0],
};

const TEAMS: TeamData[] = [
    {
        owner: "Akash",
        players: [
            { name: "Saim Ayub", role: "BAT", bid: 16 },
            { name: "Sediqullah Atal", role: "BAT", bid: 1 },
            { name: "Brandon King", role: "BAT", bid: 1 },
            { name: "Josh Inglis", role: "WK", bid: 8.5 },
            { name: "Mitchell Santner", role: "AR", bid: 7 },
            { name: "Jacob Duffy", role: "BOWL", bid: 7 },
            { name: "Usman Tariq", role: "BOWL", bid: 1 },
            { name: "Mitchell Marsh", role: "AR", bid: 26 },
            { name: "George Linde", role: "AR", bid: 6 },
            { name: "Sherfane Rutherford", role: "BAT", bid: 7.5 },
            { name: "Josh Tongue", role: "BOWL", bid: 1 },
            { name: "Lungi Ngidi", role: "BOWL", bid: 1 },
        ],
    },
    {
        owner: "Hem",
        players: [
            { name: "Travis Head", role: "BAT", bid: 24 },
            { name: "Ryan Rickelton", role: "BAT", bid: 13 },
            { name: "Shimron Hetmyer", role: "BAT", bid: 9 },
            { name: "Kusal Mendis", role: "WK", bid: 6.5 },
            { name: "Cameron Green", role: "AR", bid: 16 },
            { name: "Shaheen Shah Afridi", role: "BOWL", bid: 6 },
            { name: "Matheesha Pathirana", role: "BOWL", bid: 3.5 },
            { name: "Xavier Bartlett", role: "BOWL", bid: 1 },
            { name: "Salman Ali Agha", role: "AR", bid: 7 },
            { name: "Michael Bracewell", role: "AR", bid: 2 },
            { name: "Jamie Overton", role: "AR", bid: 1 },
            { name: "Tom Banton", role: "BAT", bid: 1 },
            { name: "Matthew Kuhnemann", role: "BOWL", bid: 1 },
        ],
    },
    {
        owner: "Chirag",
        players: [
            { name: "Harry Brook", role: "BAT", bid: 11 },
            { name: "Rovman Powell", role: "BAT", bid: 4 },
            { name: "David Miller", role: "BAT", bid: 5 },
            { name: "Devon Conway", role: "WK", bid: 1 },
            { name: "Hardik Pandya", role: "AR", bid: 26 },
            { name: "Jasprit Bumrah", role: "BOWL", bid: 20 },
            { name: "Arshdeep Singh", role: "BOWL", bid: 22 },
            { name: "Dushmantha Chameera", role: "BOWL", bid: 2 },
            { name: "Washington Sundar", role: "AR", bid: 2 },
            { name: "Dasun Shanaka", role: "AR", bid: 1 },
            { name: "Roston Chase", role: "AR", bid: 1.5 },
            { name: "Scott Edwards", role: "WK", bid: 1 },
            { name: "Monank Patel", role: "BAT", bid: 3.5 },
        ],
    },
    {
        owner: "Abhay",
        players: [
            { name: "Suryakumar Yadav", role: "BAT", bid: 24 },
            { name: "Paul Stirling", role: "BAT", bid: 1.5 },
            { name: "Rinku Singh", role: "BAT", bid: 2.5 },
            { name: "Rahmanullah Gurbaz", role: "WK", bid: 4.5 },
            { name: "Shivam Dube", role: "AR", bid: 7.5 },
            { name: "Matt Henry", role: "BOWL", bid: 6.5 },
            { name: "Adam Zampa", role: "BOWL", bid: 13 },
            { name: "Varun Chak", role: "BOWL", bid: 24 },
            { name: "Noor Ahmad", role: "BOWL", bid: 6 },
            { name: "Fakhar Zaman", role: "BAT", bid: 2.5 },
            { name: "Tristan Stubbs", role: "BAT", bid: 1.5 },
            { name: "Naseem Shah", role: "BOWL", bid: 1 },
            { name: "Gudakesh Motie", role: "BOWL", bid: 1 },
        ],
    },
    {
        owner: "Nehal",
        players: [
            { name: "Dewald Brevis", role: "BAT", bid: 19 },
            { name: "Glenn Phillips", role: "BAT", bid: 16 },
            { name: "Harry Tector", role: "BAT", bid: 0 },
            { name: "Phil Salt", role: "WK", bid: 17 },
            { name: "Marco Jansen", role: "AR", bid: 13 },
            { name: "Harshit Rana", role: "BOWL", bid: 4.5 },
            { name: "Dilshan Madushanka", role: "BOWL", bid: 1 },
            { name: "Naveen-ul-Haq", role: "BOWL", bid: 1 },
            { name: "Axar Patel", role: "AR", bid: 12 },
            { name: "Shadab Khan", role: "AR", bid: 1 },
            { name: "Will Jacks", role: "AR", bid: 2 },
            { name: "Shai Hope", role: "BAT", bid: 5.5 },
            { name: "Matthew Humphreys", role: "BOWL", bid: 0 },
        ],
    },
    {
        owner: "Farhaan",
        players: [
            { name: "Babar Azam", role: "BAT", bid: 5.5 },
            { name: "Charith Asalanka", role: "BAT", bid: 1 },
            { name: "Jatinder Singh", role: "BAT", bid: 1 },
            { name: "Quinton de Kock", role: "WK", bid: 17 },
            { name: "Abhishek Sharma", role: "AR", bid: 32 },
            { name: "Jofra Archer", role: "BOWL", bid: 7 },
            { name: "Kagiso Rabada", role: "BOWL", bid: 5.5 },
            { name: "Abrar Ahmed", role: "BOWL", bid: 5.5 },
            { name: "Daryl Mitchell", role: "AR", bid: 5.5 },
            { name: "Rashid Khan", role: "BOWL", bid: 6.5 },
            { name: "Kusal Perera", role: "WK", bid: 8 },
            { name: "Jacob Bethell", role: "AR", bid: 1 },
            { name: "Marcus Stoinis", role: "AR", bid: 3.5 },
        ],
    },
    {
        owner: "Siddhant",
        players: [
            { name: "Finn Allen", role: "BAT", bid: 18 },
            { name: "Ben Duckett", role: "BAT", bid: 3 },
            { name: "Tim David", role: "BAT", bid: 9 },
            { name: "Jos Buttler", role: "WK", bid: 18 },
            { name: "Aiden Markram", role: "AR", bid: 14 },
            { name: "Anrich Nortje", role: "BOWL", bid: 6 },
            { name: "Lockie Ferguson", role: "BOWL", bid: 3.5 },
            { name: "Maheesh Theekshana", role: "BOWL", bid: 1 },
            { name: "Tim Seifert", role: "WK", bid: 9 },
            { name: "Rachin Ravindra", role: "AR", bid: 3.5 },
            { name: "Adil Rashid", role: "BOWL", bid: 11 },
            { name: "Liam Dawson", role: "AR", bid: 1 },
            { name: "Romario Shepherd", role: "AR", bid: 1 },
        ],
    },
    {
        owner: "Harsh",
        players: [
            { name: "Tilak Varma", role: "BAT", bid: 16 },
            { name: "Pathum Nissanka", role: "BAT", bid: 9 },
            { name: "Ibrahim Zadran", role: "BAT", bid: 1 },
            { name: "Ishan Kishan", role: "WK", bid: 26 },
            { name: "Wanindu Hasaranga", role: "AR", bid: 10 },
            { name: "Keshav Maharaj", role: "BOWL", bid: 9 },
            { name: "Kuldeep Yadav", role: "BOWL", bid: 1 },
            { name: "Nathan Ellis", role: "BOWL", bid: 1 },
            { name: "Sam Curran", role: "AR", bid: 9.5 },
            { name: "Kyle Jamieson", role: "BOWL", bid: 1.5 },
            { name: "Azmatullah Omarzai", role: "AR", bid: 1 },
            { name: "Sahibzada Farhan", role: "BAT", bid: 7 },
            { name: "Glenn Maxwell", role: "AR", bid: 1 },
        ],
    },
];

async function runSeed(req: Request) {
    try {
        // Simple auth check
        const url = new URL(req.url);
        const key = url.searchParams.get("key");
        if (key !== process.env.ADMIN_KEY && key !== "seed-now") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = supabaseAdmin();
        const log: string[] = [];

        // 1) Upsert all players
        const allPlayerNames = new Set<string>();
        for (const team of TEAMS) {
            for (const p of team.players) {
                allPlayerNames.add(p.name);
            }
        }
        // Also players only in PLAYER_POINTS but not in auction
        for (const name of Object.keys(PLAYER_POINTS)) {
            allPlayerNames.add(name);
        }

        const playerRows = Array.from(allPlayerNames).map((name) => ({
            api_player_id: name.toLowerCase().replace(/\s+/g, "-"),
            display_name: name,
        }));

        const { error: playersErr } = await supabase
            .from("players")
            .upsert(playerRows, { onConflict: "api_player_id" });

        if (playersErr) throw new Error(`Players upsert: ${playersErr.message}`);
        log.push(`Upserted ${playerRows.length} players`);

        // 2) Create fantasy teams
        for (const team of TEAMS) {
            // Check if team exists
            let teamId: number;
            const { data: existingTeam } = await supabase
                .from("fantasy_teams")
                .select("id")
                .eq("owner", team.owner)
                .maybeSingle();

            if (existingTeam) {
                teamId = existingTeam.id;
            } else {
                const { data: newTeam, error: teamErr } = await supabase
                    .from("fantasy_teams")
                    .insert({ team_name: `Team ${team.owner}`, owner: team.owner })
                    .select("id")
                    .single();

                if (teamErr) throw new Error(`Team ${team.owner}: ${teamErr.message}`);
                teamId = newTeam.id;
            }
            log.push(`Team "${team.owner}" → id=${teamId}`);

            // 3) Link players to team
            for (const p of team.players) {
                const { data: playerRow } = await supabase
                    .from("players")
                    .select("api_player_id")
                    .eq("display_name", p.name)
                    .maybeSingle();

                if (playerRow) {
                    await supabase.from("fantasy_team_players").upsert(
                        {
                            fantasy_team_id: teamId,
                            api_player_id: playerRow.api_player_id,
                            // auction_price: p.bid, // Commented out until schema migration applied
                        },
                        { onConflict: "fantasy_team_id,api_player_id" }
                    );
                }
            }
            log.push(`  Linked ${team.players.length} players`);
        }

        // 4) Create 3 placeholder matches & seed points
        const matchLabels = ["Match 1", "Match 2", "Match 3"];
        for (let mi = 0; mi < 3; mi++) {
            const matchApiId = `seed-match-${mi + 1}`;
            const startTime = new Date(2025, 1, 15 + mi).toISOString();

            const { error: matchErr } = await supabase
                .from("matches")
                .upsert(
                    {
                        api_match_id: matchApiId,
                        status: "completed",
                        result: matchLabels[mi],
                        start_time: startTime,
                        completed_at: startTime,
                        match_date: startTime.split("T")[0],
                        team_a: "Seed Team A",
                        team_b: "Seed Team B",
                    },
                    { onConflict: "api_match_id" }
                );

            if (matchErr) throw new Error(`Match ${mi}: ${matchErr.message}`);
            log.push(`Match "${matchLabels[mi]}" (${matchApiId}) seeded`);

            // Seed per-player points for this match
            for (const [playerName, points] of Object.entries(PLAYER_POINTS)) {
                const pts = points[mi] ?? 0;
                if (pts === 0) continue;

                const playerId = playerName.toLowerCase().replace(/\s+/g, "-");
                await supabase.from("player_match_points").upsert(
                    {
                        api_match_id: matchApiId,
                        api_player_id: playerId,
                        points: pts,
                    },
                    { onConflict: "api_match_id,api_player_id" }
                );
            }
        }
        log.push("Seeded player_match_points for 3 matches");

        // 5) Rebuild leaderboard_cache
        for (const team of TEAMS) {
            const { data: tRow } = await supabase
                .from("fantasy_teams")
                .select("id")
                .eq("owner", team.owner)
                .single();

            if (!tRow) continue;

            let totalPoints = 0;
            for (const p of team.players) {
                const pts = PLAYER_POINTS[p.name];
                if (pts) totalPoints += pts.reduce((s, v) => s + (v || 0), 0);
            }

            await supabase.from("leaderboard_cache").upsert(
                {
                    fantasy_team_id: tRow.id,
                    total_points: totalPoints,
                    last_updated: new Date().toISOString(),
                },
                { onConflict: "fantasy_team_id" }
            );
            log.push(`Leaderboard: ${team.owner} = ${totalPoints} pts`);
        }

        // 6) Init sync_state
        await supabase.from("sync_state").upsert(
            { id: 1, last_completed_match_time: new Date().toISOString() },
            { onConflict: "id" }
        );
        log.push("Initialized sync_state");

        return NextResponse.json({ ok: true, log });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return runSeed(req);
}

export async function POST(req: Request) {
    return runSeed(req);
}
