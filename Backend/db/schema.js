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

module.exports = { UserTable, RoomsTable };