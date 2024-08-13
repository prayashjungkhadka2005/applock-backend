const express = require('express');
const dotenv = require('dotenv');
const user_routes = require('../routes/user');
const cors = require('cors');
const sequelize = require('../config/database');

dotenv.config();  // Load environment variables

// Test database connection
const testDbConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected using Sequelize');
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
};

const app = express();

app.use(cors());
app.use(express.json());

// Use routes
app.use('/', user_routes);

const handler = async (req, res) => {
    const isDbConnected = await testDbConnection();
    if (isDbConnected) {
        app(req, res);
    } else {
        res.status(500).json({ error: 'Database connection failed' });
    }
};

module.exports = handler;
