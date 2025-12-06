class TaskGrid {
    constructor() {
        this.tasks = [];
        this.editingTask = null;
        this.gridContainer = null;
        this.gridBody = null;
        this.initialized = false;
    }

    initialize(gridId = 'idea-task-grid') {
        this.gridContainer = document.getElementById(gridId);
        this.gridBody = document.getElementById('task-grid-body');
        
        if (!this.gridContainer || !this.gridBody) {
            console.error('Task grid elements not found');
            return;
        }

        this.initialized = true;
        this.renderGrid();
        this.bindEvents();
    }

    bindEvents() {
        // Global function for adding new task
        window.addNewTask = () => this.addNewTask();
    }

    addNewTask() {
        const newTask = {
            id: window.idGenerator.generateId('task'),
            name: '',
            dueDate: '',
            doneStatus: 'ready_to_analyze',
            notes: '',
            subtaskIds: [], // New schema field
            isNew: true
        };

        this.tasks.push(newTask);
        this.editingTask = newTask.id;
        this.renderGrid();
        
        // Focus on the first input
        setTimeout(() => {
            const firstInput = this.gridBody.querySelector('.task-edit-input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    editTask(taskId) {
        this.editingTask = taskId;
        this.renderGrid();
        
        // Focus on the task name input
        setTimeout(() => {
            const nameInput = this.gridBody.querySelector(`[data-task-id="${taskId}"] .task-edit-input`);
            if (nameInput) nameInput.focus();
        }, 100);
    }

    async saveTask(taskId) {
        const taskRow = this.gridBody.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskRow) return;

        const nameInput = taskRow.querySelector('.task-name-input');
        const dueDateInput = taskRow.querySelector('.task-date-input');
        const statusSelect = taskRow.querySelector('.task-status-select');
        const notesInput = taskRow.querySelector('.task-notes-input');

        if (!nameInput.value.trim()) {
            alert('Task name is required');
            nameInput.focus();
            return;
        }

        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const now = new Date().toISOString();
            const wasNew = task.isNew;
            
            task.name = nameInput.value.trim();
            task.dueDate = dueDateInput.value;
            task.doneStatus = statusSelect.value;
            task.notes = notesInput.value;
            task.subtaskIds = task.subtaskIds || [];
            
            // Add timestamps
            if (wasNew) {
                task.createdAt = now;
            }
            task.updatedAt = now;
            task.isNew = false;

            // Save to data manager
            try {
                // Create clean task object with only allowed schema fields
                const taskData = {
                    id: task.id,
                    name: task.name,
                    dueDate: task.dueDate,
                    doneStatus: task.doneStatus,
                    notes: task.notes,
                    subtaskIds: task.subtaskIds,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt
                };
                
                if (wasNew) {
                    await window.dataManager.saveTask(taskData);
                    console.log(`Task saved: ${task.name}`);
                } else {
                    await window.dataManager.updateTask(taskId, taskData);
                    console.log(`Task updated: ${task.name}`);
                }
                
                // Show success feedback
                this.showTaskSaveSuccess(task.name);
            } catch (error) {
                console.error('Error saving task:', error);
                alert('Failed to save task. Please try again.');
                return;
            }
        }

        this.editingTask = null;
        this.renderGrid();
    }

    cancelEdit() {
        if (this.editingTask) {
            const task = this.tasks.find(t => t.id === this.editingTask);
            if (task && task.isNew) {
                // Remove new task if cancelling
                this.tasks = this.tasks.filter(t => t.id !== this.editingTask);
            }
        }
        
        this.editingTask = null;
        this.renderGrid();
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            
            try {
                await window.dataManager.deleteTask(taskId);
            } catch (error) {
                console.error('Error deleting task:', error);
            }
            
            this.renderGrid();
        }
    }

    renderGrid() {
        if (!this.gridBody) return;

        if (this.tasks.length === 0) {
            this.gridBody.innerHTML = `
                <div class="empty-tasks">
                    <p>No tasks added yet. Click "Add Task" to get started.</p>
                </div>
            `;
            return;
        }

        const tasksHTML = this.tasks.map(task => this.renderTaskRow(task)).join('');
        this.gridBody.innerHTML = tasksHTML;
    }

    renderTaskRow(task) {
        const isEditing = this.editingTask === task.id;
        
        if (isEditing) {
            return `
                <div class="task-row editing" data-task-id="${task.id}">
                    <div class="grid-cell">
                        <input type="text" class="task-edit-input task-name-input" value="${task.name}" placeholder="Task name...">
                    </div>
                    <div class="grid-cell">
                        <input type="date" class="task-edit-input task-date-input" value="${task.dueDate}">
                    </div>
                    <div class="grid-cell">
                        <select class="task-edit-select task-status-select">
                            <option value="ready_to_analyze" ${task.doneStatus === 'ready_to_analyze' ? 'selected' : ''}>Ready to Analyze</option>
                            <option value="complete_analyze" ${task.doneStatus === 'complete_analyze' ? 'selected' : ''}>Complete Analyze</option>
                            <option value="ready_to_development" ${task.doneStatus === 'ready_to_development' ? 'selected' : ''}>Ready to Development</option>
                            <option value="complete_development" ${task.doneStatus === 'complete_development' ? 'selected' : ''}>Complete Development</option>
                            <option value="ready_to_test" ${task.doneStatus === 'ready_to_test' ? 'selected' : ''}>Ready to Test</option>
                            <option value="test_done" ${task.doneStatus === 'test_done' ? 'selected' : ''}>Test Done</option>
                            <option value="ready_to_production" ${task.doneStatus === 'ready_to_production' ? 'selected' : ''}>Ready to Production</option>
                            <option value="production_done" ${task.doneStatus === 'production_done' ? 'selected' : ''}>Production Done</option>
                        </select>
                    </div>
                    <div class="grid-cell">
                        <textarea class="task-edit-textarea task-notes-input" placeholder="Notes...">${task.notes}</textarea>
                    </div>
                    <div class="grid-cell">
                        <div class="task-actions">
                            <button class="btn-icon btn-save" onclick="window.taskGrid.saveTask('${task.id}')" title="Save">
                                💾
                            </button>
                            <button class="btn-icon btn-cancel" onclick="window.taskGrid.cancelEdit()" title="Cancel">
                                ❌
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="task-row" data-task-id="${task.id}">
                    <div class="grid-cell task-cell-name">
                        ${task.name || '<em>Unnamed Task</em>'}
                    </div>
                    <div class="grid-cell task-cell-date">
                        ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </div>
                    <div class="grid-cell task-cell-status">
                        <span class="status-badge status-${task.doneStatus}">
                            ${this.getStatusDisplay(task.doneStatus)}
                        </span>
                    </div>
                    <div class="grid-cell task-cell-notes">
                        ${task.notes || '-'}
                    </div>
                    <div class="grid-cell task-cell-actions">
                        <div class="task-actions">
                            <button class="btn-icon btn-view" onclick="window.navigateToPage('task-detail', {taskId: '${task.id}'})" title="View Details">
                                👁️
                            </button>
                            <button class="btn-icon btn-edit" onclick="window.taskGrid.editTask('${task.id}')" title="Edit">
                                ✏️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.taskGrid.deleteTask('${task.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    getStatusDisplay(status) {
        const statusMap = {
            'ready_to_analyze': 'Ready to Analyze',
            'complete_analyze': 'Complete Analyze',
            'ready_to_development': 'Ready to Development', 
            'complete_development': 'Complete Development',
            'ready_to_test': 'Ready to Test',
            'test_done': 'Test Done',
            'ready_to_production': 'Ready to Production',
            'production_done': 'Production Done',
            // Legacy statuses for backward compatibility
            'complete': 'Complete',
            'overdue': 'Overdue', 
            'pending': 'Pending',
            'incomplete': 'Incomplete'
        };
        return statusMap[status] || status;
    }

    getAllTaskIds() {
        return this.tasks.filter(task => !task.isNew).map(task => task.id);
    }

    getSavedTaskIds() {
        return this.tasks.filter(task => !task.isNew && task.name && task.name.trim() !== '').map(task => task.id);
    }

    showTaskSaveSuccess(taskName) {
        // Create a temporary success message
        const message = document.createElement('div');
        message.className = 'task-save-success';
        message.textContent = `Task "${taskName}" saved!`;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-size: 0.9rem;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        document.body.appendChild(message);
        
        // Fade in
        setTimeout(() => {
            message.style.opacity = '1';
        }, 10);
        
        // Fade out and remove
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 300);
        }, 2000);
    }

    getAllTasks() {
        return this.tasks.filter(task => !task.isNew);
    }

    async saveAllTasks() {
        // First, update tasks with current form data
        this.updateTasksFromForm();
        
        const savedTaskIds = [];
        
        for (const task of this.tasks) {
            // Skip empty tasks
            if (!task.name || task.name.trim() === '') {
                continue;
            }
            
            // Ensure task has required fields
            task.name = task.name.trim();
            task.dueDate = task.dueDate || '';
            task.doneStatus = task.doneStatus || 'pending';
            task.notes = task.notes || '';
            task.subtaskIds = task.subtaskIds || [];
            
            try {
                if (task.isNew) {
                    // Save new task
                    task.isNew = false;
                    await window.dataManager.saveTask(task);
                    console.log(`Saved new task: ${task.id}`);
                } else {
                    // Update existing task
                    await window.dataManager.updateTask(task.id, task);
                    console.log(`Updated task: ${task.id}`);
                }
                
                savedTaskIds.push(task.id);
            } catch (error) {
                console.error(`Error saving task ${task.id}:`, error);
                // Continue with other tasks even if one fails
            }
        }
        
        return savedTaskIds;
    }

    updateTasksFromForm() {
        // Update task objects with current form field values
        this.tasks.forEach(task => {
            const taskRow = this.gridBody.querySelector(`[data-task-id="${task.id}"]`);
            if (taskRow) {
                const nameInput = taskRow.querySelector('.task-name-input');
                const dueDateInput = taskRow.querySelector('.task-date-input');
                const statusSelect = taskRow.querySelector('.task-status-select');
                const notesInput = taskRow.querySelector('.task-notes-input');

                if (nameInput) task.name = nameInput.value.trim();
                if (dueDateInput) task.dueDate = dueDateInput.value;
                if (statusSelect) task.doneStatus = statusSelect.value;
                if (notesInput) task.notes = notesInput.value;
            }
        });
    }

    loadTasks(taskIds) {
        if (!taskIds || taskIds.length === 0) {
            this.tasks = [];
            this.renderGrid();
            return;
        }

        window.dataManager.getTasksByIds(taskIds).then(tasks => {
            this.tasks = tasks;
            this.renderGrid();
        }).catch(error => {
            console.error('Error loading tasks:', error);
            this.tasks = [];
            this.renderGrid();
        });
    }

    loadTasksForEdit(taskIds) {
        this.loadTasks(taskIds);
    }

    clearAllTasks() {
        this.tasks = [];
        this.editingTask = null;
        this.renderGrid();
    }

    getTaskStats() {
        const stats = {
            total: this.tasks.filter(t => !t.isNew).length,
            complete: 0,
            pending: 0,
            overdue: 0,
            incomplete: 0
        };

        this.tasks.forEach(task => {
            if (!task.isNew) {
                stats[task.doneStatus] = (stats[task.doneStatus] || 0) + 1;
            }
        });

        return stats;
    }

    updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.doneStatus = newStatus;
            
            // Save to data manager
            if (!task.isNew) {
                window.dataManager.updateTask(taskId, { doneStatus: newStatus }).catch(error => {
                    console.error('Error updating task status:', error);
                });
            }
            
            this.renderGrid();
        }
    }

    searchTasks(query) {
        const filteredTasks = this.tasks.filter(task => {
            const searchText = `${task.name} ${task.notes}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });

        // Temporarily store original tasks
        const originalTasks = this.tasks;
        this.tasks = filteredTasks;
        this.renderGrid();
        
        return {
            restore: () => {
                this.tasks = originalTasks;
                this.renderGrid();
            }
        };
    }

    filterByStatus(status) {
        if (status === 'all') {
            this.renderGrid();
            return;
        }

        const filteredTasks = this.tasks.filter(task => task.doneStatus === status);
        
        // Temporarily store original tasks
        const originalTasks = this.tasks;
        this.tasks = filteredTasks;
        this.renderGrid();
        
        return {
            restore: () => {
                this.tasks = originalTasks;
                this.renderGrid();
            }
        };
    }


    importTasks(jsonData) {
        try {
            const tasksData = JSON.parse(jsonData);
            if (Array.isArray(tasksData)) {
                this.tasks = [...this.tasks, ...tasksData];
                this.renderGrid();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error importing tasks:', error);
            return false;
        }
    }
}

// Initialize global task grid
window.taskGrid = new TaskGrid();