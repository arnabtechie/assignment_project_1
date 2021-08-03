import mongoose from 'mongoose';

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err);
  process.exit(1);
});

import app from './app.js';

const DB = process.env.DB || 'mongodb://127.0.0.1:27017/ApiServer';

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('database connection successful...'))
  .catch(err => console.log(err));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`server running on port ${port}...`);
});

process.on('unhandledRejection', err => {
  console.log(err);
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});
