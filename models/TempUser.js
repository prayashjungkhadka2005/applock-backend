// const Sequelize = require('sequelize');
// const db = require('../config/database');

// const TempUser = db.define('TempUser', {
//     user_id: {
//         type: Sequelize.INTEGER,
//         primaryKey: true, 
//         autoIncrement: true
//     },
//     country: {
//         type: Sequelize.STRING(255),
//         allowNull: false
//     },
//     email: {
//         type: Sequelize.STRING(255),
//         allowNull: false,
//         unique: true
//     },
//     password: {
//         type: Sequelize.STRING(255),
//         allowNull: false
//     },
//     created_at: {
//         type: Sequelize.DATE,
//         defaultValue: Sequelize.NOW
//     },
//     disclaimer: {
//         type: Sequelize.STRING,
//         defaultValue: 'No'
//     }
// }, {
//     tableName: 'TempUser',
//     timestamps: false
// });

// module.exports = TempUser;