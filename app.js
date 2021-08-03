import path from 'path';
import { dirname } from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import apiRoutes from './routes/apiRoutes.js';
import globalErrorHandler from './controllers/errorController.js';

dotenv.config({ path: './config.env' });

const app = express();

app.enable('trust proxy');

app.use(cors());

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));

app.use(helmet());

app.use(morgan('dev'));

app.use(express.json());

app.get('/', async (req, res) => {
  return res.status(200).send({
    status: 'success',
    message: 'up'
  })
});

app.use('/api', apiRoutes.router);
app.use('/api', apiRoutes.authRouter);

app.use(globalErrorHandler);

app.use((req, res, next) => {
  return res.status(404).send({
    status: 'fail',
    errors: '404 not found'
  });
});


export default app;