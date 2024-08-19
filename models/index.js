const Sequelize = require('sequelize');
const db = require('../config/database'); // Adjust this path if necessary

// Import all models
const Authentication = require('./Authentication');
const OTP = require('./OTP');
const SecurityQuestion = require('./SecurityQuestion');
const UserRecoveryEmail = require('./UserRecoveryEmail');
const Users = require('./Users'); // Replaced TempUser with Users

// Define associations
Users.hasMany(OTP, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE'
});
OTP.belongsTo(Users, { // Replaced TempUser with Users
    foreignKey: 'user_id'
});

Users.hasMany(SecurityQuestion, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE'
});
SecurityQuestion.belongsTo(Users, { // Replaced TempUser with Users
    foreignKey: 'user_id'
});

Users.hasMany(UserRecoveryEmail, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE'
});
UserRecoveryEmail.belongsTo(Users, { // Replaced TempUser with Users
    foreignKey: 'user_id'
});

// You can define more associations here if needed
// Example: Users.hasMany(OtherModel, { foreignKey: 'user_id' });

module.exports = {
    sequelize: db, // Exporting the Sequelize instance (for transaction management, etc.)
    Sequelize,     // Exporting the Sequelize library itself
    Authentication,
    OTP,
    SecurityQuestion,
    UserRecoveryEmail,
    Users,         // Replaced TempUser with Users in export
};
