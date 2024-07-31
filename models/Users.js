const Sequelize = require('sequelize');
const db = require('../config/database');

const UserData = db.define('UserDatas', {
    user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true, 
        autoIncrement: true
    },
    country: {
        type: Sequelize.STRING(255),
        allowNull: false
    },
    email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
    },
    password: {
        type: Sequelize.STRING(255),
        allowNull: false
    },
    created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
    disclaimer: {
        type: Sequelize.STRING,
        defaultValue: 'No'
    }
}, {
    tableName: 'Users',
    timestamps: false
});

module.exports = UserData;