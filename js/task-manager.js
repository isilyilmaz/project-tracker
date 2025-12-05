class TaskManager {
    constructor() {
        this.isVisible = false;
        this.currentView = 'grid'; // 'grid' or 'list'
        this.currentEditSubtask = null;
        this.filteredIdeas = [];
        this.taskManagerContainer = null;
        this.inlineEditContainer = null;
        
        // Cache for performance
        this.tasksCache = [];
        this.subtasksCache = [];
        this.assigneesCache = new Set();
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Initialize task manager if we're on all-ideas page
        this.taskManagerContainer = document.getElementById('task-manager-placeholder');
        
        // Bind global event listeners
        this.bindEventListeners();
    }

    bindEventListeners() {
        // Listen for search input
        document.addEventListener('input', (e) => {
            if (e.target.id === 'tm-search') {
                this.handleSearch(e.target.value);
            }
        });

        // Listen for filter changes
        document.addEventListener('change', (e) => {
            if (e.target.id && e.target.id.startsWith('tm-')) {
                this.handleFilterChange();
            }
        });
    }

    async toggle() {
        if (this.isVisible) {
            await this.hide();
        } else {
            await this.show();
        }
    }

    async show() {
        if (!this.taskManagerContainer) {
            console.error('Task manager container not found');
            return;
        }

        try {
            // Load task manager HTML if not already loaded
            if (!this.taskManagerContainer.innerHTML.trim()) {
                const response = await fetch('pages/task-manager.html');
                if (response.ok) {
                    this.taskManagerContainer.innerHTML = await response.text();
                } else {
                    throw new Error('Failed to load task manager');
                }
            }

            // Show container with animation
            this.taskManagerContainer.style.display = 'block';
            setTimeout(() => {
                this.taskManagerContainer.classList.add('visible');
            }, 10);

            this.isVisible = true;

            // Load data and render
            await this.loadData();
            this.render();

            // Update button text
            const toggleBtn = document.querySelector('.btn-task-manager');
            if (toggleBtn) {
                toggleBtn.innerHTML = '❌ Close Manager';
            }

        } catch (error) {
            console.error('Error showing task manager:', error);
            this.showNotification('Error loading task manager', 'error');
        }
    }

    async hide() {
        if (!this.taskManagerContainer) return;

        // Hide with animation
        this.taskManagerContainer.classList.remove('visible');
        setTimeout(() => {
            this.taskManagerContainer.style.display = 'none';
        }, 300);

        this.isVisible = false;

        // Update button text
        const toggleBtn = document.querySelector('.btn-task-manager');
        if (toggleBtn) {
            toggleBtn.innerHTML = '🔧 Task Manager';
        }

        // Hide inline edit if open
        this.hideInlineEdit();
    }

    async loadData() {
        try {
            // Get current filtered ideas (or all if no filter)
            const currentIdeas = await this.getCurrentIdeas();
            
            // Get all tasks related to these ideas
            const allTasks = [];
            for (const idea of currentIdeas) {
                if (idea.taskIds && idea.taskIds.length > 0) {
                    const ideaTasks = await window.dataManager.getTasksByIds(idea.taskIds);
                    allTasks.push(...ideaTasks);
                }
            }

            // Get all subtasks related to these tasks
            const allSubtasks = [];
            for (const task of allTasks) {
                if (task.subtaskIds && task.subtaskIds.length > 0) {
                    const taskSubtasks = await window.dataManager.getSubtasksByIds(task.subtaskIds);
                    allSubtasks.push(...taskSubtasks);
                }
            }

            this.tasksCache = allTasks;
            this.subtasksCache = allSubtasks;

            // Build assignees cache
            this.assigneesCache.clear();
            allSubtasks.forEach(subtask => {
                if (subtask.assignee && subtask.assignee.trim()) {
                    this.assigneesCache.add(subtask.assignee.trim());
                }
            });

        } catch (error) {
            console.error('Error loading task manager data:', error);
        }
    }

    async getCurrentIdeas() {
        // Get ideas based on current filter state
        const allIdeas = await window.dataManager.getAllIdeas();
        const filterValue = document.getElementById('filter-completion')?.value;
        
        if (!filterValue) {
            return allIdeas;
        }

        // Apply filter logic (reuse from existing navigation.js logic)
        return allIdeas.filter(idea => {
            // Add filter logic based on completion status
            const tasks = idea.taskIds ? idea.taskIds : [];
            if (tasks.length === 0) return filterValue === 'not-started';
            
            // Calculate completion based on task status
            // This is simplified - you might want to add more sophisticated logic
            return true; // For now, return all
        });
    }

    render() {
        if (this.currentView === 'grid') {
            this.renderGridView();
        } else {
            this.renderListView();
        }
        
        this.updateStats();
        this.populateAssigneeFilter();
    }

    renderGridView() {
        const tasksGrid = document.getElementById('tasks-grid');
        const subtasksGrid = document.getElementById('subtasks-grid');

        if (!tasksGrid || !subtasksGrid) return;

        // Render tasks
        if (this.tasksCache.length === 0) {
            tasksGrid.innerHTML = '<div class="empty-placeholder">No tasks found for current ideas</div>';
        } else {
            tasksGrid.innerHTML = this.tasksCache.map(task => this.renderTaskCard(task)).join('');
        }

        // Render subtasks
        if (this.subtasksCache.length === 0) {
            subtasksGrid.innerHTML = '<div class="empty-placeholder">No subtasks found</div>';
        } else {
            subtasksGrid.innerHTML = this.subtasksCache.map(subtask => this.renderSubtaskCard(subtask)).join('');
        }
    }

    renderListView() {
        const listBody = document.getElementById('task-list-body');
        if (!listBody) return;

        const allItems = [
            ...this.tasksCache.map(task => ({ ...task, type: 'task' })),
            ...this.subtasksCache.map(subtask => ({ ...subtask, type: 'subtask' }))
        ];

        if (allItems.length === 0) {
            listBody.innerHTML = '<div class="empty-placeholder">No items found</div>';
        } else {
            listBody.innerHTML = allItems.map(item => this.renderListItem(item)).join('');
        }
    }

    renderTaskCard(task) {
        const statusClass = task.doneStatus || 'pending';
        const subtaskCount = task.subtaskIds ? task.subtaskIds.length : 0;
        
        return `
            <div class="task-card" data-task-id="${task.id}">
                <div class="task-card-header">
                    <div class="task-icon">📋</div>
                    <div class="task-status status-${statusClass}">${task.doneStatus || 'pending'}</div>
                </div>
                <div class="task-card-content">
                    <h5 class="task-name">${task.name}</h5>
                    <div class="task-meta">
                        <div class="task-due">📅 ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</div>
                        <div class="task-subtasks">🔧 ${subtaskCount} subtasks</div>
                    </div>
                    ${task.notes ? `<p class="task-notes">${task.notes.substring(0, 100)}${task.notes.length > 100 ? '...' : ''}</p>` : ''}
                </div>
                <div class="task-card-actions">
                    <button class="btn-icon" onclick="window.taskManager.editTask('${task.id}')" title="Edit Task">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="window.taskManager.viewTaskSubtasks('${task.id}')" title="View Subtasks">
                        🔧
                    </button>
                </div>
            </div>
        `;
    }

    renderSubtaskCard(subtask) {
        const stageColors = {
            'Analyze': '#6c757d',
            'Development': '#007bff',
            'Test': '#fd7e14',
            'Production': '#28a745'
        };
        
        const stageIcons = {
            'Analyze': '🔍',
            'Development': '⚙️',
            'Test': '🧪',
            'Production': '🚀'
        };

        const stageColor = stageColors[subtask.taskType] || '#6c757d';
        const stageIcon = stageIcons[subtask.taskType] || '🔍';

        return `
            <div class="subtask-card" data-subtask-id="${subtask.id}">
                <div class="subtask-card-header">
                    <div class="subtask-stage" style="background-color: ${stageColor}; color: white;">
                        <span class="stage-icon">${stageIcon}</span>
                        <span class="stage-text">${subtask.taskType}</span>
                    </div>
                </div>
                <div class="subtask-card-content">
                    <h5 class="subtask-name">${subtask.name}</h5>
                    <div class="subtask-meta">
                        <div class="subtask-assignee">👤 ${subtask.assignee || 'Unassigned'}</div>
                        <div class="subtask-due">📅 ${subtask.dueDate ? new Date(subtask.dueDate).toLocaleDateString() : 'No due date'}</div>
                    </div>
                </div>
                <div class="subtask-card-actions">
                    <button class="btn-icon" onclick="window.taskManager.editSubtask('${subtask.id}')" title="Edit Subtask">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="window.subtaskManager.advanceSubtask('${subtask.id}')" title="Advance Stage">
                        ⬆️
                    </button>
                </div>
            </div>
        `;
    }

    renderListItem(item) {
        const type = item.type === 'task' ? 'Task' : 'Subtask';
        const icon = item.type === 'task' ? '📋' : '🔧';
        const stage = item.taskType || item.doneStatus || '--';
        const assignee = item.assignee || '--';
        const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '--';

        return `
            <div class="list-item" data-id="${item.id}" data-type="${item.type}">
                <div class="list-col-name">
                    <span class="item-icon">${icon}</span>
                    ${item.name}
                </div>
                <div class="list-col-type">${type}</div>
                <div class="list-col-stage">${stage}</div>
                <div class="list-col-assignee">${assignee}</div>
                <div class="list-col-due">${dueDate}</div>
                <div class="list-col-actions">
                    <button class="btn-icon" onclick="window.taskManager.${item.type === 'task' ? 'editTask' : 'editSubtask'}('${item.id}')" title="Edit">
                        ✏️
                    </button>
                </div>
            </div>
        `;
    }

    setView(viewType) {
        this.currentView = viewType;
        
        // Update view mode buttons
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewType}"]`)?.classList.add('active');

        // Show/hide view containers
        const gridView = document.getElementById('task-grid-view');
        const listView = document.getElementById('task-list-view');
        
        if (viewType === 'grid') {
            if (gridView) gridView.style.display = 'block';
            if (listView) listView.style.display = 'none';
        } else {
            if (gridView) gridView.style.display = 'none';
            if (listView) listView.style.display = 'block';
        }

        this.render();
    }

    async editSubtask(subtaskId) {
        try {
            const subtask = await window.dataManager.getSubtask(subtaskId);
            if (!subtask) {
                throw new Error('Subtask not found');
            }

            this.currentEditSubtask = subtask;
            await this.showInlineEdit(subtask);

        } catch (error) {
            console.error('Error editing subtask:', error);
            this.showNotification('Error loading subtask for editing', 'error');
        }
    }

    async showInlineEdit(subtask) {
        try {
            // Get or create inline edit container
            let inlineContainer = document.getElementById('inline-edit-container');
            if (!inlineContainer) {
                console.error('Inline edit container not found');
                return;
            }

            // Load subtask edit form
            const response = await fetch('pages/subtask.html');
            if (response.ok) {
                const editContent = document.getElementById('inline-edit-content');
                if (editContent) {
                    editContent.innerHTML = await response.text();
                }
            }

            // Show container
            inlineContainer.style.display = 'block';
            setTimeout(() => {
                inlineContainer.classList.add('visible');
            }, 10);

            // Populate form with subtask data
            this.populateSubtaskForm(subtask);

            // Bind form events
            this.bindSubtaskFormEvents();

        } catch (error) {
            console.error('Error showing inline edit:', error);
        }
    }

    hideInlineEdit() {
        const inlineContainer = document.getElementById('inline-edit-container');
        if (inlineContainer) {
            inlineContainer.classList.remove('visible');
            setTimeout(() => {
                inlineContainer.style.display = 'none';
            }, 300);
        }
        this.currentEditSubtask = null;
    }

    populateSubtaskForm(subtask) {
        // Populate basic fields
        const nameField = document.getElementById('subtask-name-edit');
        const assigneeField = document.getElementById('subtask-assignee-edit');
        const dueDateField = document.getElementById('subtask-due-edit');
        const notesField = document.getElementById('subtask-notes-edit');

        if (nameField) nameField.value = subtask.name || '';
        if (assigneeField) assigneeField.value = subtask.assignee || '';
        if (dueDateField) dueDateField.value = subtask.dueDate || '';
        if (notesField) notesField.value = subtask.notes || '';

        // Update stage display
        const stageIcon = document.getElementById('stage-icon');
        const stageName = document.getElementById('stage-name');
        const stageDisplay = document.getElementById('current-stage-display');
        
        const stageIcons = {
            'Analyze': '🔍',
            'Development': '⚙️',
            'Test': '🧪',
            'Production': '🚀'
        };

        if (stageIcon) stageIcon.textContent = stageIcons[subtask.taskType] || '🔍';
        if (stageName) stageName.textContent = subtask.taskType || 'Analyze';
        if (stageDisplay) {
            const colors = {
                'Analyze': '#6c757d',
                'Development': '#007bff',
                'Test': '#fd7e14',
                'Production': '#28a745'
            };
            stageDisplay.style.backgroundColor = colors[subtask.taskType] || '#6c757d';
        }

        // Update advance button
        const nextStage = window.subtaskManager.getNextStage(subtask.taskType);
        const advanceBtn = document.getElementById('advance-stage-btn');
        const advanceText = document.getElementById('advance-text');
        
        if (nextStage) {
            if (advanceBtn) advanceBtn.style.display = 'inline-block';
            if (advanceText) advanceText.textContent = `Advance to ${nextStage}`;
        } else {
            if (advanceBtn) advanceBtn.style.display = 'none';
        }

        // Update timeline
        this.updateStageTimeline(subtask.taskType);

        // Update subtask ID display
        const idDisplay = document.getElementById('subtask-id-display');
        if (idDisplay) idDisplay.textContent = subtask.id;
    }

    updateStageTimeline(currentStage) {
        const timeline = document.getElementById('stage-timeline-edit');
        if (!timeline) return;

        const stages = ['Analyze', 'Development', 'Test', 'Production'];
        const currentIndex = stages.indexOf(currentStage);

        timeline.querySelectorAll('.timeline-stage').forEach((stageElement, index) => {
            stageElement.classList.remove('completed', 'current', 'pending');
            
            if (index < currentIndex) {
                stageElement.classList.add('completed');
            } else if (index === currentIndex) {
                stageElement.classList.add('current');
            } else {
                stageElement.classList.add('pending');
            }
        });
    }

    bindSubtaskFormEvents() {
        const form = document.getElementById('subtask-edit-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSubtaskChanges();
            });
        }
    }

    async saveSubtaskChanges() {
        if (!this.currentEditSubtask) return;

        try {
            const nameField = document.getElementById('subtask-name-edit');
            const assigneeField = document.getElementById('subtask-assignee-edit');
            const dueDateField = document.getElementById('subtask-due-edit');
            const notesField = document.getElementById('subtask-notes-edit');

            const updatedData = {
                name: nameField?.value || '',
                assignee: assigneeField?.value || '',
                dueDate: dueDateField?.value || '',
                notes: notesField?.value || ''
            };

            await window.dataManager.updateSubtask(this.currentEditSubtask.id, updatedData);
            
            this.showNotification('Subtask updated successfully!', 'success');
            this.hideInlineEdit();
            
            // Refresh data and re-render
            await this.loadData();
            this.render();

        } catch (error) {
            console.error('Error saving subtask changes:', error);
            this.showNotification('Error saving changes: ' + error.message, 'error');
        }
    }

    async advanceSubtaskStage() {
        if (!this.currentEditSubtask) return;

        try {
            await window.subtaskManager.advanceSubtask(this.currentEditSubtask.id);
            
            // Refresh current subtask data
            this.currentEditSubtask = await window.dataManager.getSubtask(this.currentEditSubtask.id);
            
            // Update form display
            this.populateSubtaskForm(this.currentEditSubtask);
            
            // Refresh main view
            await this.loadData();
            this.render();

        } catch (error) {
            console.error('Error advancing subtask stage:', error);
            this.showNotification('Error advancing stage: ' + error.message, 'error');
        }
    }

    updateStats() {
        // Update statistics display
        const tasksTotal = document.getElementById('tm-tasks-total');
        const subtasksTotal = document.getElementById('tm-subtasks-total');
        const analyzeCount = document.getElementById('tm-analyze-count');
        const developmentCount = document.getElementById('tm-development-count');
        const testCount = document.getElementById('tm-test-count');
        const productionCount = document.getElementById('tm-production-count');

        if (tasksTotal) tasksTotal.textContent = this.tasksCache.length;
        if (subtasksTotal) subtasksTotal.textContent = this.subtasksCache.length;
        
        const stageCounts = {
            'Analyze': 0,
            'Development': 0,
            'Test': 0,
            'Production': 0
        };

        this.subtasksCache.forEach(subtask => {
            stageCounts[subtask.taskType] = (stageCounts[subtask.taskType] || 0) + 1;
        });

        if (analyzeCount) analyzeCount.textContent = stageCounts['Analyze'];
        if (developmentCount) developmentCount.textContent = stageCounts['Development'];
        if (testCount) testCount.textContent = stageCounts['Test'];
        if (productionCount) productionCount.textContent = stageCounts['Production'];

        // Update filter counts
        const totalCount = document.getElementById('tm-total-count');
        const filteredCount = document.getElementById('tm-filtered-count');
        
        if (totalCount) totalCount.textContent = `${this.tasksCache.length + this.subtasksCache.length} items`;
        if (filteredCount) filteredCount.textContent = `${this.getVisibleItemCount()} shown`;
    }

    getVisibleItemCount() {
        // Count visible items based on current filters
        // This is simplified - implement actual filter logic
        return this.tasksCache.length + this.subtasksCache.length;
    }

    populateAssigneeFilter() {
        const assigneeFilter = document.getElementById('tm-assignee-filter');
        if (!assigneeFilter) return;

        // Keep existing options
        const existingOptions = Array.from(assigneeFilter.options).slice(0, 2); // Keep "All" and "Unassigned"
        
        // Add assignees from cache
        const assigneeOptions = Array.from(this.assigneesCache).sort().map(assignee => 
            `<option value="${assignee}">${assignee}</option>`
        ).join('');

        assigneeFilter.innerHTML = existingOptions.map(opt => opt.outerHTML).join('') + assigneeOptions;
    }

    async refreshTasks() {
        await this.loadData();
        this.render();
        this.showNotification('Tasks refreshed', 'success');
    }

    onFilterChange() {
        if (this.isVisible) {
            // Reload data based on new filter
            this.loadData().then(() => {
                this.render();
            });
        }
    }

    handleSearch(searchTerm) {
        // Implement search filtering
        // This would filter the visible items based on the search term
        console.log('Search:', searchTerm);
    }

    handleFilterChange() {
        // Implement filter logic
        console.log('Filter changed');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `tm-notification tm-notification-${type}`;
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
            z-index: 1001;
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

// Initialize global task manager
window.taskManager = new TaskManager();