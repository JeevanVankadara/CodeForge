const UserTable = 
  `CREATE TABLE IF NOT EXISTS users(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

//Need to implement the nanoId thing
const RoomsTable = 
  `CREATE TABLE IF NOT EXISTS rooms(  
    id INT AUTO_INCREMENT PRIMARY KEY,  
    user_created INT NOT NULL,
    user1 INT NOT NULL,
    user2 INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_created) REFERENCES users(id),
    FOREIGN KEY (user1) REFERENCES users(id),
    FOREIGN KEY (user2) REFERENCES users(id)
  )`;

module.exports = { UserTable, RoomsTable };