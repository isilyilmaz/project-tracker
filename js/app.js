class App {
    constructor() {
        this.initialized = false;
        this.currentPage = 'home';
    }

    async init() {
        if (this.initialized) return;

        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize core components
            this.initializeComponents();
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Initialize responsive features
            this.initializeResponsive();
            
            this.initialized = true;
            console.log('Project Tracker app initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showFatalError('Application failed to load. Please refresh the page.');
        }
    }

    initializeComponents() {
        // Components are already initialized via their constructors
        // This method ensures proper order and handles any dependencies
        
        // Verify core components exist
        if (!window.idGenerator) {
            throw new Error('ID Generator not initialized');
        }
        
        if (!window.dataManager) {
            throw new Error('Data Manager not initialized');
        }
        
        if (!window.navigation) {
            throw new Error('Navigation not initialized');
        }

        // Initialize task grid if needed
        if (window.taskGrid && !window.taskGrid.initialized) {
            // Task grid will be initialized when needed
        }

        // Template manager will be initialized when create-project page is loaded
        console.log('Core components verified');
    }

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showError('An unexpected error occurred. Please try refreshing the page.');
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('A network or data error occurred. Please check your connection and try again.');
        });
    }

    initializeResponsive() {
        // Handle mobile menu toggle if needed
        this.setupMobileNavigation();
        
        // Handle responsive table scrolling
        this.setupResponsiveTables();
        
        // Setup touch gestures for mobile
        this.setupTouchGestures();
    }

    setupMobileNavigation() {
        const navList = document.querySelector('.nav-list');
        const headerContainer = document.querySelector('.main-header .container');
        
        if (!navList || !headerContainer) return;

        // Add mobile menu toggle for very small screens
        const mediaQuery = window.matchMedia('(max-width: 480px)');
        
        const handleMobileMenu = (e) => {
            if (e.matches) {
                // Mobile layout
                if (!document.querySelector('.mobile-menu-toggle')) {
                    this.createMobileMenuToggle();
                }
            } else {
                // Desktop layout - remove mobile menu if exists
                const mobileToggle = document.querySelector('.mobile-menu-toggle');
                if (mobileToggle) {
                    mobileToggle.remove();
                }
                navList.classList.remove('mobile-hidden');
            }
        };

        mediaQuery.addListener(handleMobileMenu);
        handleMobileMenu(mediaQuery);
    }

    createMobileMenuToggle() {
        const headerContainer = document.querySelector('.main-header .container');
        const navList = document.querySelector('.nav-list');
        
        if (!headerContainer || !navList) return;

        const toggleButton = document.createElement('button');
        toggleButton.className = 'mobile-menu-toggle';
        toggleButton.innerHTML = '☰';
        toggleButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
            margin-left: auto;
        `;

        toggleButton.addEventListener('click', () => {
            navList.classList.toggle('mobile-hidden');
        });

        // Add CSS for mobile menu
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 480px) {
                .main-header .container {
                    position: relative;
                }
                .nav-list.mobile-hidden {
                    display: none;
                }
                .nav-list {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--saudi-dark);
                    flex-direction: column;
                    padding: 1rem;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
            }
        `;
        document.head.appendChild(style);

        headerContainer.appendChild(toggleButton);
        navList.classList.add('mobile-hidden');
    }

    setupResponsiveTables() {
        // Add horizontal scroll indicators for tables
        const tableContainers = document.querySelectorAll('.task-grid-container');
        
        tableContainers.forEach(container => {
            const addScrollIndicators = () => {
                const table = container.querySelector('.task-grid');
                if (!table) return;

                if (container.scrollWidth > container.clientWidth) {
                    container.classList.add('scrollable');
                    
                    if (!container.querySelector('.scroll-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'scroll-indicator';
                        indicator.textContent = '← Scroll to see more →';
                        indicator.style.cssText = `
                            text-align: center;
                            padding: 0.5rem;
                            font-size: 0.8rem;
                            color: var(--text-secondary);
                            background: var(--bg-secondary);
                            border-top: 1px solid var(--border);
                        `;
                        container.appendChild(indicator);
                    }
                } else {
                    container.classList.remove('scrollable');
                    const indicator = container.querySelector('.scroll-indicator');
                    if (indicator) indicator.remove();
                }
            };

            // Check on load and resize
            addScrollIndicators();
            window.addEventListener('resize', addScrollIndicators);
        });
    }

    setupTouchGestures() {
        // Add touch feedback for interactive elements
        const interactiveElements = document.querySelectorAll('.btn, .nav-link, .template-card, .project-card');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.style.opacity = '0.7';
            });
            
            element.addEventListener('touchend', function() {
                this.style.opacity = '1';
            });
            
            element.addEventListener('touchcancel', function() {
                this.style.opacity = '1';
            });
        });
    }

    showError(message, duration = 5000) {
        this.showNotification(message, 'error', duration);
    }

    showSuccess(message, duration = 3000) {
        this.showNotification(message, 'success', duration);
    }

    showInfo(message, duration = 4000) {
        this.showNotification(message, 'info', duration);
    }

    showNotification(message, type = 'info', duration = 4000) {
        // Remove existing notifications of the same type
        const existing = document.querySelectorAll(`.app-notification.${type}`);
        existing.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `app-notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        // Style based on type
        const colors = {
            success: { bg: '#d4edda', border: '#28a745', text: '#155724' },
            error: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
            info: { bg: '#cce7f0', border: '#17a2b8', text: '#0c5460' }
        };

        const color = colors[type] || colors.info;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            border: 1px solid ${color.border};
            border-left: 4px solid ${color.border};
            color: ${color.text};
            padding: 1rem;
            border-radius: 5px;
            max-width: 400px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideInRight 0.3s ease;
        `;

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: ${color.text};
                padding: 0;
                margin-left: auto;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    showFatalError(message) {
        // Create overlay for fatal errors
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const errorBox = document.createElement('div');
        errorBox.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 10px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        `;

        errorBox.innerHTML = `
            <h2 style="color: var(--saudi-red); margin-bottom: 1rem;">Application Error</h2>
            <p style="margin-bottom: 2rem; color: var(--text-primary);">${message}</p>
            <button onclick="window.location.reload()" class="btn">
                Reload Application
            </button>
        `;

        overlay.appendChild(errorBox);
        document.body.appendChild(overlay);
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    getCurrentPage() {
        return this.currentPage;
    }

    setCurrentPage(page) {
        this.currentPage = page;
    }

    // Performance monitoring
    logPerformance(label, startTime) {
        const endTime = performance.now();
        console.log(`${label}: ${endTime - startTime} milliseconds`);
    }
}

// Initialize and start the application
const startTime = performance.now();
const app = new App();

// Start app initialization
app.init().then(() => {
    app.logPerformance('App initialization', startTime);
}).catch(error => {
    console.error('App initialization failed:', error);
});

// Export for global access
window.app = app;