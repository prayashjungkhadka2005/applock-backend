const Sequelize = require('sequelize');
const sequelize = require('../config/database'); // adjust the path to your database configuration

const UserRecoveryEmail = sequelize.define('UserRecoveryEmail', {
  recovery_id: {
    type: Sequelize.INTEGER,
    primaryKey: true, 
    autoIncrement: true
  },
  user_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
        model: 'TempUser',
        key: 'user_id',
         onDelete: 'CASCADE'
    }
},
  recovery_email: {
    type: Sequelize.STRING,
    allowNull: false
  },
  
}, {
  tableName: 'UserRecoveryEmail',
  timestamps: false
});

module.exports = UserRecoveryEmail;
