import express from 'express';
import pool from '../db.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get words by difficulty
router.get('/words/:difficulty', async (req, res) => {
  const { difficulty } = req.params;

const wordBanks = {
  easy: [
      { word: 'APPLE', hint: 'A common fruit' },
      { word: 'BALL', hint: 'Round toy' },
      { word: 'CHAIR', hint: 'Furniture to sit on' },
      { word: 'WATER', hint: 'Essential drink' },
      { word: 'PHONE', hint: 'Communication device' },
      { word: 'BREAD', hint: 'Used for sandwiches' },
      { word: 'TIGER', hint: 'Striped animal' },
      { word: 'PLANE', hint: 'Flies in the sky' },
      { word: 'SHIRT', hint: 'Upper clothing' },
      { word: 'SPOON', hint: 'Used for eating' },
      { word: 'MOUSE', hint: 'Small rodent' },
      { word: 'TABLE', hint: 'Used for eating' },
      { word: 'SNAKE', hint: 'Legless reptile' },
      { word: 'PIZZA', hint: 'Cheesy food' },
      { word: 'CLOUD', hint: 'Floats in the sky' },
      { word: 'GRASS', hint: 'Green plant' },
      { word: 'CLOCK', hint: 'Shows time' },
      { word: 'BEACH', hint: 'Sandy place' },
      { word: 'DRINK', hint: 'Opposite of eat' },
      { word: 'HORSE', hint: 'Fast animal' },
      { word: 'HONEY', hint: 'Made by bees' },
      { word: 'TRUCK', hint: 'Large vehicle' },
      { word: 'EARTH', hint: 'Our planet' },
      { word: 'LIGHT', hint: 'Opposite of dark' },
      { word: 'SMILE', hint: 'Happy expression' },
      { word: 'CAMP', hint: 'Outdoor stay' },
      { word: 'HOUSE', hint: 'Place to live' },
      { word: 'MOVIE', hint: 'You watch it' },
      { word: 'SUGAR', hint: 'Sweet powder' },
      { word: 'LEMON', hint: 'Sour fruit' },
      { word: 'ONION', hint: 'Makes you cry' },
      { word: 'MANGO', hint: 'Tropical fruit' },
      { word: 'PLANT', hint: 'Needs sunlight' },
      { word: 'FISH', hint: 'Lives in water' },
      { word: 'BABY', hint: 'Young child' },
      { word: 'JUICE', hint: 'Fruit drink' },
      { word: 'ZEBRA', hint: 'Striped animal' },
      { word: 'BALLOON', hint: 'Filled with air' },
      { word: 'FLOWER', hint: 'Blooms petals' },
      { word: 'ROAD', hint: 'Vehicles move on it' },
      { word: 'KITE', hint: 'Flies with wind' },
      { word: 'BOOK', hint: 'Used for reading' },
      { word: 'STAR', hint: 'Shines at night' },
      { word: 'SOAP', hint: 'Used for washing' },
      { word: 'MILK', hint: 'White drink' },
      { word: 'DOLL', hint: 'Toy figure' },
      { word: 'BRUSH', hint: 'Used for cleaning' },
      { word: 'BOAT', hint: 'Moves on water' },
      { word: 'BUS', hint: 'Public vehicle' },
      { word: 'SUN', hint: 'Star of our system' },
      { word: 'CAT', hint: 'Pet animal' },
      { word: 'DOG', hint: 'Loyal pet' },
      { word: 'PEN', hint: 'Used for writing' },
      { word: 'HAT', hint: 'Worn on head' },
      { word: 'RING', hint: 'Circle jewelry' },
      { word: 'KEY', hint: 'Opens lock' },
      { word: 'BED', hint: 'Used for sleeping' },
      { word: 'FAN', hint: 'Gives air' },
      { word: 'RAIN', hint: 'Falling water' },
      { word: 'MOON', hint: 'Earth\'s satellite' },
      { word: 'ICE', hint: 'Frozen water' },
      { word: 'GOLD', hint: 'Precious metal' },
      { word: 'CUP', hint: 'Holds liquid' },
      { word: 'BOX', hint: 'Square container' },
      { word: 'BAG', hint: 'Used to carry items' },
      { word: 'MAP', hint: 'Shows places' },
      { word: 'CODE', hint: 'Secret message' },
      { word: 'CAR', hint: 'Four-wheel vehicle' },
      { word: 'GATE', hint: 'Entrance barrier' },
      { word: 'COW', hint: 'Farm animal' },
      { word: 'GOAT', hint: 'Horned animal' },
      { word: 'PIG', hint: 'Pink farm animal' },
      { word: 'SHOE', hint: 'Worn on feet' },
      { word: 'TREE', hint: 'Tall plant' },
      { word: 'LEAF', hint: 'Part of a plant' },
      { word: 'POT', hint: 'Cooking container' },
      { word: 'PAN', hint: 'Flat cooker' },
      { word: 'KNIFE', hint: 'Cutting tool' },
      { word: 'HILL', hint: 'Small elevation' },
      { word: 'LAMP', hint: 'Gives light' },
      { word: 'DOOR', hint: 'Entrance panel' },
      { word: 'WALL', hint: 'Divider structure' },
      { word: 'SHOP', hint: 'Place to buy' },
      { word: 'EGG', hint: 'Oval food' },
      { word: 'CORN', hint: 'Yellow crop' },
      { word: 'RICE', hint: 'Staple food' },
      { word: 'WORM', hint: 'Small creature' },
      { word: 'GLUE', hint: 'Sticky material' },
      { word: 'ROPE', hint: 'Strong cord' },
      { word: 'POND', hint: 'Small waterbody' },
      { word: 'DESK', hint: 'Work table' },
      { word: 'GIFT', hint: 'A present' },
      { word: 'NEST', hint: 'Bird home' },
      { word: 'STICK', hint: 'Piece of wood' }
    ],

      medium: [
        { word: 'BUTTERFLY', hint: 'Colorful insect' },
        { word: 'COMPUTER', hint: 'Electronic device' },
        { word: 'MOUNTAIN', hint: 'High landform' },
        { word: 'HOSPITAL', hint: 'Medical facility' },
        { word: 'ELEPHANT', hint: 'Large mammal' },
        { word: 'CALENDAR', hint: 'Tracks dates' },
        { word: 'QUESTION', hint: 'Seeks an answer' },
        { word: 'TREASURE', hint: 'Valuable items' },
        { word: 'KEYBOARD', hint: 'Input device' },
        { word: 'LANGUAGE', hint: 'Form of communication' },
        { word: 'LIBRARY', hint: 'Place with books' },
        { word: 'BATTERY', hint: 'Stores power' },
        { word: 'COMPASS', hint: 'Shows direction' },
        { word: 'FESTIVAL', hint: 'Celebration event' },
        { word: 'PRINTER', hint: 'Prints documents' },
        { word: 'KINGDOM', hint: 'Ruled land' },
        { word: 'VOLCANO', hint: 'Erupts lava' },
        { word: 'STATION', hint: 'Transport stop' },
        { word: 'PYRAMID', hint: 'Triangular monument' },
        { word: 'CEILING', hint: 'Top of room' },
        { word: 'BLANKET', hint: 'Keeps you warm' },
        { word: 'NETWORK', hint: 'Connected system' },
        { word: 'DIAMOND', hint: 'Precious stone' },
        { word: 'PASSPORT', hint: 'Travel document' },
        { word: 'LANTERN', hint: 'Portable light' },
        { word: 'CHAMBER', hint: 'Enclosed room' },
        { word: 'HIGHWAY', hint: 'Major road' },
        { word: 'MONITOR', hint: 'Computer screen' },
        { word: 'LUGGAGE', hint: 'Travel bags' },
        { word: 'TUNNEL', hint: 'Underground path' },
        { word: 'CRYSTAL', hint: 'Clear mineral' },
        { word: 'COURAGE', hint: 'Bravery' },
        { word: 'SCULPTURE', hint: 'Carved art' },
        { word: 'WARRIOR', hint: 'Skilled fighter' },
        { word: 'CURTAIN', hint: 'Window cover' },
        { word: 'LECTURE', hint: 'Educational talk' },
        { word: 'AQUARIUM', hint: 'Fish tank' },
        { word: 'COTTAGE', hint: 'Small house' },
        { word: 'GRAVITY', hint: 'Pulling force' },
        { word: 'RECYCLE', hint: 'Reuse materials' },
        { word: 'VITAMIN', hint: 'Essential nutrient' },
        { word: 'ANTENNA', hint: 'Signal receiver' },
        { word: 'THRILLER', hint: 'Suspense story' },
        { word: 'PERFUME', hint: 'Scented liquid' },
        { word: 'STADIUM', hint: 'Sports venue' },
        { word: 'PACKAGE', hint: 'Wrapped item' },
        { word: 'PREDATOR', hint: 'Hunts prey' },
        { word: 'SURFACE', hint: 'Outer layer' },
        { word: 'ECLIPSE', hint: 'Shadow event' },
        { word: 'TURBINE', hint: 'Rotating engine' },
        { word: 'GLACIER', hint: 'Moving ice' },
        { word: 'WORKSHOP', hint: 'Training session' },
        { word: 'ARCHIVE', hint: 'Stored records' },
        { word: 'MINERAL', hint: 'Natural solid' },
        { word: 'DENSITY', hint: 'Compactness' },
        { word: 'FRICTION', hint: 'Resistance force' },
        { word: 'HABITAT', hint: 'Living environment' },
        { word: 'NUCLEUS', hint: 'Center part' },
        { word: 'TEXTURE', hint: 'Surface feel' },
        { word: 'FORTRESS', hint: 'Strong defense' },
        { word: 'ORCHARD', hint: 'Fruit farm' },
        { word: 'HORIZON', hint: 'Visible edge' },
        { word: 'SPIRAL', hint: 'Winding shape' },
        { word: 'DROUGHT', hint: 'Lack of rain' },
        { word: 'EMBASSY', hint: 'Diplomatic office' },
        { word: 'CIRCUIT', hint: 'Closed path' },
        { word: 'HYBRID', hint: 'Mixed type' },
        { word: 'LAGOON', hint: 'Shallow water' },
        { word: 'MEADOW', hint: 'Open field' },
        { word: 'ORBIT', hint: 'Circular path' },
        { word: 'RADIUS', hint: 'Half diameter' },
        { word: 'FURNACE', hint: 'Heating device' },
        { word: 'POLLEN', hint: 'Flower dust' },
        { word: 'REMEDY', hint: 'Cure method' },
        { word: 'SEGMENT', hint: 'Part of whole' },
        { word: 'TRANSIT', hint: 'Movement' },
        { word: 'TETHER', hint: 'Restraining rope' },
        { word: 'DYNASTY', hint: 'Family rule' },
        { word: 'DRIZZLE', hint: 'Light rain' },
        { word: 'GARMENT', hint: 'Clothing item' },
        { word: 'SERMON', hint: 'Religious speech' },
        { word: 'CANYON', hint: 'Deep valley' },
        { word: 'HARBOR', hint: 'Ship docking place' },
        { word: 'MARBLE', hint: 'Smooth stone' },
        { word: 'NECTAR', hint: 'Sweet liquid' },
        { word: 'POULTRY', hint: 'Farm birds' },
        { word: 'TIMBER', hint: 'Processed wood' },
        { word: 'VACUUM', hint: 'Empty space' },
        { word: 'VERDICT', hint: 'Final judgment' },
        { word: 'WILLOW', hint: 'Flexible tree' },
        { word: 'VOYAGE', hint: 'Long journey' }
      ],

        hard: [
          { word: 'ACHIEVEMENT', hint: 'Accomplishment' },
          { word: 'PSYCHOLOGY', hint: 'Study of mind' },
          { word: 'PHILOSOPHY', hint: 'Study of wisdom' },
          { word: 'ATMOSPHERE', hint: 'Layer of gases' },
          { word: 'TECHNOLOGY', hint: 'Modern innovation' },
          { word: 'INCREDIBLE', hint: 'Hard to believe' },
          { word: 'THROUGHOUT', hint: 'From start to end' },
          { word: 'VOCABULARY', hint: 'Collection of words' },
          { word: 'MYSTERIOUS', hint: 'Full of mystery' },
          { word: 'BENEFICIAL', hint: 'Providing advantage' },
          { word: 'PHOTOSYNTHESIS', hint: 'Plant energy process' },
          { word: 'BIOLUMINESCENCE', hint: 'Organisms glowing' },
          { word: 'METAMORPHOSIS', hint: 'Transformation' },
          { word: 'HALLUCINATION', hint: 'False perception' },
          { word: 'TRANSCRIPTION', hint: 'DNA copying process' },
          { word: 'CONSTELLATION', hint: 'Star grouping' },
          { word: 'SYNCHRONIZATION', hint: 'Same timing' },
          { word: 'GEOTHERMAL', hint: 'Earth heat' },
          { word: 'CATASTROPHIC', hint: 'Disastrous event' },
          { word: 'FERMENTATION', hint: 'Chemical breakdown' },
          { word: 'CONDUCTIVITY', hint: 'Energy flow ability' },
          { word: 'DIFFRACTION', hint: 'Light bending' },
          { word: 'EQUILIBRIUM', hint: 'Balanced state' },
          { word: 'PRECIPITATION', hint: 'Rainfall process' },
          { word: 'PHOTOVOLTAIC', hint: 'Solar energy' },
          { word: 'NEUROTRANSMITTER', hint: 'Brain chemical' },
          { word: 'JURISPRUDENCE', hint: 'Legal theory' },
          { word: 'SUPERSTITIOUS', hint: 'Belief in luck' },
          { word: 'BIOTECHNOLOGY', hint: 'Bio-based innovation' },
          { word: 'QUANTIFICATION', hint: 'Making measurable' },
          { word: 'BIODEGRADABLE', hint: 'Breaks naturally' },
          { word: 'TRIANGULATION', hint: 'Three-point method' },
          { word: 'LEXICALIZATION', hint: 'Word formation' },
          { word: 'DECIPHERABLE', hint: 'Can be decoded' },
          { word: 'HYPERSENSITIVE', hint: 'Over reactive' },
          { word: 'PERPENDICULAR', hint: '90-degree angle' },
          { word: 'PERSEVERANCE', hint: 'Continued effort' },
          { word: 'PROLIFERATION', hint: 'Rapid increase' },
          { word: 'METEOROLOGIST', hint: 'Weather scientist' },
          { word: 'SUSCEPTIBILITY', hint: 'Vulnerability' },
          { word: 'VENTRILOQUISM', hint: 'Voice illusion' },
          { word: 'IRREPLACEABLE', hint: 'Cannot be replaced' },
          { word: 'MISINTERPRETATION', hint: 'Wrong understanding' },
          { word: 'INTERCONTINENTAL', hint: 'Across continents' },
          { word: 'DECENTRALIZATION', hint: 'Distributed control' },
          { word: 'INTROSPECTION', hint: 'Self-analysis' },
          { word: 'MAGNIFICATION', hint: 'Enlargement' },
          { word: 'ANTIOXIDATION', hint: 'Prevents reactive damage' },
          { word: 'MONOLITHIC', hint: 'Large and uniform' },
          { word: 'TRANSCENDENTAL', hint: 'Beyond ordinary' },
          { word: 'MICROBIOLOGY', hint: 'Study of microbes' },
          { word: 'TELECOMMUNICATIONS', hint: 'Long-distance communication' },
          { word: 'CONGLOMERATION', hint: 'Clustered group' },
          { word: 'INDISTINGUISHABLE', hint: 'Hard to tell apart' },
          { word: 'FRAGMENTATION', hint: 'Breaking apart' },
          { word: 'CHRONOLOGICAL', hint: 'Time ordered' },
          { word: 'UNCOMPROMISING', hint: 'Strict stance' },
          { word: 'MISCALCULATION', hint: 'Incorrect estimate' },
          { word: 'INCOMPATIBILITY', hint: 'Cannot work together' },
          { word: 'EXTRATERRESTRIAL', hint: 'Outside Earth' },
          { word: 'ANTHROPOLOGICAL', hint: 'Human-related study' },
          { word: 'COMPUTATIONAL', hint: 'Computer based' },
          { word: 'EVAPORATION', hint: 'Turning to vapor' },
          { word: 'SUPERSONIC', hint: 'Faster than sound' },
          { word: 'IRRECOVERABLE', hint: 'Cannot be restored' },
          { word: 'DISPROPORTIONATE', hint: 'Uneven ratio' },
          { word: 'UNFORESEEABLE', hint: 'Unpredictable' },
          { word: 'MICROPROCESSOR', hint: 'CPU chip' },
          { word: 'IMMUNIZATION', hint: 'Protection from disease' },
          { word: 'LABYRINTHINE', hint: 'Extremely complex' },
          { word: 'PREMEDITATION', hint: 'Planned action' },
          { word: 'RECONNAISSANCE', hint: 'Scouting mission' },
          { word: 'REVOLUTIONARY', hint: 'Major change' },
          { word: 'HALLUCINOGENIC', hint: 'Causes hallucinations' },
          { word: 'ATMOSPHERIC', hint: 'Air-related' },
          { word: 'ELECTRIFICATION', hint: 'Adding electricity' },
          { word: 'BIODEGRADATION', hint: 'Natural breakdown' },
          { word: 'RECONFIGURATION', hint: 'Rearrangement' },
          { word: 'TRANSPLANTATION', hint: 'Organ transfer' },
          { word: 'INTERDEPENDENT', hint: 'Mutually reliant' },
          { word: 'DEMATERIALIZED', hint: 'No physical form' },
          { word: 'DEFRAGMENTATION', hint: 'Data organizing' },
          { word: 'COUNTERPRODUCTIVE', hint: 'Backfiring effect' },
          { word: 'REDISTRIBUTION', hint: 'Spreading again' },
          { word: 'UNDERESTIMATION', hint: 'Too low guess' },
          { word: 'SENSATIONALISM', hint: 'Exaggerated reporting' },
          { word: 'POSTHUMOUSLY', hint: 'After death' },
          { word: 'STRATIFICATION', hint: 'Layered structure' },
          { word: 'PSYCHOLOGICAL', hint: 'Mind-related' },
          { word: 'REMINISCENCE', hint: 'Memory recall' },
          { word: 'THERMODYNAMIC', hint: 'Heat-energy study' },
          { word: 'COMPARTMENTALIZE', hint: 'Separate into sections' },
          { word: 'DISORIENTATION', hint: 'Loss of direction' },
          { word: 'TRANSCONTINENTAL', hint: 'Across continents' },
          { word: 'INDUSTRIALIZATION', hint: 'Industry growth' },
          { word: 'PHOTOSYNTHETIC', hint: 'Relating to plant energy' },
          { word: 'CHARACTERISTICALLY', hint: 'Typically' },
          { word: 'MISCOMMUNICATION', hint: 'Failed communication' }
        ]
};

if (!wordBanks[difficulty]) {
  return res.status(400).json({ error: 'Invalid difficulty' });
}

res.json({ words: wordBanks[difficulty] });
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT * FROM leaderboard_stats
      ORDER BY total_score DESC
      LIMIT 50
    `);
    res.json({ leaderboard: rows.rows });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game rooms
router.get('/rooms', optionalAuth, async (req, res) => {
  try {
    const rooms = await pool.query(`
      SELECT gr.*, p.username as creator_name,
             COUNT(gp.id) as player_count
      FROM game_rooms gr
      LEFT JOIN profiles p ON gr.created_by = p.id
      LEFT JOIN game_participants gp ON gr.id = gp.room_id
      WHERE gr.status = 'waiting'
      GROUP BY gr.id, p.username
      ORDER BY gr.created_at DESC
    `);
    res.json({ rooms: rooms.rows });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create game room
router.post('/rooms', authenticateToken, async (req, res) => {
  const { difficulty } = req.body;
  const userId = req.user.id;

  try {
    // Generate unique 4-digit numeric room code
    let roomCode;
    let exists = true;
    while (exists) {
      roomCode = Math.floor(1000 + Math.random() * 9000).toString();
      const check = await pool.query(
        'SELECT id FROM game_rooms WHERE room_code = $1',
        [roomCode]
      );
      exists = check.rows.length > 0;
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      'INSERT INTO game_rooms (id, room_code, created_by, difficulty) VALUES ($1, $2, $3, $4)',
      [roomId, roomCode, userId, difficulty]
    );

    res.status(201).json({ roomId, roomCode });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join game room
router.post('/rooms/:roomId/join', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { playerName } = req.body;
  const userId = req.user.id;

  try {
    // Check if room exists and is waiting
    const rooms = await pool.query(
      'SELECT * FROM game_rooms WHERE id = $1 AND status = $2',
      [roomId, 'waiting']
    );

    if (rooms.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or not available' });
    }

    // Check current participant count
    const participantCount = await pool.query(
      'SELECT COUNT(*) as count FROM game_participants WHERE room_id = $1',
      [roomId]
    );

    if (participantCount.rows[0].count >= 2) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if user is already in the room
    const existing = await pool.query(
      'SELECT id FROM game_participants WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already joined this room' });
    }

    // Join room
    const participantId = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await pool.query(
      'INSERT INTO game_participants (id, room_id, user_id, player_name) VALUES ($1, $2, $3, $4)',
      [participantId, roomId, userId, playerName]
    );

    // Get updated participants and broadcast to room
    const updatedParticipants = await pool.query(`
      SELECT gp.id, gp.player_name, gp.is_ready, gp.user_id
      FROM game_participants gp
      WHERE gp.room_id = $1
      ORDER BY gp.joined_at
    `, [roomId]);

    const io = req.app.get('io');
    io.to(roomId).emit('participantsUpdated', updatedParticipants.rows);

    res.json({ participantId });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ready status
router.patch('/rooms/:roomId/ready', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { is_ready } = req.body;
  const userId = req.user.id;

  try {
    await pool.query(
      'UPDATE game_participants SET is_ready = $1 WHERE room_id = $2 AND user_id = $3',
      [is_ready, roomId, userId]
    );

    // Get updated participants and broadcast to room
    const updatedParticipants = await pool.query(`
      SELECT gp.id, gp.player_name, gp.is_ready, gp.user_id
      FROM game_participants gp
      WHERE gp.room_id = $1
      ORDER BY gp.joined_at
    `, [roomId]);

    const io = req.app.get('io');
    io.to(roomId).emit('participantsUpdated', updatedParticipants.rows);

    res.json({ success: true });
  } catch (error) {
    console.error('Update ready status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start game
router.post('/rooms/:roomId/start', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user is the creator
    const rooms = await pool.query(
      'SELECT created_by FROM game_rooms WHERE id = $1',
      [roomId]
    );

    if (rooms.rows.length === 0 || rooms.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Only room creator can start the game' });
    }

    // Check if all players are ready
    const participants = await pool.query(`
      SELECT COUNT(*)::int AS total,
             COALESCE(SUM(CASE WHEN is_ready = TRUE THEN 1 ELSE 0 END), 0)::int AS ready
      FROM game_participants
      WHERE room_id = $1
    `, [roomId]);

    if (participants.rows[0].total !== participants.rows[0].ready || participants.rows[0].total < 2) {
      return res.status(400).json({ error: 'All players must be ready and at least 2 players required' });
    }

    // Start game
    await pool.query(
      'UPDATE game_rooms SET status = $1, started_at = NOW() WHERE id = $2',
      ['active', roomId]
    );

    // Get room difficulty
    const roomData = await pool.query(
      'SELECT difficulty FROM game_rooms WHERE id = $1',
      [roomId]
    );

    const difficulty = roomData.rows[0]?.difficulty || 'easy';

    // Word banks and scramble function
    const wordBanks = {
      easy: [
        { word: 'APPLE', hint: 'A common fruit' },
        { word: 'HOUSE', hint: 'A place to live' },
        { word: 'WATER', hint: 'Essential for life' },
        { word: 'MUSIC', hint: 'Sound that entertains' },
        { word: 'LIGHT', hint: 'Opposite of dark' },
        { word: 'HAPPY', hint: 'A positive emotion' },
        { word: 'PHONE', hint: 'Communication device' },
        { word: 'CHAIR', hint: 'Furniture to sit on' },
        { word: 'PAPER', hint: 'Used for writing' },
        { word: 'CLOUD', hint: 'Floats in the sky' },
      ],
      medium: [
        { word: 'BUTTERFLY', hint: 'Colorful insect' },
        { word: 'COMPUTER', hint: 'Electronic device' },
        { word: 'MOUNTAIN', hint: 'High landform' },
        { word: 'HOSPITAL', hint: 'Medical facility' },
        { word: 'ELEPHANT', hint: 'Large mammal' },
        { word: 'CALENDAR', hint: 'Tracks dates' },
        { word: 'QUESTION', hint: 'Seeks an answer' },
        { word: 'TREASURE', hint: 'Valuable items' },
        { word: 'KEYBOARD', hint: 'Input device' },
        { word: 'LANGUAGE', hint: 'Form of communication' },
      ],
      hard: [
        { word: 'ACHIEVEMENT', hint: 'Accomplishment' },
        { word: 'PSYCHOLOGY', hint: 'Study of mind' },
        { word: 'PHILOSOPHY', hint: 'Study of wisdom' },
        { word: 'ATMOSPHERE', hint: 'Layer of gases' },
        { word: 'TECHNOLOGY', hint: 'Modern innovation' },
        { word: 'INCREDIBLE', hint: 'Hard to believe' },
        { word: 'THROUGHOUT', hint: 'From start to end' },
        { word: 'VOCABULARY', hint: 'Collection of words' },
        { word: 'MYSTERIOUS', hint: 'Full of mystery' },
        { word: 'BENEFICIAL', hint: 'Providing advantage' },
      ]
    };

    const scrambleWord = (word) => {
      const letters = word.split('');
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      const scrambled = letters.join('');
      return scrambled === word ? scrambleWord(word) : scrambled;
    };

    // Send response immediately
    res.json({ success: true });

    // Emit countdown and first word via socket.io (non-blocking)
    const io = req.app.get('io');

    // Send initial "get ready" event
    io.to(roomId).emit('gameStarting');

    // Send countdown: 3, 2, 1
    setTimeout(() => {
      io.to(roomId).emit('countdown', { countdown: 3 });
    }, 100);

    setTimeout(() => {
      io.to(roomId).emit('countdown', { countdown: 2 });
    }, 1100);

    setTimeout(() => {
      io.to(roomId).emit('countdown', { countdown: 1 });
    }, 2100);

    // Send first word after countdown finishes
    setTimeout(() => {
      const words = wordBanks[difficulty] || wordBanks.easy;
      const randomIndex = Math.floor(Math.random() * words.length);
      const wordItem = words[randomIndex];
      const scrambled = scrambleWord(wordItem.word);

      io.to(roomId).emit('newWord', {
        word: wordItem.word,
        hint: wordItem.hint,
        scrambled: scrambled,
        round: 1
      });
    }, 3100);
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit answer
router.post('/rooms/:roomId/answer', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { word, isCorrect, points } = req.body;
  const userId = req.user.id;

  try {
    // Record the event
    await pool.query(
      'INSERT INTO game_events (room_id, user_id, event_type, current_word, is_correct, points_earned) VALUES ($1, $2, $3, $4, $5, $6)',
      [roomId, userId, 'answer_submitted', word, isCorrect, points]
    );

    // Update score if correct
    if (isCorrect) {
      await pool.query(
        'UPDATE game_participants SET score = score + $1, current_streak = current_streak + 1 WHERE room_id = $2 AND user_id = $3',
        [points, roomId, userId]
      );
    } else {
      await pool.query(
        'UPDATE game_participants SET current_streak = 0 WHERE room_id = $1 AND user_id = $2',
        [roomId, userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get room details
router.get('/rooms/:roomId', optionalAuth, async (req, res) => {
  const { roomId } = req.params;

  try {
    const rooms = await pool.query(`
      SELECT gr.*, p.username as creator_name
      FROM game_rooms gr
      LEFT JOIN profiles p ON gr.created_by = p.id
      WHERE gr.id = $1
    `, [roomId]);

    if (rooms.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const participants = await pool.query(`
      SELECT gp.id, COALESCE(gp.player_name, p.username) as player_name, gp.is_ready, gp.user_id
      FROM game_participants gp
      LEFT JOIN profiles p ON gp.user_id = p.id
      WHERE gp.room_id = $1
      ORDER BY gp.joined_at
    `, [roomId]);

    res.json({
      room: rooms.rows[0],
      participants: participants.rows
    });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get participants for a room
router.get('/participants/:roomId', optionalAuth, async (req, res) => {
  const { roomId } = req.params;

  try {
    const participants = await pool.query(`
      SELECT gp.*, p.username, p.avatar_url
      FROM game_participants gp
      LEFT JOIN profiles p ON gp.user_id = p.id
      WHERE gp.room_id = $1
      ORDER BY gp.score DESC
    `, [roomId]);

    res.json(participants.rows);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update participant
router.put('/participants/:participantId', authenticateToken, async (req, res) => {
  const { participantId } = req.params;
  const { score, current_streak } = req.body;

  try {
    await pool.query(
      'UPDATE game_participants SET score = $1, current_streak = $2 WHERE id = $3',
      [score, current_streak, participantId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Log game event
router.post('/events', authenticateToken, async (req, res) => {
  const { roomId, userId, word, isCorrect, points } = req.body;

  const room_id = roomId;
  const user_id = userId;
  const current_word = word;
  const is_correct = isCorrect;
  const points_earned = points;

  const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    await pool.query(
      `INSERT INTO game_events (id, room_id, user_id, event_type, current_word, is_correct, points_earned)
       VALUES ($1, $2, $3, 'answer_submitted', $4, $5, $6)`,
      [eventId, room_id, user_id, current_word, is_correct, points_earned]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Log event error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/rooms/:roomId', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { status, finished_at } = req.body;

  try {
    await pool.query(
      'UPDATE game_rooms SET status = $1, finished_at = $2 WHERE id = $3',
      [status, finished_at, roomId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update room status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
