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
            doneStatus: 'pending',
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
            task.name = nameInput.value.trim();
            task.dueDate = dueDateInput.value;
            task.doneStatus = statusSelect.value;
            task.notes = notesInput.value;
            task.subtaskIds = task.subtaskIds || []; // Ensure subtaskIds array exists
            task.isNew = false;

            // Save to data manager (which will create JSON file)
            try {
                if (task.isNew !== false) {
                    await window.dataManager.saveTask(task);
                } else {
                    await window.dataManager.updateTask(taskId, task);
                }
            } catch (error) {
                console.error('Error saving task:', error);
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
                            <option value="pending" ${task.doneStatus === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="incomplete" ${task.doneStatus === 'incomplete' ? 'selected' : ''}>Incomplete</option>
                            <option value="complete" ${task.doneStatus === 'complete' ? 'selected' : ''}>Complete</option>
                            <option value="overdue" ${task.doneStatus === 'overdue' ? 'selected' : ''}>Overdue</option>
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
            complete: 'Complete',
            overdue: 'Overdue', 
            pending: 'Pending',
            incomplete: 'Incomplete'
        };
        return statusMap[status] || status;
    }

    getAllTaskIds() {
        return this.tasks.filter(task => !task.isNew).map(task => task.id);
    }

    getAllTasks() {
        return this.tasks.filter(task => !task.isNew);
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

    exportTasks() {
        const tasksData = this.getAllTasks();
        const dataStr = JSON.stringify(tasksData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `tasks_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
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