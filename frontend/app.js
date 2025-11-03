// Get backend URL from environment or default to localhost
const BACKEND_URL = window.BACKEND_URL || 'http://localhost:3000';
document.getElementById('backendUrl').textContent = BACKEND_URL;

// Load todos on page load
window.addEventListener('DOMContentLoaded', loadTodos);

async function loadTodos() {
    try {
        const response = await fetch(`${BACKEND_URL}/todos`);
        const todos = await response.json();
        displayTodos(todos);
    } catch (error) {
        console.error('Error loading todos:', error);
        document.getElementById('todoList').innerHTML = '<li>Error connecting to backend</li>';
    }
}

async function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();

    if (!text) return;

    try {
        const response = await fetch(`${BACKEND_URL}/todos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            input.value = '';
            loadTodos();
        }
    } catch (error) {
        console.error('Error adding todo:', error);
        alert('Failed to add todo');
    }
}

async function deleteTodo(id) {
    try {
        await fetch(`${BACKEND_URL}/todos/${id}`, { method: 'DELETE' });
        loadTodos();
    } catch (error) {
        console.error('Error deleting todo:', error);
    }
}

function displayTodos(todos) {
    const list = document.getElementById('todoList');

    if (todos.length === 0) {
        list.innerHTML = '<li>No todos yet. Add one above!</li>';
        return;
    }

    list.innerHTML = todos.map(todo => `
        <li>
            <span>${todo.text}</span>
            <button class="delete-btn" onclick="deleteTodo('${todo._id}')">Delete</button>
        </li>
    `).join('');
}