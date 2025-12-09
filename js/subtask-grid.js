class SubtaskGrid {
    constructor() {
        this.subtasks = [];
        this.editingSubtask = null;
        this.gridContainer = null;
        this.gridBody = null;
        this.initialized = false;
        this.parentTaskId = null;
    }

    initialize(gridId = 'subtasks-task-grid', parentTaskId = null) {
        this.gridContainer = document.getElementById(gridId);
        this.gridBody = document.getElementById('subtasks-grid-body');
        this.parentTaskId = parentTaskId;
        
        if (!this.gridContainer || !this.gridBody) {
            console.error('Subtask grid elements not found');
            return;
        }

        this.initialized = true;
        this.renderGrid();
        this.bindEvents();
    }

    bindEvents() {
        // Global function for adding new subtask
        window.addNewSubtask = () => this.addNewSubtask();
    }

    addNewSubtask() {
        const newSubtask = {
            id: window.idGenerator.generateId('subtask'),
            taskId: this.parentTaskId,
            name: '',
            description: '',
            status: 'start',
            comments: [],
            efforts: [],
            isNew: true
        };

        this.subtasks.push(newSubtask);
        this.editingSubtask = newSubtask.id;
        this.renderGrid();
        
        // Focus on the first input
        setTimeout(() => {
            const firstInput = this.gridBody.querySelector('.subtask-edit-input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    editSubtask(subtaskId) {
        this.editingSubtask = subtaskId;
        this.renderGrid();
        
        // Focus on the subtask name input
        setTimeout(() => {
            const nameInput = this.gridBody.querySelector(`[data-subtask-id="${subtaskId}"] .subtask-edit-input`);
            if (nameInput) nameInput.focus();
        }, 100);
    }

    async saveSubtask(subtaskId) {
        const subtaskRow = this.gridBody.querySelector(`[data-subtask-id="${subtaskId}"]`);
        if (!subtaskRow) return;

        const nameInput = subtaskRow.querySelector('.subtask-name-input');
        const statusSelect = subtaskRow.querySelector('.subtask-status-select');
        const descriptionInput = subtaskRow.querySelector('.subtask-description-input');

        if (!nameInput.value.trim()) {
            alert('Subtask name is required');
            nameInput.focus();
            return;
        }

        const subtask = this.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            const now = new Date().toISOString();
            const wasNew = subtask.isNew;
            
            subtask.name = nameInput.value.trim();
            subtask.status = statusSelect.value;
            subtask.description = descriptionInput.value;
            subtask.taskId = this.parentTaskId;
            
            // Add timestamps
            if (wasNew) {
                subtask.createdAt = now;
                subtask.comments = subtask.comments || [];
                subtask.efforts = subtask.efforts || [];
            }
            subtask.updatedAt = now;
            subtask.isNew = false;

            // Save to data manager
            try {
                // Create clean subtask object with only allowed schema fields
                const subtaskData = {
                    id: subtask.id,
                    taskId: subtask.taskId,
                    name: subtask.name,
                    description: subtask.description,
                    status: subtask.status,
                    comments: subtask.comments,
                    efforts: subtask.efforts,
                    createdAt: subtask.createdAt,
                    updatedAt: subtask.updatedAt
                };
                
                if (wasNew) {
                    await window.dataManager.saveSubtask(subtaskData);
                    
                    // Update parent task's subtaskIds
                    if (this.parentTaskId && window.taskDetailManager) {
                        const parentTask = window.taskDetailManager.currentTask;
                        if (parentTask) {
                            parentTask.subtaskIds = parentTask.subtaskIds || [];
                            parentTask.subtaskIds.push(subtask.id);
                            parentTask.updatedAt = now;
                            await window.dataManager.updateTask(this.parentTaskId, parentTask);
                        }
                    }
                    
                    console.log(`Subtask saved: ${subtask.name}`);
                } else {
                    // Check if subtask exists in database before updating
                    try {
                        const existingSubtask = await window.dataManager.getSubtask(subtaskId);
                        if (existingSubtask) {
                            await window.dataManager.updateSubtask(subtaskId, subtaskData);
                            console.log(`Subtask updated: ${subtask.name}`);
                        } else {
                            // Subtask doesn't exist, save as new
                            await window.dataManager.saveSubtask(subtaskData);
                            
                            // Update parent task's subtaskIds
                            if (this.parentTaskId && window.taskDetailManager) {
                                const parentTask = window.taskDetailManager.currentTask;
                                if (parentTask) {
                                    parentTask.subtaskIds = parentTask.subtaskIds || [];
                                    parentTask.subtaskIds.push(subtask.id);
                                    parentTask.updatedAt = now;
                                    await window.dataManager.updateTask(this.parentTaskId, parentTask);
                                }
                            }
                            
                            console.log(`Subtask saved: ${subtask.name}`);
                        }
                    } catch (error) {
                        // If getSubtask fails, assume it doesn't exist and save as new
                        await window.dataManager.saveSubtask(subtaskData);
                        
                        // Update parent task's subtaskIds
                        if (this.parentTaskId && window.taskDetailManager) {
                            const parentTask = window.taskDetailManager.currentTask;
                            if (parentTask) {
                                parentTask.subtaskIds = parentTask.subtaskIds || [];
                                parentTask.subtaskIds.push(subtask.id);
                                parentTask.updatedAt = now;
                                await window.dataManager.updateTask(this.parentTaskId, parentTask);
                            }
                        }
                        
                        console.log(`Subtask saved: ${subtask.name}`);
                    }
                }
                
                // Show success feedback
                this.showSubtaskSaveSuccess(subtask.name);
            } catch (error) {
                console.error('Error saving subtask:', error);
                alert('Failed to save subtask. Please try again.');
                return;
            }
        }

        this.editingSubtask = null;
        this.renderGrid();
    }

    cancelEdit() {
        if (this.editingSubtask) {
            const subtask = this.subtasks.find(s => s.id === this.editingSubtask);
            if (subtask && subtask.isNew) {
                // Remove new subtask if cancelling
                this.subtasks = this.subtasks.filter(s => s.id !== this.editingSubtask);
            }
        }
        
        this.editingSubtask = null;
        this.renderGrid();
    }

    async deleteSubtask(subtaskId) {
        if (confirm('Are you sure you want to delete this subtask?')) {
            this.subtasks = this.subtasks.filter(s => s.id !== subtaskId);
            
            try {
                await window.dataManager.deleteSubtask(subtaskId);
                
                // Update parent task's subtaskIds
                if (this.parentTaskId && window.taskDetailManager) {
                    const parentTask = window.taskDetailManager.currentTask;
                    if (parentTask && parentTask.subtaskIds) {
                        parentTask.subtaskIds = parentTask.subtaskIds.filter(id => id !== subtaskId);
                        parentTask.updatedAt = new Date().toISOString();
                        await window.dataManager.updateTask(this.parentTaskId, parentTask);
                    }
                }
            } catch (error) {
                console.error('Error deleting subtask:', error);
            }
            
            this.renderGrid();
        }
    }

    renderGrid() {
        if (!this.gridBody) return;

        if (this.subtasks.length === 0) {
            this.gridBody.innerHTML = `
                <div class="empty-subtasks">
                    <p>No subtasks added yet. Click "Add Subtask" to get started.</p>
                </div>
            `;
            return;
        }

        const subtasksHTML = this.subtasks.map(subtask => this.renderSubtaskRow(subtask)).join('');
        this.gridBody.innerHTML = subtasksHTML;
    }

    renderSubtaskRow(subtask) {
        const isEditing = this.editingSubtask === subtask.id;
        
        if (isEditing) {
            return `
                <div class="task-row editing" data-subtask-id="${subtask.id}">
                    <div class="grid-cell">
                        <input type="text" class="task-edit-input subtask-edit-input subtask-name-input" value="${subtask.name}" placeholder="Subtask name...">
                    </div>
                    <div class="grid-cell">
                        <select class="task-edit-select subtask-status-select">
                            <option value="start" ${subtask.status === 'start' ? 'selected' : ''}>Start</option>
                            <option value="done" ${subtask.status === 'done' ? 'selected' : ''}>Done</option>
                        </select>
                    </div>
                    <div class="grid-cell">
                        ${subtask.createdAt ? new Date(subtask.createdAt).toLocaleDateString() : '-'}
                    </div>
                    <div class="grid-cell">
                        <textarea class="task-edit-textarea subtask-description-input" placeholder="Description...">${subtask.description}</textarea>
                    </div>
                    <div class="grid-cell">
                        <div class="task-actions">
                            <button class="btn-icon btn-save" onclick="window.subtaskGrid.saveSubtask('${subtask.id}')" title="Save">
                                💾
                            </button>
                            <button class="btn-icon btn-cancel" onclick="window.subtaskGrid.cancelEdit()" title="Cancel">
                                ❌
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="task-row" data-subtask-id="${subtask.id}">
                    <div class="grid-cell task-cell-name">
                        ${subtask.name || '<em>Unnamed Subtask</em>'}
                    </div>
                    <div class="grid-cell task-cell-status">
                        <span class="status-badge status-${subtask.status}">
                            ${this.getStatusDisplay(subtask.status)}
                        </span>
                    </div>
                    <div class="grid-cell task-cell-date">
                        ${subtask.createdAt ? new Date(subtask.createdAt).toLocaleDateString() : '-'}
                    </div>
                    <div class="grid-cell task-cell-description">
                        ${subtask.description ? (subtask.description.length > 50 ? subtask.description.substring(0, 50) + '...' : subtask.description) : '-'}
                    </div>
                    <div class="grid-cell task-cell-actions">
                        <div class="task-actions">
                            <button class="btn-icon btn-view" onclick="window.navigateToPage('subtask-detail', {subtaskId: '${subtask.id}', taskId: '${this.parentTaskId}'})" title="View Details">
                                👁️
                            </button>
                            <button class="btn-icon btn-edit" onclick="window.subtaskGrid.editSubtask('${subtask.id}')" title="Edit">
                                ✏️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.subtaskGrid.deleteSubtask('${subtask.id}')" title="Delete">
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
            'start': 'Start',
            'done': 'Done'
        };
        return statusMap[status] || status;
    }

    getAllSubtaskIds() {
        return this.subtasks.filter(subtask => !subtask.isNew).map(subtask => subtask.id);
    }

    getSavedSubtaskIds() {
        return this.subtasks.filter(subtask => !subtask.isNew && subtask.name && subtask.name.trim() !== '').map(subtask => subtask.id);
    }

    showSubtaskSaveSuccess(subtaskName) {
        // Create a temporary success message
        const message = document.createElement('div');
        message.className = 'subtask-save-success';
        message.textContent = `Subtask "${subtaskName}" saved!`;
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

    getAllSubtasks() {
        return this.subtasks.filter(subtask => !subtask.isNew);
    }

    loadSubtasks(subtaskIds) {
        if (!subtaskIds || subtaskIds.length === 0) {
            this.subtasks = [];
            this.renderGrid();
            return;
        }

        window.dataManager.getSubtasksByIds(subtaskIds).then(subtasks => {
            this.subtasks = subtasks || [];
            this.renderGrid();
        }).catch(error => {
            console.error('Error loading subtasks:', error);
            this.subtasks = [];
            this.renderGrid();
        });
    }

    clearAllSubtasks() {
        this.subtasks = [];
        this.editingSubtask = null;
        this.renderGrid();
    }

    getSubtaskStats() {
        const stats = {
            total: this.subtasks.filter(s => !s.isNew).length,
            start: 0,
            done: 0
        };

        this.subtasks.forEach(subtask => {
            if (!subtask.isNew) {
                stats[subtask.status] = (stats[subtask.status] || 0) + 1;
            }
        });

        return stats;
    }

    updateSubtaskStatus(subtaskId, newStatus) {
        const subtask = this.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            subtask.status = newStatus;
            
            // Save to data manager
            if (!subtask.isNew) {
                window.dataManager.updateSubtask(subtaskId, { status: newStatus }).catch(error => {
                    console.error('Error updating subtask status:', error);
                });
            }
            
            this.renderGrid();
        }
    }

    searchSubtasks(query) {
        const filteredSubtasks = this.subtasks.filter(subtask => {
            const searchText = `${subtask.name} ${subtask.description}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });

        // Temporarily store original subtasks
        const originalSubtasks = this.subtasks;
        this.subtasks = filteredSubtasks;
        this.renderGrid();
        
        return {
            restore: () => {
                this.subtasks = originalSubtasks;
                this.renderGrid();
            }
        };
    }

    filterByStatus(status) {
        if (status === 'all') {
            this.renderGrid();
            return;
        }

        const filteredSubtasks = this.subtasks.filter(subtask => subtask.status === status);
        
        // Temporarily store original subtasks
        const originalSubtasks = this.subtasks;
        this.subtasks = filteredSubtasks;
        this.renderGrid();
        
        return {
            restore: () => {
                this.subtasks = originalSubtasks;
                this.renderGrid();
            }
        };
    }
}

// Initialize global subtask grid
window.subtaskGrid = new SubtaskGrid();