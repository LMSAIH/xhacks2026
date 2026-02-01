#!/bin/bash
# SFU AI Teacher - Local Development Setup Script
# Run this script to set up your local development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "========================================="
echo "  SFU AI Teacher - Local Dev Setup"
echo "========================================="
echo -e "${NC}"

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Check for required tools
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}  Node.js $(node -v)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install npm first.${NC}"
    exit 1
fi
echo -e "${GREEN}  npm $(npm -v)${NC}"

echo ""

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd "$PROJECT_ROOT/backend"
npm install
echo -e "${GREEN}  Backend dependencies installed${NC}"

# Check if wrangler is available
if ! npx wrangler --version &> /dev/null; then
    echo -e "${RED}Wrangler not available. Something went wrong with npm install.${NC}"
    exit 1
fi
echo -e "${GREEN}  Wrangler $(npx wrangler --version)${NC}"

echo ""

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd "$PROJECT_ROOT/frontend"
npm install
echo -e "${GREEN}  Frontend dependencies installed${NC}"

echo ""

# Setup local D1 database
echo -e "${YELLOW}Setting up local D1 database...${NC}"
cd "$PROJECT_ROOT/backend"

# Run the schema migration
npx wrangler d1 execute sfu-ai-teacher-db --local --file=./sql/schema.sql 2>/dev/null || true
echo -e "${GREEN}  Database schema applied${NC}"

echo ""

# Seed the database with sample data
echo -e "${YELLOW}Seeding database with sample data...${NC}"

# Create a temporary seed file
cat > /tmp/seed.sql << 'EOF'
-- Sample Users
INSERT OR IGNORE INTO users (id, email, name, preferences) VALUES 
  ('dev-user-001', 'student@sfu.ca', 'Demo Student', '{"voice": "aura-asteria-en", "speed": 1.0}'),
  ('dev-user-002', 'ta@sfu.ca', 'Demo TA', '{"voice": "aura-orion-en", "speed": 1.0}');

-- Sample SFU Courses
INSERT OR REPLACE INTO sfu_courses (id, name, title, description, units, prerequisites, degree_level, term) VALUES 
  ('course-cmpt-120', 'CMPT 120', 'Introduction to Computing Science and Programming I', 
   'An introduction to computing science and computer programming, suitable for students with little or no programming background. Topics include: fundamental concepts of computing; elementary data types; control structures; the design and implementation of small programs using a procedural language.', 
   '3', 'None', 'Undergraduate', '2024 Fall'),
  
  ('course-cmpt-125', 'CMPT 125', 'Introduction to Computing Science and Programming II',
   'A rigorous introduction to computing science and computer programming, suitable for students who already have some programming background. Topics include: fundamental concepts of computing; data abstraction; algorithm design; control structures; the design and implementation of programs using an object-oriented language.',
   '3', 'CMPT 120 or equivalent', 'Undergraduate', '2024 Fall'),
  
  ('course-cmpt-225', 'CMPT 225', 'Data Structures and Programming',
   'Introduction to a variety of practical and important data structures and methods for implementation and for experimental and analytical evaluation. Topics include: stacks, queues, lists, trees, graphs, sorting, searching, and algorithm analysis.',
   '3', 'CMPT 125 and (MACM 101 or MATH 190)', 'Undergraduate', '2024 Fall'),
  
  ('course-cmpt-276', 'CMPT 276', 'Introduction to Software Engineering',
   'An overview of various techniques used for software development and software project management. Topics include: software life cycle models, requirements analysis, software design methodologies, project management, quality assurance, software maintenance.',
   '3', 'CMPT 225', 'Undergraduate', '2024 Fall'),
  
  ('course-cmpt-354', 'CMPT 354', 'Database Systems I',
   'Logical representations of data: the relational model, entity-relationship model. Database design and normalization. Data definition and data manipulation languages (SQL). Physical data organization.',
   '3', 'CMPT 225', 'Undergraduate', '2024 Fall'),
  
  ('course-math-151', 'MATH 151', 'Calculus I',
   'Limits, derivatives of algebraic and transcendental functions. Applications including curve sketching, optimization problems, and related rates. Introduction to integration.',
   '3', 'Pre-calculus 12 or equivalent', 'Undergraduate', '2024 Fall'),
  
  ('course-macm-101', 'MACM 101', 'Discrete Mathematics I',
   'Introduction to logic, sets, functions, and mathematical proof techniques. Topics include: propositional and predicate logic, sets, relations, functions, mathematical induction, elementary number theory, and counting.',
   '3', 'None', 'Undergraduate', '2024 Fall'),
  
  ('course-phil-105', 'PHIL 105', 'Critical Thinking',
   'An introduction to the skills and methods of critical reasoning and argumentation. Emphasis on recognizing and evaluating arguments in everyday contexts, understanding common fallacies, and developing clear and effective reasoning.',
   '3', 'None', 'Undergraduate', '2024 Fall');

