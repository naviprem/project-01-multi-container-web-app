const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todos';
const DB_USER = process.env.DB_USER || '';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

let connectionString = MONGODB_URI;
if (DB_USER && DB_PASSWORD) {
    // Extract host and database from URI
    const uriParts = MONGODB_URI.replace('mongodb://', '').split('/');
    const host = uriParts[0];
    const database = uriParts[1] || 'todos';
    connectionString = `mongodb://${DB_USER}:${DB_PASSWORD}@${host}/${database}`;
}

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Todo Schema
const todoSchema = new mongoose.Schema({
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Todo = mongoose.model('Todo', todoSchema);

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'TODO API Server',
        version: '1.0.0',
        endpoints: {
            todos: '/todos',
            health: '/health'
        }
    });
});

app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    };
    res.json(health);
});

// Get all todos
app.get('/todos', async (req, res) => {
    try {
        const todos = await Todo.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create todo
app.post('/todos', async (req, res) => {
    try {
        const todo = new Todo({
            text: req.body.text
        });
        const saved = await todo.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete todo
app.delete('/todos/:id', async (req, res) => {
    try {
        await Todo.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`MongoDB URI: ${connectionString.replace(/:([^:@]+)@/, ':****@')}`);
});