const Sequelize = require('sequelize');
require('dotenv').config();  // Load environment variables

module.exports = new Sequelize(
    process.env.POSTGRES_DATABASE,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
    {
        host: process.env.POSTGRES_HOST,
        dialect: 'postgres',
        port: process.env.DB_PORT || 5432,  // Default to 5432 if not provided
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // This is necessary for many cloud-hosted databases
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);
