const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

const context = {
    // Run a function within a context
    run: (store, callback) => storage.run(store, callback),

    // Get the current store
    getStore: () => storage.getStore(),

    // Get tenantId from store
    getTenantId: () => storage.getStore()?.tenantId,

    // Get userId from store
    getUserId: () => storage.getStore()?.userId
};

module.exports = context;
