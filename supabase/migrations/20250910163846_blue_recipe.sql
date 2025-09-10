-- Online Exam System Database Schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exams table
CREATE TABLE exams (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    marks_per_question DECIMAL(5,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSON NOT NULL, -- Array of options
    correct_answer INTEGER NOT NULL, -- Index of correct option (0-based)
    explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attempts table
CREATE TABLE attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    answers JSON NOT NULL, -- Map of question_id -> user_answer
    score DECIMAL(8,2) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exam_id) -- One attempt per user per exam
);

-- Indexes for better performance
CREATE INDEX idx_exams_time ON exams(start_time, end_time);
CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_attempts_user_exam ON attempts(user_id, exam_id);
CREATE INDEX idx_attempts_score ON attempts(score DESC, submitted_at ASC);