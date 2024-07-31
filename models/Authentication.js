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
      allowNull: false
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
