const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Data files mapping
const dataFiles = {
    projects: 'data/projects.json',
    ideas: 'data/ideas.json',
    events: 'data/events.json',
    tasks: 'data/tasks.json',
    subtasks: 'data/subtasks.json'
};

// Helper function to ensure file exists
async function ensureFileExists(filePath) {
    try {
        await fs.access(filePath);
    } catch (error) {
        // File doesn't exist, create it with empty array
        await fs.writeFile(filePath, '[]', 'utf8');
        console.log(`Created ${filePath} with empty array`);
    }
}

// Helper function to read JSON file
async function readJsonFile(filePath) {
    try {
        await ensureFileExists(filePath);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
}

// Helper function to write JSON file
async function writeJsonFile(filePath, data) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        console.log(`Successfully wrote ${filePath}`);
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        throw error;
    }
}

// API Routes

// Get all data for a type
app.get('/api/:type', async (req, res) => {
    const { type } = req.params;
    
    if (!dataFiles[type]) {
        return res.status(400).json({ error: 'Invalid data type' });
    }

    try {
        const data = await readJsonFile(dataFiles[type]);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Save/update data for a type
app.post('/api/:type', async (req, res) => {
    const { type } = req.params;
    const newData = req.body;
    
    if (!dataFiles[type]) {
        return res.status(400).json({ error: 'Invalid data type' });
    }

    try {
        const currentData = await readJsonFile(dataFiles[type]);
        
        // If newData is an array, replace all data
        // If newData is an object, add it to the array
        let updatedData;
        if (Array.isArray(newData)) {
            updatedData = newData;
        } else {
            // Check if item already exists (by id)
            const existingIndex = currentData.findIndex(item => item.id === newData.id);
            if (existingIndex !== -1) {
                // Update existing item
                currentData[existingIndex] = newData;
                updatedData = currentData;
            } else {
                // Add new item
                updatedData = [...currentData, newData];
            }
        }
        
        await writeJsonFile(dataFiles[type], updatedData);
        res.json({ success: true, message: `${type} data updated successfully` });
    } catch (error) {
        console.error(`Error saving ${type}:`, error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Delete item by ID
app.delete('/api/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    
    if (!dataFiles[type]) {
        return res.status(400).json({ error: 'Invalid data type' });
    }

    try {
        const currentData = await readJsonFile(dataFiles[type]);
        const filteredData = currentData.filter(item => item.id !== id);
        
        if (filteredData.length === currentData.length) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        await writeJsonFile(dataFiles[type], filteredData);
        res.json({ success: true, message: `${type} item deleted successfully` });
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        res.status(500).json({ error: 'Failed to delete data' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Project Tracker Server running at http://localhost:${PORT}`);
    console.log('Data files will be automatically created in the data/ folder');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Server shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Server shutting down...');
    process.exit(0);
});