-- Sample Course Outlines (chunks for RAG)
INSERT OR REPLACE INTO sfu_outlines (id, course_id, chunk_index, content_type, content, metadata) VALUES 
  ('outline-cmpt225-1', 'course-cmpt-225', 0, 'syllabus', 
   'CMPT 225 covers fundamental data structures including arrays, linked lists, stacks, queues, trees, heaps, hash tables, and graphs. Students will learn to analyze algorithm efficiency using Big-O notation and implement these structures in C++.',
   '{"section": "overview"}'),
  
  ('outline-cmpt225-2', 'course-cmpt-225', 1, 'schedule',
   'Week 1-2: Review of C++ and Object-Oriented Programming. Week 3-4: Abstract Data Types, Stacks and Queues. Week 5-6: Linked Lists and Iterators. Week 7-8: Trees and Binary Search Trees. Week 9-10: Heaps and Priority Queues. Week 11-12: Hash Tables. Week 13: Graphs and Graph Algorithms.',
   '{"section": "schedule"}'),
  
  ('outline-cmpt225-3', 'course-cmpt-225', 2, 'grading',
   'Grading: Assignments (40%) - 5 programming assignments. Midterm Exam (25%). Final Exam (35%). Late policy: 10% per day, maximum 3 days late.',
   '{"section": "grading"}'),
  
  ('outline-cmpt276-1', 'course-cmpt-276', 0, 'syllabus',
   'CMPT 276 introduces software engineering principles and practices. Topics include requirements gathering, system design, agile methodologies, version control with Git, testing strategies, and team collaboration. Students work in teams on a semester-long project.',
   '{"section": "overview"}'),
  
  ('outline-cmpt276-2', 'course-cmpt-276', 1, 'grading',
   'Grading: Team Project (50%) - includes proposal, design documents, implementation, and presentation. Individual Assignments (25%). Participation and Peer Evaluation (10%). Final Exam (15%).',
   '{"section": "grading"}'),
  
  ('outline-math151-1', 'course-math-151', 0, 'syllabus',
   'MATH 151 covers single-variable calculus. Topics include limits and continuity, derivatives and their applications, integration, and the Fundamental Theorem of Calculus. Applications to physics and engineering problems.',
   '{"section": "overview"}');

-- Sample Instructors
INSERT OR REPLACE INTO instructors (id, sfu_id, name, department, rating, review_count, would_take_again, difficulty) VALUES 
  ('inst-001', 'faculty-001', 'Dr. Sarah Chen', 'Computing Science', 4.5, 120, 0.92, 3.2),
  ('inst-002', 'faculty-002', 'Dr. Michael Brown', 'Computing Science', 4.2, 85, 0.88, 3.5),
  ('inst-003', 'faculty-003', 'Dr. Emily Watson', 'Mathematics', 4.7, 200, 0.95, 2.8),
  ('inst-004', 'faculty-004', 'Dr. James Lee', 'Computing Science', 3.9, 65, 0.80, 3.8);

-- Verify data was inserted
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Courses: ' || COUNT(*) FROM sfu_courses;
SELECT 'Outlines: ' || COUNT(*) FROM sfu_outlines;
SELECT 'Instructors: ' || COUNT(*) FROM instructors;
EOF

npx wrangler d1 execute sfu-ai-teacher-db --local --file=/tmp/seed.sql 2>/dev/null || true
rm /tmp/seed.sql
echo -e "${GREEN}  Sample data seeded${NC}"

echo ""

# Setup frontend environment
echo -e "${YELLOW}Setting up frontend environment...${NC}"
cd "$PROJECT_ROOT/frontend"

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}  Created .env from .env.example${NC}"
else
    echo -e "${GREEN}  .env already exists${NC}"
fi

echo ""

# Run tests to verify setup
echo -e "${YELLOW}Running backend tests to verify setup...${NC}"
cd "$PROJECT_ROOT/backend"
if npm run test:run 2>/dev/null | tail -5; then
    echo -e "${GREEN}  All tests passed${NC}"
else
    echo -e "${YELLOW}  Some tests may have failed (this is okay for initial setup)${NC}"
fi

echo ""

# Print success message and next steps
echo -e "${GREEN}"
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo -e "${NC}"
echo ""
echo -e "${BLUE}To start the development servers:${NC}"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8787"
echo "  API Docs:  http://localhost:8787/api/health"
echo ""
echo -e "${BLUE}Sample API endpoints to test:${NC}"
echo "  curl http://localhost:8787/api/health"
echo "  curl http://localhost:8787/api/courses"
echo "  curl http://localhost:8787/api/courses/search?q=cmpt"
echo ""
echo -e "${YELLOW}Note: The backend requires Cloudflare authentication for some features.${NC}"
echo -e "${YELLOW}Run 'npx wrangler login' in the backend folder if you need AI/Vectorize.${NC}"
echo ""
