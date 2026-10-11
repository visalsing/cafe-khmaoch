// Inside your backend server entry file (e.g., server/index.js)
import drinksTypesRouter from '../../routes/drinksTypes.js';

// Mount the router
app.use('/api/drinks-type', drinksTypesRouter);