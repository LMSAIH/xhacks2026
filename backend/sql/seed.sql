-- SFU AI Teacher - Sample Seed Data
-- Run with: npx wrangler d1 execute sfu-ai-teacher-db --local --file=./sql/seed.sql

-- ============================================
-- Sample Users
-- ============================================
INSERT OR IGNORE INTO users (id, email, name, preferences) VALUES 
  ('dev-user-001', 'student@sfu.ca', 'Demo Student', '{"voice": "aura-asteria-en", "speed": 1.0}'),
  ('dev-user-002', 'ta@sfu.ca', 'Demo TA', '{"voice": "aura-orion-en", "speed": 1.0}');

-- ============================================
-- Sample SFU Courses
-- ============================================
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
  
  ('course-cmpt-310', 'CMPT 310', 'Introduction to Artificial Intelligence',
   'Foundations of artificial intelligence including search algorithms, knowledge representation, reasoning under uncertainty, machine learning basics, and applications of AI.',
   '3', 'CMPT 225 and MACM 101', 'Undergraduate', '2024 Fall'),
  
  ('course-cmpt-383', 'CMPT 383', 'Comparative Programming Languages',
   'Comparison of programming paradigms including procedural, object-oriented, functional, and logic programming. Concepts of syntax, semantics, type systems, and language implementation.',
   '3', 'CMPT 225', 'Undergraduate', '2024 Fall'),
  
  ('course-math-151', 'MATH 151', 'Calculus I',
   'Limits, derivatives of algebraic and transcendental functions. Applications including curve sketching, optimization problems, and related rates. Introduction to integration.',
   '3', 'Pre-calculus 12 or equivalent', 'Undergraduate', '2024 Fall'),
  
  ('course-math-152', 'MATH 152', 'Calculus II',
   'Riemann sum, Fundamental Theorem of Calculus, techniques of integration. Applications of integration. Sequences, series, convergence tests, power series, Taylor expansions.',
   '3', 'MATH 151', 'Undergraduate', '2024 Fall'),
  
  ('course-macm-101', 'MACM 101', 'Discrete Mathematics I',
   'Introduction to logic, sets, functions, and mathematical proof techniques. Topics include: propositional and predicate logic, sets, relations, functions, mathematical induction, elementary number theory, and counting.',
   '3', 'None', 'Undergraduate', '2024 Fall'),
  
  ('course-macm-201', 'MACM 201', 'Discrete Mathematics II',
   'A continuation of MACM 101. Topics include counting techniques, recurrence relations, graphs and trees, and introductory graph theory algorithms.',
   '3', 'MACM 101', 'Undergraduate', '2024 Fall'),
  
  ('course-phil-105', 'PHIL 105', 'Critical Thinking',
   'An introduction to the skills and methods of critical reasoning and argumentation. Emphasis on recognizing and evaluating arguments in everyday contexts, understanding common fallacies, and developing clear and effective reasoning.',
   '3', 'None', 'Undergraduate', '2024 Fall'),
  
  ('course-stat-270', 'STAT 270', 'Introduction to Probability and Statistics',
   'Basic laws of probability, sample distributions. Introduction to statistical estimation and testing. Applications of statistics to empirical data.',
   '3', 'MATH 152', 'Undergraduate', '2024 Fall');

