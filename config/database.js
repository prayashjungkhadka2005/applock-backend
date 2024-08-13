const Sequelize = require('sequelize');

module.exports = new Sequelize('bblsecurity', 'postgres', 'prayash', {
    host: 'localhost',
    dialect: 'postgres',


    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 1000
    },
});