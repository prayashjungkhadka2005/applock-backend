const Sequelize = require('sequelize');
const db = require('../config/database');

const SecurityQuestion = db.define('SecurityQuestion', {
    question_id: {
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
    question: {
        type: Sequelize.TEXT,
        allowNull: false,
    },
    answer: {
        type: Sequelize.TEXT,
        allowNull: false,
    }
}, {
    tableName: 'SecurityQuestion',
  timestamps: false
    
});

module.exports = SecurityQuestion;
