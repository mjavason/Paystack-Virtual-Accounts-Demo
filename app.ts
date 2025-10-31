import axios from 'axios';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import 'express-async-errors';
import morgan from 'morgan';
import { BASE_URL, paystackApi, PORT } from './constants';
import { setupSwagger } from './swagger.config';
import { transactionDb } from './transactions.database';
import { InitPaymentType } from './types/initialize-payment.type';

//#region App Setup
const app = express();

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);
app.use(cors());
app.use(morgan('dev'));
setupSwagger(app, BASE_URL);

//#endregion App Setup

/**
 * @swagger
 * /initialize-payment:
 *   post:
 *     summary: Initialize a payment
 *     description: Returns a payment initialization URL
 *     tags: [Payment]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.post('/initialize-payment', async (req: Request, res: Response) => {
  try {
    const { email = 'test@example.com', amount = 1000 } = req.body;
    const response = await paystackApi.post<InitPaymentType>('/transaction/initialize', {
      email,
      amount: amount * 100, // Paystack expects amount in kobo
    });

    if (!response.data) {
      return res.status(400).json({
        success: false,
        message: 'Unable to initialize payment',
      });
    }

    transactionDb.create({
      amount: amount,
      reference: response.data.reference,
      authUrl: response.data.authorization_url,
    });

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error('Payment initialization error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
    });
  }
});

/**
 * @swagger
 * /webhook:
 *   post:
 *     summary: Payment webhook endpoint
 *     description: Handles payment gateway webhooks
 *     tags: [Payment]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.post('/webhook', (req: Request, res: Response) => {
  // console.log('Webhook received:', req.body);
  const event = req.body as { event: string; data: any };

  if (event.event === 'charge.success') {
    const reference = event.data.reference;
    const transaction = transactionDb.findByReference(reference);
    if (transaction) {
      transaction.status = 'completed';
      transactionDb.update(transaction.id, transaction);
      console.log(`Transaction ${reference} marked as completed.`);
    }
  }

  res.sendStatus(200);
});

//#region Code here

//#endregion

//#region Server Setup

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Call a demo external API (httpbin.org)
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/api', async (req: Request, res: Response) => {
  try {
    const result = await axios.get('https://httpbin.org');
    return res.send({
      message: 'Demo API called (httpbin.org)',
      data: result.status,
    });
  } catch (error: any) {
    console.error('Error calling external API:', error.message);
    return res.status(500).send({
      error: 'Failed to call external API',
    });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Health check
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/', (req: Request, res: Response) => {
  return res.send({
    message: 'API is Live!',
  });
});

/**
 * @swagger
 * /obviously/this/route/cant/exist:
 *   get:
 *     summary: API 404 Response
 *     description: Returns a non-crashing result when you try to run a route that doesn't exist
 *     tags: [Default]
 *     responses:
 *       '404':
 *         description: Route not found
 */
app.use((req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    message: 'API route does not exist',
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // throw Error('This is a sample error');
  console.log(`${'\x1b[31m'}`); // start color red
  console.log(`${err.message}`);
  console.log(`${'\x1b][0m]'}`); //stop color

  return res.status(500).send({
    success: false,
    status: 500,
    message: err.message,
  });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});

// (for render services) Keep the API awake by pinging it periodically
// setInterval(pingSelf(BASE_URL), 600000);

//#endregion
