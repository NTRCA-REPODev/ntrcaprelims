const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost/examdb',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Admin token
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin_secret_token';

// Admin middleware
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// User middleware
const requireUser = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    req.user = result.rows[0];
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
};

// Routes

// POST /register
app.post('/register', async (req, res) => {
  try {
    const { name, district } = req.body;
    
    if (!name || !district) {
      return res.status(400).json({ error: 'Name and district are required' });
    }

    const result = await pool.query(
      'INSERT INTO users (name, district) VALUES ($1, $2) RETURNING id',
      [name, district]
    );

    res.json({ userId: result.rows[0].id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /me
app.get('/me', requireUser, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    district: req.user.district,
    createdAt: req.user.created_at
  });
});

// GET /exams
app.get('/exams', async (req, res) => {
  try {
    const now = new Date();
    const result = await pool.query(`
      SELECT id, title, description, start_time, end_time, marks_per_question
      FROM exams 
      WHERE end_time > $1
      ORDER BY start_time ASC
    `, [now]);

    const exams = result.rows.map(exam => ({
      ...exam,
      status: new Date(exam.start_time) > now ? 'upcoming' : 'active'
    }));

    res.json(exams);
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// GET /exams/:id
app.get('/exams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, title, description, start_time, end_time, marks_per_question
      FROM exams WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = result.rows[0];
    const now = new Date();
    
    res.json({
      ...exam,
      status: new Date(exam.start_time) > now ? 'upcoming' : 
              new Date(exam.end_time) < now ? 'ended' : 'active'
    });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

// GET /exams/:id/questions
app.get('/exams/:id/questions', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if exam is active
    const examResult = await pool.query(`
      SELECT start_time, end_time FROM exams WHERE id = $1
    `, [id]);

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examResult.rows[0];
    const now = new Date();
    
    if (new Date(exam.start_time) > now) {
      return res.status(400).json({ error: 'Exam has not started yet' });
    }
    
    if (new Date(exam.end_time) < now) {
      return res.status(400).json({ error: 'Exam has ended' });
    }

    // Check if user already submitted
    const attemptResult = await pool.query(`
      SELECT id FROM attempts WHERE user_id = $1 AND exam_id = $2
    `, [req.user.id, id]);

    if (attemptResult.rows.length > 0) {
      return res.status(400).json({ error: 'You have already submitted this exam' });
    }

    // Get questions (without correct answers)
    const questionsResult = await pool.query(`
      SELECT id, question, options FROM questions WHERE exam_id = $1 ORDER BY id
    `, [id]);

    res.json(questionsResult.rows);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /exams/:id/submit
app.post('/exams/:id/submit', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array' });
    }

    // Check if exam is active
    const examResult = await pool.query(`
      SELECT end_time, marks_per_question FROM exams WHERE id = $1
    `, [id]);

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examResult.rows[0];
    const now = new Date();
    
    if (new Date(exam.end_time) < now) {
      return res.status(400).json({ error: 'Exam has ended' });
    }

    // Check if already submitted
    const existingAttempt = await pool.query(`
      SELECT id FROM attempts WHERE user_id = $1 AND exam_id = $2
    `, [req.user.id, id]);

    if (existingAttempt.rows.length > 0) {
      return res.status(400).json({ error: 'Already submitted' });
    }

    // Get correct answers
    const questionsResult = await pool.query(`
      SELECT id, correct_answer FROM questions WHERE exam_id = $1 ORDER BY id
    `, [id]);

    const questions = questionsResult.rows;
    const marksPerQuestion = exam.marks_per_question || 1;
    
    let score = 0;
    const answerMap = {};
    
    answers.forEach((answer, index) => {
      answerMap[questions[index]?.id] = answer;
      
      if (questions[index]) {
        if (answer === questions[index].correct_answer) {
          score += marksPerQuestion;
        } else if (answer !== null && answer !== undefined && answer !== '') {
          score -= 0.25;
        }
      }
    });

    // Save attempt
    await pool.query(`
      INSERT INTO attempts (user_id, exam_id, answers, score)
      VALUES ($1, $2, $3, $4)
    `, [req.user.id, id, JSON.stringify(answerMap), score]);

    res.json({ score });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

// GET /exams/:id/review
app.get('/exams/:id/review', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user's attempt
    const attemptResult = await pool.query(`
      SELECT answers, score FROM attempts WHERE user_id = $1 AND exam_id = $2
    `, [req.user.id, id]);

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ error: 'No attempt found' });
    }

    const attempt = attemptResult.rows[0];
    const userAnswers = JSON.parse(attempt.answers);

    // Get questions with correct answers and explanations
    const questionsResult = await pool.query(`
      SELECT id, question, options, correct_answer, explanation 
      FROM questions WHERE exam_id = $1 ORDER BY id
    `, [id]);

    const review = questionsResult.rows.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      userAnswer: userAnswers[q.id],
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      isCorrect: userAnswers[q.id] === q.correct_answer
    }));

    res.json({
      score: attempt.score,
      questions: review
    });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// GET /exams/:id/leaderboard
app.get('/exams/:id/leaderboard', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY a.score DESC, a.submitted_at ASC) as rank,
        u.name,
        u.district,
        a.score
      FROM attempts a
      JOIN users u ON a.user_id = u.id
      WHERE a.exam_id = $1
      ORDER BY a.score DESC, a.submitted_at ASC
      LIMIT 100
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST /admin/import
app.post('/admin/import', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const examData = req.body;
    
    // Insert exam
    const examResult = await client.query(`
      INSERT INTO exams (title, description, start_time, end_time, marks_per_question)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      examData.title,
      examData.description,
      examData.startTime,
      examData.endTime,
      examData.marksPerQuestion || 1
    ]);

    const examId = examResult.rows[0].id;

    // Insert questions
    for (const question of examData.questions) {
      await client.query(`
        INSERT INTO questions (exam_id, question, options, correct_answer, explanation)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        examId,
        question.question,
        JSON.stringify(question.options),
        question.correctAnswer,
        question.explanation
      ]);
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: 'Exam imported successfully',
      examId: examId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import exam error:', error);
    res.status(500).json({ error: 'Failed to import exam' });
  } finally {
    client.release();
  }
});

// GET /admin/metrics
app.get('/admin/metrics', requireAdmin, async (req, res) => {
  try {
    const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Get live takers (users currently taking exams)
    const now = new Date();
    const liveTakersResult = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      JOIN exams e ON e.start_time <= $1 AND e.end_time > $1
      LEFT JOIN attempts a ON a.user_id = u.id AND a.exam_id = e.id
      WHERE a.id IS NULL
    `, [now]);
    const liveTakers = parseInt(liveTakersResult.rows[0].count);

    res.json({
      totalUsers,
      liveTakers
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});