const Sequelize = require('sequelize');
const db = require('../config/database');

const Authentication = db.define('Authentication', {
    auth_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'user_id',
         onDelete: 'CASCADE'
    }
    },
    auth_type: {
      type: Sequelize.STRING,
      allowNull: false
    },
    auth_value: {
      type: Sequelize.STRING,
      allowNull: false
    },
  }, {
    tableName: 'Authentication',
    timestamps: false
  });



module.exports = Authentication;
