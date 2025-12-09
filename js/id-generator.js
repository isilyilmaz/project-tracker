class IDGenerator {
    constructor() {
        this.counters = {
            proj: 1,
            idea: 1,
            event: 1,
            task: 1,
            subtask: 1,
            effort: 1,
            comment: 1
        };
        this.loadCounters();
    }

    generateId(type) {
        if (!this.counters.hasOwnProperty(type)) {
            throw new Error(`Unknown ID type: ${type}`);
        }

        const id = `${type}_${String(this.counters[type]).padStart(3, '0')}`;
        this.counters[type]++;
        this.saveCounters();
        return id;
    }

    generateUniqueId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    loadCounters() {
        try {
            const stored = localStorage.getItem('idCounters');
            if (stored) {
                const counters = JSON.parse(stored);
                this.counters = { ...this.counters, ...counters };
            }
        } catch (error) {
            console.warn('Failed to load ID counters:', error);
        }
    }

    saveCounters() {
        try {
            localStorage.setItem('idCounters', JSON.stringify(this.counters));
        } catch (error) {
            console.warn('Failed to save ID counters:', error);
        }
    }

    resetCounters() {
        this.counters = {
            proj: 1,
            idea: 1,
            event: 1,
            task: 1,
            subtask: 1,
            effort: 1,
            comment: 1
        };
        this.saveCounters();
    }

    getNextId(type) {
        if (!this.counters.hasOwnProperty(type)) {
            throw new Error(`Unknown ID type: ${type}`);
        }
        return `${type}_${String(this.counters[type]).padStart(3, '0')}`;
    }

    setCounter(type, value) {
        if (!this.counters.hasOwnProperty(type)) {
            throw new Error(`Unknown ID type: ${type}`);
        }
        this.counters[type] = Math.max(1, parseInt(value) || 1);
        this.saveCounters();
    }

    getAllCounters() {
        return { ...this.counters };
    }
}

// Initialize global ID generator
window.idGenerator = new IDGenerator();