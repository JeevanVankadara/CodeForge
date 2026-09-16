const UserTable =
  `CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

const RoomsTable =
  `CREATE TABLE IF NOT EXISTS rooms(
    id VARCHAR(21) PRIMARY KEY,
    user_created INT NOT NULL REFERENCES users(id),
    user1 INT NULL REFERENCES users(id),
    user2 INT NULL REFERENCES users(id),
    language VARCHAR(20) NOT NULL DEFAULT 'cpp',
    code TEXT NULL,
    ydoc_state BYTEA NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;

const ProblemsTable =
  `CREATE TABLE IF NOT EXISTS problems(
    id VARCHAR(10) PRIMARY KEY,
    contest_id INT NOT NULL,
    idx VARCHAR(3) NOT NULL,
    title VARCHAR(255) NOT NULL,
    time_limit VARCHAR(50) NULL,
    memory_limit VARCHAR(50) NULL,
    legend TEXT NULL,
    input_spec TEXT NULL,
    output_spec TEXT NULL,
    note TEXT NULL,
    samples JSONB NOT NULL,
    url VARCHAR(255) NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
  )`;

module.exports = { UserTable, RoomsTable, ProblemsTable };
