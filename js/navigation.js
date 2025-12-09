class Navigation {
    constructor() {
        this.currentPage = 'home';
        this.previousPage = null;
        this.navigationContext = {};
        this.contentArea = null;
        this.navLinks = null;
        this.initialized = false;
        
        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Get DOM elements
        this.contentArea = document.getElementById('content-area');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        if (!this.contentArea) {
            console.error('Navigation: content-area element not found');
            return;
        }
        
        this.bindEvents();
        this.loadPage('home');
        this.initialized = true;
    }

    bindEvents() {
        if (this.navLinks) {
            this.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = link.getAttribute('data-target');
                    this.navigateTo(target);
                });
            });
        }
    }

    navigateTo(page, params = {}) {
        if (!this.initialized) {
            console.warn('Navigation not yet initialized, retrying...');
            setTimeout(() => this.navigateTo(page, params), 100);
            return;
        }
        
        if (this.currentPage !== page || Object.keys(params).length > 0) {
            // Store previous page context for back navigation
            this.previousPage = this.currentPage;
            this.navigationContext = {
                fromPage: this.currentPage,
                timestamp: Date.now(),
                ...params
            };
            this.updateActiveLink(page);
            this.loadPage(page, params);
            this.currentPage = page;
        }
    }

    updateActiveLink(page) {
        if (this.navLinks) {
            this.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-target') === page) {
                    link.classList.add('active');
                }
            });
        }
    }

    navigateBack() {
        // Intelligent back navigation with context awareness
        if (this.previousPage && this.navigationContext.fromPage) {
            // We know where we came from, navigate back there
            this.navigateTo(this.previousPage);
        } else {
            // Fallback to browser history
            try {
                window.history.back();
            } catch (error) {
                console.warn('Browser back navigation failed, defaulting to home');
                this.navigateTo('home');
            }
        }
    }

    getBackButtonText() {
        // Return context-aware back button text
        const pageNames = {
            'home': 'Home',
            'project-planner': 'Project Planner',
            'task-manager': 'Task Manager',
            'all-projects': 'All Projects',
            'all-ideas': 'All Ideas',
            'all-events': 'All Events'
        };
        
        if (this.previousPage && pageNames[this.previousPage]) {
            return `← Back to ${pageNames[this.previousPage]}`;
        }
        
        return '← Back';
    }

    async loadPage(page, params = {}) {
        try {
            if (!this.contentArea) {
                console.error('Content area not available');
                return;
            }
            
            this.contentArea.innerHTML = '<div class="loading">Loading...</div>';
            
            const response = await fetch(`pages/${page}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load ${page}.html`);
            }
            
            const content = await response.text();
            this.contentArea.innerHTML = content;
            
            this.initializePageSpecificFeatures(page, params);
            
        } catch (error) {
            console.error('Error loading page:', error);
            if (this.contentArea) {
                this.contentArea.innerHTML = `
                    <div class="error-message">
                        <h2>Error Loading Page</h2>
                        <p>Sorry, we couldn't load the requested page. Please try again.</p>
                    </div>
                `;
            }
        }
    }

    initializePageSpecificFeatures(page, params = {}) {
        switch (page) {
            case 'create-project':
                if (window.templateManager) {
                    window.templateManager.init();
                }
                break;
            case 'all-projects':
                this.loadProjectsData();
                break;
            case 'all-ideas':
                this.loadIdeasData();
                break;
            case 'all-events':
                this.loadEventsData();
                break;
            case 'home':
                this.loadDashboardData();
                break;
            case 'task-detail':
                if (window.taskDetailManager && params.taskId) {
                    window.taskDetailManager.init(params.taskId);
                }
                break;
            case 'subtask-detail':
                if (window.subtaskDetailManager && params.subtaskId && params.taskId) {
                    window.subtaskDetailManager.init(params.subtaskId, params.taskId);
                }
                break;
            case 'task-manager':
                if (window.taskManager) {
                    window.taskManager.init();
                }
                break;
        }
    }

    async loadProjectsData() {
        try {
            const projects = await window.dataManager.getAllProjects();
            const ideas = await window.dataManager.getAllIdeas();
            const events = await window.dataManager.getAllEvents();
            
            this.renderProjectsList(projects, ideas, events);
        } catch (error) {
            console.error('Error loading projects data:', error);
        }
    }

    renderProjectsList(projects, ideas, events) {
        const projectsContainer = document.getElementById('projects-list');
        if (!projectsContainer) return;

        if (projects.length === 0) {
            projectsContainer.innerHTML = '<p>No projects found. Create your first project!</p>';
            return;
        }

        const projectsHTML = projects.map(project => {
            const idea = ideas.find(i => i.id === project.ideaId);
            const event = events.find(e => e.id === project.eventId);
            
            return `
                <div class="project-card" data-project-id="${project.id}">
                    <div class="project-header">
                        <h3>${project.name}</h3>
                        <div class="project-actions">
                            <button class="btn-icon btn-edit" onclick="window.navigation.editProject('${project.id}')" title="Edit Project">
                                ✏️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.navigation.deleteProject('${project.id}')" title="Delete Project">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="project-content">
                        <p><strong>Topic:</strong> ${project.topic}</p>
                        <p><strong>Due Date:</strong> ${new Date(project.planDueDate).toLocaleDateString()}</p>
                        <p><strong>Keywords:</strong> ${project.keywords ? project.keywords.join(', ') : 'None'}</p>
                        ${idea ? `<p><strong>Linked Idea:</strong> ${idea.name}</p>` : ''}
                        ${event ? `<p><strong>Linked Event:</strong> ${event.name}</p>` : ''}
                        <p><strong>Goal:</strong> ${project.goal || 'Not specified'}</p>
                        <p><strong>Objective:</strong> ${project.objective || 'Not specified'}</p>
                        <p class="project-description">${project.generalDescription || 'No description provided'}</p>
                    </div>
                    <div class="project-meta">
                        <span class="project-status status-active">Active</span>
                        <span class="project-date">Created: ${new Date(project.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        }).join('');

        projectsContainer.innerHTML = projectsHTML;
        
        // Update statistics
        this.updateProjectStats(projects);
        this.bindSearchAndFilter('projects');
    }

    updateProjectStats(projects) {
        const totalElement = document.getElementById('total-projects');
        const activeElement = document.getElementById('active-projects');
        const completedElement = document.getElementById('completed-projects');
        
        if (totalElement) totalElement.textContent = projects.length;
        if (activeElement) activeElement.textContent = projects.filter(p => p.status !== 'completed').length;
        if (completedElement) completedElement.textContent = projects.filter(p => p.status === 'completed').length;
    }

    async editProject(projectId) {
        try {
            const project = await window.dataManager.getProject(projectId);
            if (!project) {
                console.error('Project not found:', projectId);
                return;
            }

            // Navigate to create-project page with edit mode
            window.currentEditProject = project;
            this.navigateTo('create-project');
            
            // Set a flag to indicate edit mode
            setTimeout(() => {
                if (window.templateManager) {
                    window.templateManager.selectTemplate('project-planner');
                    window.templateManager.loadProjectForEdit(project);
                }
            }, 100);

        } catch (error) {
            console.error('Error loading project for edit:', error);
            alert('Error loading project for editing. Please try again.');
        }
    }

    async deleteProject(projectId) {
        try {
            const project = await window.dataManager.getProject(projectId);
            if (!project) {
                console.error('Project not found:', projectId);
                return;
            }

            const confirmDelete = confirm(`Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`);
            if (!confirmDelete) return;

            await window.dataManager.deleteProject(projectId);
            
            // Reload the projects list
            this.loadProjectsData();
            
            // Show success message
            this.showNotification('Project deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Error deleting project. Please try again.');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
            color: ${type === 'success' ? '#155724' : '#721c24'};
            border: 1px solid ${type === 'success' ? '#28a745' : '#dc3545'};
            padding: 1rem;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    async loadDashboardData() {
        try {
            const projects = await window.dataManager.getAllProjects();
            const ideas = await window.dataManager.getAllIdeas();
            const tasks = await window.dataManager.getAllTasks();
            
            this.renderDashboard(projects, ideas, tasks);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    renderDashboard(projects, ideas, tasks) {
        const dashboardStats = document.getElementById('dashboard-stats');
        if (!dashboardStats) return;

        const completedTasks = tasks.filter(task => task.doneStatus === 'production_done').length;
        const overdueTasks = tasks.filter(task => task.doneStatus === 'overdue').length;
        
        dashboardStats.innerHTML = `
            <div class="stat-card">
                <h3>${projects.length}</h3>
                <p>Total Projects</p>
            </div>
            <div class="stat-card">
                <h3>${ideas.length}</h3>
                <p>Active Ideas</p>
            </div>
            <div class="stat-card">
                <h3>${completedTasks}</h3>
                <p>Completed Tasks</p>
            </div>
            <div class="stat-card">
                <h3>${overdueTasks}</h3>
                <p>Overdue Tasks</p>
            </div>
        `;
    }

    async loadIdeasData() {
        try {
            const ideas = await window.dataManager.getAllIdeas();
            const allTasks = await window.dataManager.getAllTasks();
            
            this.renderIdeasList(ideas, allTasks);
        } catch (error) {
            console.error('Error loading ideas data:', error);
        }
    }

    renderIdeasList(ideas, allTasks) {
        const ideasContainer = document.getElementById('ideas-list');
        if (!ideasContainer) return;

        if (ideas.length === 0) {
            ideasContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No Ideas Found</h3>
                    <p>Create your first idea to get started!</p>
                    <button class="btn" onclick="window.navigateToPage('create-project')">Create New Idea</button>
                </div>
            `;
            return;
        }

        const ideasHTML = ideas.map(idea => {
            const ideaTasks = allTasks.filter(task => idea.taskIds && idea.taskIds.includes(task.id));
            const completedTasks = ideaTasks.filter(task => task.doneStatus === 'production_done').length;
            const overdueTasks = ideaTasks.filter(task => task.doneStatus === 'overdue').length;
            const pendingTasks = ideaTasks.filter(task => task.doneStatus === 'pending').length;
            
            const completionPercentage = ideaTasks.length > 0 ? (completedTasks / ideaTasks.length) * 100 : 0;
            const completionStatus = completionPercentage === 100 ? 'complete' : 
                                   completionPercentage > 0 ? 'in-progress' : 'not-started';
            
            return `
                <div class="idea-card" data-idea-id="${idea.id}">
                    <div class="idea-header">
                        <h3>${idea.name}</h3>
                        <div class="idea-actions">
                            <button class="btn-icon btn-edit" onclick="window.navigation.editIdea('${idea.id}')" title="Edit Idea">
                                ✏️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.navigation.deleteIdea('${idea.id}')" title="Delete Idea">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="idea-content">
                        <p><strong>Topic:</strong> ${idea.topic}</p>
                        <p><strong>Due Date:</strong> ${new Date(idea.planDueDate).toLocaleDateString()}</p>
                        <p><strong>Keywords:</strong> ${idea.keywords ? idea.keywords.join(', ') : 'None'}</p>
                        <p><strong>Goals:</strong> ${idea.goals || 'Not specified'}</p>
                        <p><strong>Objectives:</strong> ${idea.objectives || 'Not specified'}</p>
                    </div>
                    <div class="task-progress-section">
                        <div class="task-progress-header">
                            <strong>Task Progress</strong>
                            <span>${completedTasks}/${ideaTasks.length} tasks completed</span>
                        </div>
                        <div class="task-progress-bar">
                            <div class="task-progress-fill" style="width: ${completionPercentage}%"></div>
                        </div>
                        <div class="task-summary">
                            <div class="task-status status-complete">
                                <span class="status-dot"></span>
                                <span>${completedTasks} Complete</span>
                            </div>
                            <div class="task-status status-pending">
                                <span class="status-dot"></span>
                                <span>${pendingTasks} Pending</span>
                            </div>
                            <div class="task-status status-overdue">
                                <span class="status-dot"></span>
                                <span>${overdueTasks} Overdue</span>
                            </div>
                        </div>
                    </div>
                    <div class="idea-meta">
                        <span class="completion-badge completion-${completionStatus}">
                            ${completionStatus.replace('-', ' ')}
                        </span>
                        <span class="idea-date">Created: ${new Date(idea.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        }).join('');

        ideasContainer.innerHTML = ideasHTML;
        this.updateIdeasStats(ideas, allTasks);
        this.bindSearchAndFilter('ideas');
    }

    updateIdeasStats(ideas, allTasks) {
        const totalElement = document.getElementById('total-ideas');
        const completedElement = document.getElementById('completed-ideas');
        const totalTasksElement = document.getElementById('total-tasks');
        const completedTasksElement = document.getElementById('completed-tasks');
        
        const relevantTasks = allTasks.filter(task => 
            ideas.some(idea => idea.taskIds && idea.taskIds.includes(task.id))
        );
        const completedTasks = relevantTasks.filter(task => task.doneStatus === 'production_done').length;
        
        let completedIdeas = 0;
        ideas.forEach(idea => {
            if (idea.taskIds && idea.taskIds.length > 0) {
                const ideaTasks = allTasks.filter(task => idea.taskIds.includes(task.id));
                const completed = ideaTasks.filter(task => task.doneStatus === 'production_done').length;
                if (completed === ideaTasks.length && ideaTasks.length > 0) {
                    completedIdeas++;
                }
            }
        });
        
        if (totalElement) totalElement.textContent = ideas.length;
        if (completedElement) completedElement.textContent = completedIdeas;
        if (totalTasksElement) totalTasksElement.textContent = relevantTasks.length;
        if (completedTasksElement) completedTasksElement.textContent = completedTasks;
    }

    async loadEventsData() {
        try {
            const events = await window.dataManager.getAllEvents();
            this.renderEventsList(events);
        } catch (error) {
            console.error('Error loading events data:', error);
        }
    }

    renderEventsList(events) {
        const eventsContainer = document.getElementById('events-list');
        if (!eventsContainer) return;

        if (events.length === 0) {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No Events Found</h3>
                    <p>Create your first event to get started!</p>
                    <button class="btn" onclick="window.navigateToPage('create-project')">Create New Event</button>
                </div>
            `;
            return;
        }

        const eventsHTML = events.map(event => {
            const eventDate = new Date(event.eventDate);
            const now = new Date();
            const isUpcoming = eventDate > now;
            const isToday = eventDate.toDateString() === now.toDateString();
            
            return `
                <div class="event-card" data-event-id="${event.id}">
                    <div class="event-header">
                        <h3>${event.name}</h3>
                        <div class="event-actions">
                            <button class="btn-icon btn-edit" onclick="window.navigation.editEvent('${event.id}')" title="Edit Event">
                                ✏️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.navigation.deleteEvent('${event.id}')" title="Delete Event">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="event-content">
                        <div class="event-date-section">
                            <div class="event-calendar-icon">📅</div>
                            <div class="event-date-info">
                                <h4>${eventDate.toLocaleDateString()}</h4>
                                <p>${eventDate.toLocaleTimeString()} ${event.duration ? `(${event.duration} hours)` : ''}</p>
                            </div>
                            ${isUpcoming && isToday ? '<div class="upcoming-indicator">🔥 Today!</div>' : ''}
                            ${isUpcoming && !isToday ? '<div class="upcoming-indicator">📍 Upcoming</div>' : ''}
                        </div>
                        <div class="event-details">
                            <div class="event-detail-item">
                                <div class="event-detail-label">Type</div>
                                <div class="event-detail-value">
                                    <span class="event-type-badge type-${event.type || 'other'}">
                                        ${(event.type || 'other').charAt(0).toUpperCase() + (event.type || 'other').slice(1)}
                                    </span>
                                </div>
                            </div>
                            <div class="event-detail-item">
                                <div class="event-detail-label">Location</div>
                                <div class="event-detail-value">${event.location || 'Not specified'}</div>
                            </div>
                            <div class="event-detail-item">
                                <div class="event-detail-label">Attendees</div>
                                <div class="event-detail-value">${event.expectedAttendees || 0}</div>
                            </div>
                            <div class="event-detail-item">
                                <div class="event-detail-label">Budget</div>
                                <div class="event-detail-value">${event.budget ? '$' + event.budget : 'Not set'}</div>
                            </div>
                        </div>
                        ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
                        ${event.organizer ? `<p><strong>Organizer:</strong> ${event.organizer}</p>` : ''}
                    </div>
                    <div class="event-meta">
                        <span class="event-status-badge status-${event.status || 'planning'}">
                            ${(event.status || 'planning').replace('-', ' ')}
                        </span>
                        <span class="event-date">Created: ${new Date(event.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        }).join('');

        eventsContainer.innerHTML = eventsHTML;
        this.updateEventsStats(events);
        this.bindSearchAndFilter('events');
    }

    updateEventsStats(events) {
        const totalElement = document.getElementById('total-events');
        const upcomingElement = document.getElementById('upcoming-events');
        const completedElement = document.getElementById('completed-events');
        const planningElement = document.getElementById('planning-events');
        
        const now = new Date();
        const upcoming = events.filter(event => new Date(event.eventDate) > now).length;
        const completed = events.filter(event => event.status === 'completed').length;
        const planning = events.filter(event => event.status === 'planning').length;
        
        if (totalElement) totalElement.textContent = events.length;
        if (upcomingElement) upcomingElement.textContent = upcoming;
        if (completedElement) completedElement.textContent = completed;
        if (planningElement) planningElement.textContent = planning;
    }

    async editIdea(ideaId) {
        try {
            const idea = await window.dataManager.getIdea(ideaId);
            if (!idea) {
                console.error('Idea not found:', ideaId);
                return;
            }

            window.currentEditIdea = idea;
            this.navigateTo('create-project');
            
            setTimeout(() => {
                if (window.templateManager) {
                    window.templateManager.selectTemplate('idea-planner');
                    window.templateManager.loadIdeaForEdit(idea);
                }
            }, 100);

        } catch (error) {
            console.error('Error loading idea for edit:', error);
            alert('Error loading idea for editing. Please try again.');
        }
    }

    async deleteIdea(ideaId) {
        // Implementation similar to deleteProject
        console.log('Delete idea:', ideaId);
        // TODO: Implement idea deletion
    }

    async editEvent(eventId) {
        try {
            const event = await window.dataManager.getEvent(eventId);
            if (!event) {
                console.error('Event not found:', eventId);
                return;
            }

            window.currentEditEvent = event;
            this.navigateTo('create-project');
            
            setTimeout(() => {
                if (window.templateManager) {
                    window.templateManager.selectTemplate('event-planner');
                    window.templateManager.loadEventForEdit(event);
                }
            }, 100);

        } catch (error) {
            console.error('Error loading event for edit:', error);
            alert('Error loading event for editing. Please try again.');
        }
    }

    async deleteEvent(eventId) {
        try {
            const event = await window.dataManager.getEvent(eventId);
            if (!event) {
                console.error('Event not found:', eventId);
                return;
            }

            const confirmDelete = confirm(`Are you sure you want to delete the event "${event.name}"? This action cannot be undone.`);
            if (!confirmDelete) return;

            await window.dataManager.deleteEvent(eventId);
            
            // Reload the events list
            this.loadEventsData();
            
            // Show success message
            this.showNotification('Event deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Error deleting event. Please try again.');
        }
    }

    async deleteIdea(ideaId) {
        try {
            const idea = await window.dataManager.getIdea(ideaId);
            if (!idea) {
                console.error('Idea not found:', ideaId);
                return;
            }

            const confirmDelete = confirm(`Are you sure you want to delete the idea "${idea.name}"? This will also delete all associated tasks. This action cannot be undone.`);
            if (!confirmDelete) return;

            await window.dataManager.deleteIdea(ideaId);
            
            // Reload the ideas list
            this.loadIdeasData();
            
            // Show success message
            this.showNotification('Idea and associated tasks deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting idea:', error);
            alert('Error deleting idea. Please try again.');
        }
    }

    bindSearchAndFilter(type) {
        const searchId = type === 'projects' ? 'search-projects' : 
                        type === 'ideas' ? 'search-ideas' : 'search-events';
        const filterId = type === 'projects' ? 'filter-status' :
                        type === 'ideas' ? 'filter-completion' : 'filter-event-status';
        
        const searchInput = document.getElementById(searchId);
        const filterSelect = document.getElementById(filterId);
        
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterItems(type);
            });
        }
        
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                this.filterItems(type);
            });
        }

        // Add event type filter for events
        if (type === 'events') {
            const typeFilter = document.getElementById('filter-event-type');
            if (typeFilter) {
                typeFilter.addEventListener('change', () => {
                    this.filterItems(type);
                });
            }
        }
    }

    filterItems(type) {
        const searchId = type === 'projects' ? 'search-projects' : 
                        type === 'ideas' ? 'search-ideas' : 'search-events';
        const filterId = type === 'projects' ? 'filter-status' :
                        type === 'ideas' ? 'filter-completion' : 'filter-event-status';
        
        const searchInput = document.getElementById(searchId);
        const filterSelect = document.getElementById(filterId);
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filterValue = filterSelect ? filterSelect.value : '';
        
        const cards = document.querySelectorAll(`.${type.slice(0, -1)}-card`);
        
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const matchesSearch = !searchTerm || text.includes(searchTerm);
            
            let matchesFilter = true;
            if (filterValue) {
                if (type === 'projects') {
                    // Project status filtering logic
                    matchesFilter = true; // Simplified for now
                } else if (type === 'ideas') {
                    // Idea completion filtering logic
                    const badge = card.querySelector('.completion-badge');
                    if (badge) {
                        const badgeClass = badge.className;
                        matchesFilter = badgeClass.includes(`completion-${filterValue}`);
                    }
                } else if (type === 'events') {
                    // Event status filtering logic
                    const statusBadge = card.querySelector('.event-status-badge');
                    if (statusBadge) {
                        const statusClass = statusBadge.className;
                        matchesFilter = statusClass.includes(`status-${filterValue}`);
                    }
                    
                    // Additional type filtering for events
                    const typeFilter = document.getElementById('filter-event-type');
                    if (typeFilter && typeFilter.value) {
                        const typeBadge = card.querySelector('.event-type-badge');
                        if (typeBadge) {
                            const typeClass = typeBadge.className;
                            matchesFilter = matchesFilter && typeClass.includes(`type-${typeFilter.value}`);
                        }
                    }
                }
            }
            
            if (matchesSearch && matchesFilter) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show "no results" message if all cards are hidden
        this.showNoResultsMessage(type, cards);
    }

    showNoResultsMessage(type, cards) {
        const visibleCards = Array.from(cards).filter(card => card.style.display !== 'none');
        const container = document.getElementById(`${type}-list`);
        
        if (!container) return;
        
        // Remove existing no results message
        const existingMessage = container.querySelector('.no-results-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        if (visibleCards.length === 0) {
            const noResultsHTML = `
                <div class="no-results-message" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <h3>No ${type} found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', noResultsHTML);
        }
    }
}

// Initialize navigation - will wait for DOM to be ready
window.navigation = new Navigation();

// Ensure navigation is available globally for buttons
window.navigateToPage = function(page, params = {}) {
    if (window.navigation && typeof window.navigation.navigateTo === 'function') {
        window.navigation.navigateTo(page, params);
    } else {
        console.warn('Navigation not ready, retrying in 100ms...');
        setTimeout(() => window.navigateToPage(page, params), 100);
    }
};

// Global function for intelligent back navigation
window.navigateBack = function() {
    if (window.navigation && typeof window.navigation.navigateBack === 'function') {
        window.navigation.navigateBack();
    } else {
        console.warn('Navigation not ready, falling back to history.back()');
        window.history.back();
    }
};

// Global function to get context-aware back button text
window.getBackButtonText = function() {
    if (window.navigation && typeof window.navigation.getBackButtonText === 'function') {
        return window.navigation.getBackButtonText();
    }
    return '← Back';
};

// Safe wrapper for template manager calls
window.showTemplateSelection = function() {
    if (window.templateManager && typeof window.templateManager.showTemplateSelection === 'function') {
        window.templateManager.showTemplateSelection();
    } else {
        console.warn('Template manager not ready, retrying in 100ms...');
        setTimeout(() => window.showTemplateSelection(), 100);
    }
};