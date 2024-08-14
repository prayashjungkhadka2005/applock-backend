const Sequelize = require('sequelize');
const db = require('../config/database'); // Adjust this path if necessary

// Import all models
const Authentication = require('./Authentication');
const OTP = require('./OTP');
const SecurityQuestion = require('./SecurityQuestion');
const TempUser = require('./TempUser');
const UserRecoveryEmail = require('./UserRecoveryEmail');
const UserData = require('./Users');

// Define associations
TempUser.hasMany(OTP, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE'
});
OTP.belongsTo(TempUser, {
    foreignKey: 'user_id'
});

TempUser.hasMany(SecurityQuestion, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE'
});
SecurityQuestion.belongsTo(TempUser, {
    foreignKey: 'user_id'
});

TempUser.hasMany(UserRecoveryEmail, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE'
});
UserRecoveryEmail.belongsTo(TempUser, {
    foreignKey: 'user_id'
});

// You can define more associations here if needed
// Example: UserData.hasMany(OtherModel, { foreignKey: 'user_id' });

module.exports = {
    sequelize: db, // Exporting the Sequelize instance (for transaction management, etc.)
    Sequelize,     // Exporting the Sequelize library itself
    Authentication,
    OTP,
    SecurityQuestion,
    TempUser,
    UserRecoveryEmail,
    UserData,
};
