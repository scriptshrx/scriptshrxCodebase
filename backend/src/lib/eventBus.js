const EventEmitter = require('events');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(20);
    }
}

const eventBus = new EventBus();

module.exports = eventBus;
