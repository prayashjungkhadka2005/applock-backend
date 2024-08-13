const express = require('express');
const dotenv = require('dotenv');
const user_routes = require('./routes/user');
const cors = require('cors');
const sequelize = require('./config/database');

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
const port = process.env.PORT || 3000;  // Use the PORT from environment variables, default to 3000

app.use(cors());
app.use(express.json());

// Use routes
app.use('/', user_routes);

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
