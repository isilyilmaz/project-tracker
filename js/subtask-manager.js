class SubtaskManager {
    constructor() {
        this.lifecycle = ['Analyze', 'Development', 'Test', 'Production'];
        this.stageColors = {
            'Analyze': '#6c757d',      // Gray
            'Development': '#007bff',   // Blue
            'Test': '#fd7e14',         // Orange
            'Production': '#28a745'    // Green
        };
        this.stageIcons = {
            'Analyze': '🔍',
            'Development': '⚙️',
            'Test': '🧪',
            'Production': '🚀'
        };
    }

    validateStageProgression(currentStage, newStage) {
        const currentIndex = this.lifecycle.indexOf(currentStage);
        const newIndex = this.lifecycle.indexOf(newStage);
        
        if (currentIndex === -1) {
            throw new Error(`Invalid current stage: ${currentStage}`);
        }
        
        if (newIndex === -1) {
            throw new Error(`Invalid new stage: ${newStage}`);
        }
        
        if (newIndex < currentIndex) {
            throw new Error(`Cannot regress from ${currentStage} to ${newStage}. Subtask lifecycle only moves forward.`);
        }
        
        return true;
    }

    getNextStage(currentStage) {
        const currentIndex = this.lifecycle.indexOf(currentStage);
        
        if (currentIndex === -1) {
            throw new Error(`Invalid stage: ${currentStage}`);
        }
        
        if (currentIndex === this.lifecycle.length - 1) {
            return null; // Already at final stage
        }
        
        return this.lifecycle[currentIndex + 1];
    }

    getPreviousStages(currentStage) {
        const currentIndex = this.lifecycle.indexOf(currentStage);
        return this.lifecycle.slice(0, currentIndex);
    }

    getAvailableStages(currentStage) {
        const currentIndex = this.lifecycle.indexOf(currentStage);
        return this.lifecycle.slice(currentIndex);
    }

    isStageAccessible(currentStage, targetStage) {
        const currentIndex = this.lifecycle.indexOf(currentStage);
        const targetIndex = this.lifecycle.indexOf(targetStage);
        
        return targetIndex >= currentIndex;
    }

    async advanceSubtask(subtaskId) {
        try {
            const subtask = await window.dataManager.getSubtask(subtaskId);
            if (!subtask) {
                throw new Error('Subtask not found');
            }

            const nextStage = this.getNextStage(subtask.taskType);
            if (!nextStage) {
                throw new Error('Subtask is already at the final stage');
            }

            await window.dataManager.updateSubtask(subtaskId, { 
                taskType: nextStage,
                lastAdvanced: new Date().toISOString()
            });

            this.showProgressNotification(subtask.name, subtask.taskType, nextStage);
            
            return await window.dataManager.getSubtask(subtaskId);
        } catch (error) {
            console.error('Error advancing subtask:', error);
            throw error;
        }
    }

    async createSubtask(taskId, subtaskData) {
        try {
            // Ensure subtask starts at Analyze stage and follows schema: { id, name, dueDate, taskType, assignee }
            const newSubtask = {
                id: window.idGenerator.generateId('subtask'),
                name: subtaskData.name,
                dueDate: subtaskData.dueDate,
                taskType: 'Analyze', // Always start at Analyze
                assignee: subtaskData.assignee || ''
            };

            const savedSubtask = await window.dataManager.saveSubtask(newSubtask);

            // Add subtask ID to parent task
            const task = await window.dataManager.getTask(taskId);
            if (task) {
                const updatedSubtaskIds = [...(task.subtaskIds || []), savedSubtask.id];
                await window.dataManager.updateTask(taskId, { subtaskIds: updatedSubtaskIds });
            }

            return savedSubtask;
        } catch (error) {
            console.error('Error creating subtask:', error);
            throw error;
        }
    }

    renderSubtaskCard(subtask) {
        const nextStage = this.getNextStage(subtask.taskType);
        const stageColor = this.stageColors[subtask.taskType];
        const stageIcon = this.stageIcons[subtask.taskType];
        const canAdvance = nextStage !== null;

        return `
            <div class="subtask-card" data-subtask-id="${subtask.id}">
                <div class="subtask-header">
                    <div class="subtask-info">
                        <h4 class="subtask-name">${subtask.name}</h4>
                        <div class="subtask-meta">
                            <span class="subtask-assignee">👤 ${subtask.assignee || 'Unassigned'}</span>
                            <span class="subtask-due">📅 ${new Date(subtask.dueDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="subtask-actions">
                        <button class="btn-icon btn-edit" onclick="window.subtaskManager.editSubtask('${subtask.id}')" title="Edit Subtask">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="window.subtaskManager.deleteSubtask('${subtask.id}')" title="Delete Subtask">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="subtask-progress">
                    <div class="stage-timeline">
                        ${this.renderStageTimeline(subtask.taskType)}
                    </div>
                    
                    <div class="current-stage" style="background-color: ${stageColor}; color: white;">
                        <span class="stage-icon">${stageIcon}</span>
                        <span class="stage-name">${subtask.taskType}</span>
                    </div>
                    
                    ${canAdvance ? `
                        <button class="btn btn-advance" onclick="window.subtaskManager.advanceSubtask('${subtask.id}')">
                            Advance to ${nextStage} →
                        </button>
                    ` : `
                        <div class="stage-complete">
                            <span class="complete-icon">✅</span>
                            <span>Complete</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderStageTimeline(currentStage) {
        const currentIndex = this.lifecycle.indexOf(currentStage);
        
        return this.lifecycle.map((stage, index) => {
            const isPassed = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const stageClass = isPassed ? (isCurrent ? 'current' : 'completed') : 'pending';
            
            return `
                <div class="timeline-stage ${stageClass}" title="${stage}">
                    <div class="timeline-dot" style="background-color: ${isPassed ? this.stageColors[stage] : '#dee2e6'}">
                        ${isPassed ? this.stageIcons[stage] : '○'}
                    </div>
                    <div class="timeline-label">${stage}</div>
                </div>
            `;
        }).join('');
    }

    async renderSubtasksForTask(taskId, containerSelector) {
        try {
            const task = await window.dataManager.getTask(taskId);
            const container = document.querySelector(containerSelector);
            
            if (!container) {
                console.error('Subtasks container not found:', containerSelector);
                return;
            }

            if (!task || !task.subtaskIds || task.subtaskIds.length === 0) {
                container.innerHTML = `
                    <div class="no-subtasks">
                        <p>No subtasks yet. <button class="btn-link" onclick="window.subtaskManager.showCreateSubtaskModal('${taskId}')">Add first subtask</button></p>
                    </div>
                `;
                return;
            }

            const subtasks = await window.dataManager.getSubtasksByIds(task.subtaskIds);
            
            container.innerHTML = `
                <div class="subtasks-header">
                    <h3>Subtasks</h3>
                    <button class="btn btn-small" onclick="window.subtaskManager.showCreateSubtaskModal('${taskId}')">
                        + Add Subtask
                    </button>
                </div>
                <div class="subtasks-list">
                    ${subtasks.map(subtask => this.renderSubtaskCard(subtask)).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error rendering subtasks:', error);
        }
    }

    showCreateSubtaskModal(taskId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Subtask</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <form id="create-subtask-form" class="modal-body">
                    <div class="form-group">
                        <label for="subtask-name">Subtask Name *</label>
                        <input type="text" id="subtask-name" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="subtask-assignee">Assignee</label>
                        <input type="text" id="subtask-assignee" class="form-input" placeholder="Enter assignee name">
                    </div>
                    
                    <div class="form-group">
                        <label for="subtask-due">Due Date</label>
                        <input type="date" id="subtask-due" class="form-input">
                    </div>
                    
                    <div class="form-info">
                        <p><strong>Note:</strong> All subtasks start at the "Analyze" stage and progress through: Analyze → Development → Test → Production</p>
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Cancel
                    </button>
                    <button type="submit" form="create-subtask-form" class="btn btn-primary">
                        Create Subtask
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = modal.querySelector('#create-subtask-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const subtaskData = {
                name: formData.get('subtask-name') || document.getElementById('subtask-name').value,
                assignee: formData.get('subtask-assignee') || document.getElementById('subtask-assignee').value,
                dueDate: formData.get('subtask-due') || document.getElementById('subtask-due').value || new Date().toISOString().split('T')[0]
            };

            try {
                await this.createSubtask(taskId, subtaskData);
                modal.remove();
                
                // Refresh subtasks display
                this.renderSubtasksForTask(taskId, '.subtasks-container');
                
                this.showNotification('Subtask created successfully!', 'success');
            } catch (error) {
                console.error('Error creating subtask:', error);
                this.showNotification('Error creating subtask: ' + error.message, 'error');
            }
        });
    }

    async editSubtask(subtaskId) {
        try {
            const subtask = await window.dataManager.getSubtask(subtaskId);
            if (!subtask) {
                throw new Error('Subtask not found');
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Subtask</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <form id="edit-subtask-form" class="modal-body">
                        <div class="form-group">
                            <label for="edit-subtask-name">Subtask Name *</label>
                            <input type="text" id="edit-subtask-name" class="form-input" value="${subtask.name}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-subtask-assignee">Assignee</label>
                            <input type="text" id="edit-subtask-assignee" class="form-input" value="${subtask.assignee || ''}" placeholder="Enter assignee name">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-subtask-due">Due Date</label>
                            <input type="date" id="edit-subtask-due" class="form-input" value="${subtask.dueDate}">
                        </div>
                        
                        <div class="form-group">
                            <label>Current Stage</label>
                            <div class="stage-display" style="background-color: ${this.stageColors[subtask.taskType]}; color: white; padding: 0.5rem; border-radius: 4px;">
                                ${this.stageIcons[subtask.taskType]} ${subtask.taskType}
                            </div>
                            <p class="form-help">Stage progression is managed separately through the "Advance" button.</p>
                        </div>
                    </form>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                            Cancel
                        </button>
                        <button type="submit" form="edit-subtask-form" class="btn btn-primary">
                            Save Changes
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle form submission
            const form = modal.querySelector('#edit-subtask-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const updatedData = {
                    name: document.getElementById('edit-subtask-name').value,
                    assignee: document.getElementById('edit-subtask-assignee').value,
                    dueDate: document.getElementById('edit-subtask-due').value
                };

                try {
                    await window.dataManager.updateSubtask(subtaskId, updatedData);
                    modal.remove();
                    
                    // Refresh subtasks display
                    this.renderSubtasksForTask(subtask.taskId, '.subtasks-container');
                    
                    this.showNotification('Subtask updated successfully!', 'success');
                } catch (error) {
                    console.error('Error updating subtask:', error);
                    this.showNotification('Error updating subtask: ' + error.message, 'error');
                }
            });
        } catch (error) {
            console.error('Error editing subtask:', error);
            this.showNotification('Error loading subtask: ' + error.message, 'error');
        }
    }

    async deleteSubtask(subtaskId) {
        try {
            const subtask = await window.dataManager.getSubtask(subtaskId);
            if (!subtask) {
                throw new Error('Subtask not found');
            }

            const confirmDelete = confirm(`Are you sure you want to delete the subtask "${subtask.name}"? This action cannot be undone.`);
            if (!confirmDelete) return;

            await window.dataManager.deleteSubtask(subtaskId);
            
            // Refresh subtasks display
            this.renderSubtasksForTask(subtask.taskId, '.subtasks-container');
            
            this.showNotification('Subtask deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting subtask:', error);
            this.showNotification('Error deleting subtask: ' + error.message, 'error');
        }
    }

    showProgressNotification(subtaskName, fromStage, toStage) {
        const notification = document.createElement('div');
        notification.className = 'progress-notification';
        notification.innerHTML = `
            <div class="progress-content">
                <div class="progress-icon">🎉</div>
                <div class="progress-message">
                    <strong>${subtaskName}</strong> advanced from 
                    <span style="color: ${this.stageColors[fromStage]}">${fromStage}</span> to 
                    <span style="color: ${this.stageColors[toStage]}">${toStage}</span>
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialize global subtask manager
window.subtaskManager = new SubtaskManager();