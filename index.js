const express = require('express');
const dotenv = require('dotenv');
const user_routes = require('./routes/user');
const cors = require('cors');
const http = require('http');  // Import the http module

dotenv.config();

const sequelize = require('./config/database');

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
const port = 3000;  // Specify port number

app.use(cors());
app.use(express.json());

// Use routes
app.use('', user_routes);

const startServer = async () => {
    const isDbConnected = await testDbConnection();
    if (isDbConnected) {
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } else {
        console.error('Server did not start due to database connection failure.');
    }
};

startServer();
