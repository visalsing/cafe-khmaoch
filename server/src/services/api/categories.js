// Inside your backend server entry file (e.g., server/index.js)
import categoriesRouter from '../../routes/categories.js';

// Mount the router
app.use('/api/categories', categoriesRouter);