-- ============================================
-- Sample Course Outlines (chunks for RAG)
-- ============================================
INSERT OR REPLACE INTO sfu_outlines (id, course_id, chunk_index, content_type, content, metadata) VALUES 
  -- CMPT 225 Outlines
  ('outline-cmpt225-1', 'course-cmpt-225', 0, 'syllabus', 
   'CMPT 225 covers fundamental data structures including arrays, linked lists, stacks, queues, trees, heaps, hash tables, and graphs. Students will learn to analyze algorithm efficiency using Big-O notation and implement these structures in C++.',
   '{"section": "overview"}'),
  
  ('outline-cmpt225-2', 'course-cmpt-225', 1, 'schedule',
   'Week 1-2: Review of C++ and Object-Oriented Programming. Week 3-4: Abstract Data Types, Stacks and Queues. Week 5-6: Linked Lists and Iterators. Week 7-8: Trees and Binary Search Trees. Week 9-10: Heaps and Priority Queues. Week 11-12: Hash Tables. Week 13: Graphs and Graph Algorithms.',
   '{"section": "schedule"}'),
  
  ('outline-cmpt225-3', 'course-cmpt-225', 2, 'grading',
   'Grading: Assignments (40%) - 5 programming assignments. Midterm Exam (25%). Final Exam (35%). Late policy: 10% per day, maximum 3 days late.',
   '{"section": "grading"}'),
  
  ('outline-cmpt225-4', 'course-cmpt-225', 3, 'textbook',
   'Required textbook: "Data Structures and Algorithm Analysis in C++" by Mark Allen Weiss. Additional resources available on Canvas including lecture slides and practice problems.',
   '{"section": "resources"}'),
  
  -- CMPT 276 Outlines
  ('outline-cmpt276-1', 'course-cmpt-276', 0, 'syllabus',
   'CMPT 276 introduces software engineering principles and practices. Topics include requirements gathering, system design, agile methodologies, version control with Git, testing strategies, and team collaboration. Students work in teams on a semester-long project.',
   '{"section": "overview"}'),
  
  ('outline-cmpt276-2', 'course-cmpt-276', 1, 'grading',
   'Grading: Team Project (50%) - includes proposal, design documents, implementation, and presentation. Individual Assignments (25%). Participation and Peer Evaluation (10%). Final Exam (15%).',
   '{"section": "grading"}'),
  
  ('outline-cmpt276-3', 'course-cmpt-276', 2, 'schedule',
   'Week 1-2: Introduction to Software Engineering, Team Formation. Week 3-4: Requirements and User Stories. Week 5-6: System Design and Architecture. Week 7-8: Agile and Scrum. Week 9-10: Testing and Quality Assurance. Week 11-12: Deployment and DevOps. Week 13: Project Presentations.',
   '{"section": "schedule"}'),
  
  -- CMPT 354 Outlines
  ('outline-cmpt354-1', 'course-cmpt-354', 0, 'syllabus',
   'CMPT 354 covers database concepts including the relational model, SQL, database design, normalization, transaction processing, and query optimization. Students gain hands-on experience with PostgreSQL.',
   '{"section": "overview"}'),
  
  ('outline-cmpt354-2', 'course-cmpt-354', 1, 'grading',
   'Grading: Programming Assignments (35%), Midterm (25%), Final Exam (30%), Participation (10%). Assignments involve designing and implementing database schemas and writing complex SQL queries.',
   '{"section": "grading"}'),
  
  -- MATH 151 Outlines
  ('outline-math151-1', 'course-math-151', 0, 'syllabus',
   'MATH 151 covers single-variable calculus. Topics include limits and continuity, derivatives and their applications, integration, and the Fundamental Theorem of Calculus. Applications to physics and engineering problems.',
   '{"section": "overview"}'),
  
  ('outline-math151-2', 'course-math-151', 1, 'schedule',
   'Week 1-2: Limits and Continuity. Week 3-4: Definition of Derivative, Differentiation Rules. Week 5-6: Applications of Derivatives. Week 7-8: Integration and Antiderivatives. Week 9-10: Fundamental Theorem of Calculus. Week 11-12: Techniques of Integration. Week 13: Review.',
   '{"section": "schedule"}'),
  
  -- CMPT 310 Outlines
  ('outline-cmpt310-1', 'course-cmpt-310', 0, 'syllabus',
   'CMPT 310 introduces artificial intelligence concepts. Topics include intelligent agents, search algorithms (BFS, DFS, A*), knowledge representation, probabilistic reasoning, and introduction to machine learning. Programming in Python.',
   '{"section": "overview"}'),
  
  ('outline-cmpt310-2', 'course-cmpt-310', 1, 'grading',
   'Grading: Programming Assignments (40%), Midterm (20%), Final Exam (30%), Written Assignments (10%). Assignments cover search algorithms, game playing, and basic ML implementations.',
   '{"section": "grading"}');

-- ============================================
-- Sample Instructors (with RateMyProf-style data)
-- ============================================
INSERT OR REPLACE INTO instructors (id, sfu_id, name, department, rating, review_count, would_take_again, difficulty) VALUES 
  ('inst-001', 'faculty-001', 'Dr. Sarah Chen', 'Computing Science', 4.5, 120, 0.92, 3.2),
  ('inst-002', 'faculty-002', 'Dr. Michael Brown', 'Computing Science', 4.2, 85, 0.88, 3.5),
  ('inst-003', 'faculty-003', 'Dr. Emily Watson', 'Mathematics', 4.7, 200, 0.95, 2.8),
  ('inst-004', 'faculty-004', 'Dr. James Lee', 'Computing Science', 3.9, 65, 0.80, 3.8),
  ('inst-005', 'faculty-005', 'Dr. Lisa Park', 'Computing Science', 4.6, 150, 0.93, 3.0),
  ('inst-006', 'faculty-006', 'Dr. Robert Kim', 'Mathematics', 4.0, 90, 0.82, 3.6),
  ('inst-007', 'faculty-007', 'Dr. Jennifer Adams', 'Philosophy', 4.8, 180, 0.96, 2.5);

-- ============================================
-- Verify seed data
-- ============================================
SELECT '=== Seed Data Summary ===' as info;
SELECT 'Users: ' || COUNT(*) as count FROM users;
SELECT 'Courses: ' || COUNT(*) as count FROM sfu_courses;
SELECT 'Outlines: ' || COUNT(*) as count FROM sfu_outlines;
SELECT 'Instructors: ' || COUNT(*) as count FROM instructors;
