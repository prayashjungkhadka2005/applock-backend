const Sequelize = require('sequelize');
const db = require('../config/database');

const ResetOTP = db.define('ResetOTP', {
    otp_id: {
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
    tableName: 'ResetOTP',
    timestamps: false
});


module.exports = ResetOTP;
