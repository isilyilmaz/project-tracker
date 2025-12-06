const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log('Created data directory');
}

// GET endpoint to read JSON files from data folder
app.get('/data/:type', (req, res) => {
    try {
        const type = req.params.type;
        const filePath = path.join(__dirname, 'data', `${type}.json`);
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            res.json(jsonData);
        } else {
            // Return empty array if file doesn't exist
            res.json([]);
        }
    } catch (error) {
        // Return empty array on error
        res.json([]);
    }
});

// Silent file save endpoint
app.post('/save/:type', (req, res) => {
    try {
        const type = req.params.type;
        const filePath = path.join(__dirname, 'data', `${type}.json`);
        const jsonData = JSON.stringify(req.body, null, 2);
        
        // Write file silently
        fs.writeFileSync(filePath, jsonData, 'utf8');
        
        // Silent success response
        res.json({ success: true });
    } catch (error) {
        // Silent error handling - don't expose errors to client
        res.status(500).json({ success: false });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server silently
app.listen(PORT, () => {
    console.log(`Silent file server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Server shutting down...');
    process.exit(0);
});