const UserTable = 
  `CREATE TABLE IF NOT EXISTS users(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

const RoomsTable =
  `CREATE TABLE IF NOT EXISTS rooms(
    id VARCHAR(21) PRIMARY KEY,
    user_created INT NOT NULL,
    user1 INT NULL,
    user2 INT NULL,
    language VARCHAR(20) NOT NULL DEFAULT 'cpp',
    code MEDIUMTEXT NULL,
    ydoc_state MEDIUMBLOB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_created) REFERENCES users(id),
    FOREIGN KEY (user1) REFERENCES users(id),
    FOREIGN KEY (user2) REFERENCES users(id)
  )`;

const ProblemsTable =
  `CREATE TABLE IF NOT EXISTS problems(
    id VARCHAR(10) PRIMARY KEY,
    contest_id INT NOT NULL,
    idx VARCHAR(3) NOT NULL,
    title VARCHAR(255) NOT NULL,
    time_limit VARCHAR(50) NULL,
    memory_limit VARCHAR(50) NULL,
    legend MEDIUMTEXT NULL,
    input_spec MEDIUMTEXT NULL,
    output_spec MEDIUMTEXT NULL,
    note MEDIUMTEXT NULL,
    samples JSON NOT NULL,
    url VARCHAR(255) NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

module.exports = { UserTable, RoomsTable, ProblemsTable };