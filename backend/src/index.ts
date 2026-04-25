import express from 'express';
import cors from 'cors';
import checkPositionRouter from './routes/checkPosition';
import screenshotRouter from './routes/screenshot';

const app = express();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api', checkPositionRouter);
app.use('/api', screenshotRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
