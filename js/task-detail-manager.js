class TaskDetailManager {
    constructor() {
        this.currentTask = null;
        this.currentTaskId = null;
        this.statusWorkflow = [
            'ready_to_analyze',
            'complete_analyze', 
            'ready_to_development',
            'complete_development',
            'ready_to_test',
            'test_done',
            'ready_to_production',
            'production_done'
        ];
        this.statusLabels = {
            'ready_to_analyze': 'Ready to Analyze',
            'complete_analyze': 'Complete Analyze',
            'ready_to_development': 'Ready to Development', 
            'complete_development': 'Complete Development',
            'ready_to_test': 'Ready to Test',
            'test_done': 'Test Done',
            'ready_to_production': 'Ready to Production',
            'production_done': 'Production Done'
        };
    }

    async init(taskId) {
        this.currentTaskId = taskId;
        
        try {
            this.currentTask = await window.dataManager.getTask(taskId);
            if (!this.currentTask) {
                throw new Error('Task not found');
            }
            
            this.renderTaskDetails();
            this.renderWorkflowStatus();
            await this.renderParentIdea();
            await this.loadSubtasks();
            this.bindEvents();
            
        } catch (error) {
            console.error('Error initializing task detail:', error);
            this.showError('Failed to load task details');
        }
    }

    renderTaskDetails() {
        if (!this.currentTask) return;

        document.getElementById('task-title').textContent = `Task: ${this.currentTask.name}`;
        document.getElementById('task-name').textContent = this.currentTask.name;
        document.getElementById('task-due-date').textContent = this.currentTask.dueDate ? 
            new Date(this.currentTask.dueDate).toLocaleDateString() : '-';
        document.getElementById('task-created-at').textContent = this.currentTask.createdAt ?
            new Date(this.currentTask.createdAt).toLocaleString() : '-';
        document.getElementById('task-updated-at').textContent = this.currentTask.updatedAt ?
            new Date(this.currentTask.updatedAt).toLocaleString() : '-';
        document.getElementById('task-notes').textContent = this.currentTask.notes || '-';
    }

    renderWorkflowStatus() {
        if (!this.currentTask) return;

        const currentStatus = this.currentTask.doneStatus;
        const currentIndex = this.statusWorkflow.indexOf(currentStatus);
        
        // Update workflow visual indicators
        const workflowSteps = document.querySelectorAll('.workflow-step');
        workflowSteps.forEach((step, index) => {
            const stepStatus = step.getAttribute('data-status');
            const stepIndex = this.statusWorkflow.indexOf(stepStatus);
            
            step.classList.remove('completed', 'current', 'upcoming');
            
            if (stepIndex < currentIndex) {
                step.classList.add('completed');
            } else if (stepIndex === currentIndex) {
                step.classList.add('current');
            } else {
                step.classList.add('upcoming');
            }
        });

        // Update action buttons
        const prevBtn = document.getElementById('prev-status-btn');
        const nextBtn = document.getElementById('next-status-btn');
        
        if (prevBtn) {
            prevBtn.disabled = currentIndex <= 0;
        }
        if (nextBtn) {
            nextBtn.disabled = currentIndex >= this.statusWorkflow.length - 1;
            
            if (currentIndex >= this.statusWorkflow.length - 1) {
                nextBtn.textContent = '✓ Completed';
            } else {
                nextBtn.textContent = 'Next Stage →';
            }
        }
    }

    async findParentIdea() {
        try {
            const ideas = await window.dataManager.loadDataFile('ideas');
            return ideas.find(idea => 
                idea.taskIds && idea.taskIds.includes(this.currentTaskId)
            );
        } catch (error) {
            console.error('Error finding parent idea:', error);
            return null;
        }
    }

    async renderParentIdea() {
        const parentIdea = await this.findParentIdea();
        const parentIdeaText = document.getElementById('parent-idea-text');
        
        if (parentIdeaText) {
            if (parentIdea) {
                parentIdeaText.textContent = parentIdea.name;
                this.parentIdea = parentIdea;
            } else {
                parentIdeaText.textContent = 'No parent idea found';
                this.parentIdea = null;
            }
        }
    }

    openParentIdea() {
        if (this.parentIdea) {
            // Navigate to idea-planner with the parent idea for editing
            window.navigateToPage('idea-planner', { ideaId: this.parentIdea.id });
        } else {
            this.showError('No parent idea found for this task');
        }
    }

    openStatusSelector() {
        const modal = document.getElementById('status-selector-modal');
        const statusOptions = document.getElementById('status-options');
        
        // Create status options
        const optionsHTML = this.statusWorkflow.map(status => {
            const isCurrentStatus = status === this.currentTask.doneStatus;
            return `
                <div class="status-option ${isCurrentStatus ? 'current-option' : ''}" 
                     data-status="${status}"
                     onclick="window.taskDetailManager.selectStatus('${status}')">
                    <span class="status-label">${this.statusLabels[status]}</span>
                    ${isCurrentStatus ? '<span class="current-indicator">✓</span>' : ''}
                </div>
            `;
        }).join('');
        
        statusOptions.innerHTML = optionsHTML;
        modal.style.display = 'block';
    }

    async selectStatus(newStatus) {
        await this.updateTaskStatus(newStatus);
        this.closeStatusModal();
    }

    closeStatusModal() {
        document.getElementById('status-selector-modal').style.display = 'none';
    }

    async nextStatus() {
        if (!this.currentTask) return;
        
        const currentIndex = this.statusWorkflow.indexOf(this.currentTask.doneStatus);
        if (currentIndex < this.statusWorkflow.length - 1) {
            const newStatus = this.statusWorkflow[currentIndex + 1];
            await this.updateTaskStatus(newStatus);
        }
    }

    async previousStatus() {
        if (!this.currentTask) return;
        
        const currentIndex = this.statusWorkflow.indexOf(this.currentTask.doneStatus);
        if (currentIndex > 0) {
            const newStatus = this.statusWorkflow[currentIndex - 1];
            await this.updateTaskStatus(newStatus);
        }
    }

    async updateTaskStatus(newStatus) {
        try {
            this.currentTask.doneStatus = newStatus;
            this.currentTask.updatedAt = new Date().toISOString();
            
            await window.dataManager.updateTask(this.currentTaskId, this.currentTask);
            
            this.renderTaskDetails();
            this.renderWorkflowStatus();
            this.showSuccess(`Status updated to: ${this.statusLabels[newStatus]}`);
            
        } catch (error) {
            console.error('Error updating task status:', error);
            this.showError('Failed to update task status');
        }
    }

    async loadSubtasks() {
        try {
            const subtaskIds = this.currentTask.subtaskIds || [];
            const subtasks = await window.dataManager.getSubtasksByIds(subtaskIds);
            
            this.renderSubtasks(subtasks);
            
        } catch (error) {
            console.error('Error loading subtasks:', error);
            this.showError('Failed to load subtasks');
        }
    }

    renderSubtasks(subtasks) {
        const subtasksList = document.getElementById('subtasks-list');
        const emptySubtasks = document.getElementById('empty-subtasks');
        
        if (!subtasks || subtasks.length === 0) {
            emptySubtasks.style.display = 'block';
            return;
        }
        
        emptySubtasks.style.display = 'none';
        
        const subtasksHTML = subtasks.map(subtask => `
            <div class="subtask-item" data-subtask-id="${subtask.id}">
                <div class="subtask-info">
                    <div class="subtask-name">${subtask.name}</div>
                    <div class="subtask-meta">
                        <span class="subtask-status status-${subtask.status}">${subtask.status}</span>
                        <span class="subtask-date">Created: ${new Date(subtask.createdAt).toLocaleDateString()}</span>
                    </div>
                    ${subtask.description ? `<div class="subtask-description">${subtask.description}</div>` : ''}
                </div>
                <div class="subtask-actions">
                    <button class="btn-icon" onclick="window.taskDetailManager.openSubtask('${subtask.id}')" title="View Details">
                        👁️
                    </button>
                    <button class="btn-icon btn-danger" onclick="window.taskDetailManager.deleteSubtask('${subtask.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
        
        const existingSubtasks = subtasksList.querySelectorAll('.subtask-item');
        existingSubtasks.forEach(item => item.remove());
        
        subtasksList.insertAdjacentHTML('beforeend', subtasksHTML);
    }

    createSubtask() {
        document.getElementById('create-subtask-modal').style.display = 'block';
        document.getElementById('subtask-name').focus();
    }

    closeModal() {
        document.getElementById('create-subtask-modal').style.display = 'none';
        document.getElementById('create-subtask-form').reset();
    }

    bindEvents() {
        const createSubtaskForm = document.getElementById('create-subtask-form');
        if (createSubtaskForm) {
            createSubtaskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateSubtask(createSubtaskForm);
            });
        }
    }

    async handleCreateSubtask(form) {
        try {
            const formData = new FormData(form);
            const now = new Date().toISOString();
            
            const subtaskData = {
                id: window.idGenerator.generateId('subtask'),
                taskId: this.currentTaskId,
                name: formData.get('name').trim(),
                description: formData.get('description')?.trim() || '',
                status: 'start',
                comments: [],
                efforts: [],
                createdAt: now,
                updatedAt: now
            };

            await window.dataManager.saveSubtask(subtaskData);
            
            // Update task's subtaskIds
            this.currentTask.subtaskIds = this.currentTask.subtaskIds || [];
            this.currentTask.subtaskIds.push(subtaskData.id);
            this.currentTask.updatedAt = now;
            
            await window.dataManager.updateTask(this.currentTaskId, this.currentTask);
            
            this.closeModal();
            await this.loadSubtasks();
            this.showSuccess('Subtask created successfully');
            
        } catch (error) {
            console.error('Error creating subtask:', error);
            this.showError('Failed to create subtask');
        }
    }

    openSubtask(subtaskId) {
        // Navigate to subtask detail page
        window.navigateToPage('subtask-detail', { subtaskId: subtaskId, taskId: this.currentTaskId });
    }

    async deleteSubtask(subtaskId) {
        if (!confirm('Are you sure you want to delete this subtask?')) {
            return;
        }

        try {
            await window.dataManager.deleteSubtask(subtaskId);
            
            // Update task's subtaskIds
            this.currentTask.subtaskIds = this.currentTask.subtaskIds.filter(id => id !== subtaskId);
            this.currentTask.updatedAt = new Date().toISOString();
            
            await window.dataManager.updateTask(this.currentTaskId, this.currentTask);
            
            await this.loadSubtasks();
            this.showSuccess('Subtask deleted successfully');
            
        } catch (error) {
            console.error('Error deleting subtask:', error);
            this.showError('Failed to delete subtask');
        }
    }

    editTask() {
        // Navigate to task edit mode
        window.navigateToPage('create-project');
        // TODO: Implement task edit mode similar to idea edit
    }

    async deleteTask() {
        if (!confirm('Are you sure you want to delete this task? This will also delete all subtasks.')) {
            return;
        }

        try {
            // Delete all subtasks first
            const subtaskIds = this.currentTask.subtaskIds || [];
            for (const subtaskId of subtaskIds) {
                await window.dataManager.deleteSubtask(subtaskId);
            }
            
            // Delete the task
            await window.dataManager.deleteTask(this.currentTaskId);
            
            this.showSuccess('Task deleted successfully');
            
            // Navigate back
            setTimeout(() => {
                history.back();
            }, 1500);
            
        } catch (error) {
            console.error('Error deleting task:', error);
            this.showError('Failed to delete task');
        }
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.detail-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `detail-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            ${type === 'success' ? 'background-color: #28a745;' : 'background-color: #dc3545;'}
        `;

        document.body.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.taskDetailManager = new TaskDetailManager();
});