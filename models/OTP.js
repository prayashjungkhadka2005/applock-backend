const Sequelize = require('sequelize');
const db = require('../config/database');

const OTP = db.define('OTP', {
    otp_id: {
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
    otp_code: {
        type: Sequelize.STRING(6),
        allowNull: false
    },
    otp_type: {
        type: Sequelize.STRING(20),
        allowNull: false
    },

    created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: 'OTP',
    timestamps: false
});


module.exports = OTP;
