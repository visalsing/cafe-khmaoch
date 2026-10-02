Create the database and the server folder
- Sign up at neon.com, create a project, click Connect, and copy the pooled connection string. It ends with ?sslmode=require.
- In your project root (next to src/):


mkdir server
cd server
npm init -y
npm pkg set type=module
npm i express pg bcryptjs jsonwebtoken cookie-parser express-rate-limit
npm pkg set scripts.dev="node --watch --env-file=.env src/index.js"
npm pkg set scripts.db:setup="node --env-file=.env src/setup.js"


- This needs Node 20.6 or newer. Create the folders server/src and server/src/routes.