-- Humor Memory Game - Seed Data
-- This file populates the database with sample data for testing and demo

-- Insert sample users with funny usernames
INSERT INTO users (username, email, display_name, total_games, total_score, best_score, best_time, last_played) VALUES
    ('memorymaster42', 'master@example.com', '🧠 Memory Master', 15, 2340, 200, 45000, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    ('cardshark_jenny', 'jenny@example.com', '🦈 Card Shark Jenny', 12, 1890, 180, 52000, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('emoji_ninja', 'ninja@example.com', '🥷 Emoji Ninja', 8, 1440, 190, 48000, CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    ('laugh_machine', 'laugh@example.com', '😂 Laugh Machine', 20, 2800, 175, 55000, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
    ('puzzle_pirate', 'pirate@example.com', '🏴‍☠️ Puzzle Pirate', 6, 780, 150, 62000, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('memory_mango', 'mango@example.com', '🥭 Memory Mango', 10, 1500, 165, 58000, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
    ('giggle_guru', 'guru@example.com', '🤓 Giggle Guru', 18, 2520, 185, 47000, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    ('chuckle_champ', 'champ@example.com', '🏆 Chuckle Champ', 14, 2100, 170, 51000, CURRENT_TIMESTAMP - INTERVAL '4 hours')
ON CONFLICT (username) DO NOTHING;

-- Insert sample completed games
INSERT INTO games (user_id, username, score, moves, time_elapsed, cards_matched, difficulty_level, game_completed, started_at, completed_at, game_data) VALUES
    -- Memory Master's games
    ((SELECT id FROM users WHERE username = 'memorymaster42'), 'memorymaster42', 200, 16, 45000, 8, 'easy', true, CURRENT_TIMESTAMP - INTERVAL '2 hours 15 minutes', CURRENT_TIMESTAMP - INTERVAL '2 hours', '{"difficulty": "easy", "cards": 16, "perfect_game": true}'),
    ((SELECT id FROM users WHERE username = 'memorymaster42'), 'memorymaster42', 185, 18, 48000, 8, 'easy', true, CURRENT_TIMESTAMP - INTERVAL '1 day 2 hours', CURRENT_TIMESTAMP - INTERVAL '1 day 1 hour 59 minutes', '{"difficulty": "easy", "cards": 16}'),
    
    -- Card Shark Jenny's games
    ((SELECT id FROM users WHERE username = 'cardshark_jenny'), 'cardshark_jenny', 180, 20, 52000, 8, 'medium', true, CURRENT_TIMESTAMP - INTERVAL '1 day 30 minutes', CURRENT_TIMESTAMP - INTERVAL '1 day 29 minutes', '{"difficulty": "medium", "cards": 20}'),
    ((SELECT id FROM users WHERE username = 'cardshark_jenny'), 'cardshark_jenny', 165, 22, 58000, 8, 'medium', true, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days', '{"difficulty": "medium", "cards": 20}'),
    
    -- Emoji Ninja's games
    ((SELECT id FROM users WHERE username = 'emoji_ninja'), 'emoji_ninja', 190, 17, 48000, 8, 'easy', true, CURRENT_TIMESTAMP - INTERVAL '3 hours 10 minutes', CURRENT_TIMESTAMP - INTERVAL '3 hours 9 minutes', '{"difficulty": "easy", "cards": 16, "ninja_mode": true}'),
    
    -- Laugh Machine's games
    ((SELECT id FROM users WHERE username = 'laugh_machine'), 'laugh_machine', 175, 19, 55000, 8, 'easy', true, CURRENT_TIMESTAMP - INTERVAL '45 minutes', CURRENT_TIMESTAMP - INTERVAL '44 minutes', '{"difficulty": "easy", "cards": 16, "laughs_recorded": 47}'),
    ((SELECT id FROM users WHERE username = 'laugh_machine'), 'laugh_machine', 160, 24, 61000, 8, 'medium', true, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour 59 minutes', '{"difficulty": "medium", "cards": 20}')
ON CONFLICT DO NOTHING;

-- Insert sample game matches for the completed games
DO $$
DECLARE 
    game_record RECORD;
    match_count INTEGER;
    current_time INTEGER;
BEGIN
    -- For each completed game, create sample matches
    FOR game_record IN 
        SELECT id, time_elapsed, cards_matched FROM games WHERE game_completed = true
    LOOP
        current_time := 5000; -- Start matches at 5 seconds
        
        -- Create matches for each game (8 matches for 16 cards)
        FOR match_count IN 1..game_record.cards_matched LOOP
            INSERT INTO game_matches (game_id, card1_id, card2_id, match_time, points_earned, bonus_points)
            VALUES (
                game_record.id,
                'card_' || (match_count * 2 - 1),
                'card_' || (match_count * 2),
                current_time,
                10,
                CASE WHEN current_time < 10000 THEN 5 ELSE 0 END -- Bonus for quick matches
            );
            
            current_time := current_time + (game_record.time_elapsed / game_record.cards_matched);
        END LOOP;
    END LOOP;
END $$;

-- Create some sample active (incomplete) games for testing
INSERT INTO games (user_id, username, score, moves, time_elapsed, cards_matched, difficulty_level, game_completed, started_at, game_data) VALUES
    ((SELECT id FROM users WHERE username = 'puzzle_pirate'), 'puzzle_pirate', 40, 8, 25000, 2, 'easy', false, CURRENT_TIMESTAMP - INTERVAL '25 seconds', '{"difficulty": "easy", "cards": 16, "current_matches": 2}'),
    ((SELECT id FROM users WHERE username = 'memory_mango'), 'memory_mango', 60, 12, 35000, 3, 'medium', false, CURRENT_TIMESTAMP - INTERVAL '35 seconds', '{"difficulty": "medium", "cards": 20, "current_matches": 3}')
ON CONFLICT DO NOTHING;

-- Verify the data was inserted correctly
DO $$
DECLARE
    user_count INTEGER;
    game_count INTEGER;
    match_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO game_count FROM games;
    SELECT COUNT(*) INTO match_count FROM game_matches;
    
    RAISE NOTICE '🎮 Database seeded successfully!';
    RAISE NOTICE '👥 Users created: %', user_count;
    RAISE NOTICE '🎯 Games created: %', game_count;
    RAISE NOTICE '🃏 Matches created: %', match_count;
    RAISE NOTICE '';
    RAISE NOTICE '🏆 Top 3 Players:';
    
    -- Show top 3 players
    FOR i IN (
        SELECT username, best_score, total_games 
        FROM leaderboard 
        LIMIT 3
    ) LOOP
        RAISE NOTICE '   % - Best Score: % (% games)', i.username, i.best_score, i.total_games;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✨ Ready to start playing! Visit http://localhost:3000 🚀';
END $$;