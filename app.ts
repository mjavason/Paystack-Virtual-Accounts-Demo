import axios from 'axios';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import 'express-async-errors';
import morgan from 'morgan';
import { BASE_URL, paystackApi, PORT } from './constants';
import { accountDb } from './databases/accounts';
import { customerDb } from './databases/customers.database';
import { transactionDb } from './databases/transactions.database';
import { setupSwagger } from './swagger.config';
import { ChargeSuccessWebhookType } from './types/charge-webhook.type';
import { CreateCustomerResponseType } from './types/create-customer.type';
import { CreateVirtualAccountResponseType } from './types/create-virtual-account.type';
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
 * /virtual-account:
 *   post:
 *     summary: Create a dedicated paystack virtual account
 *     description: Creates a new virtual account in the payment gateway
 *     tags: [Payment - Virtual Account]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.post('/virtual-account', async (req: Request, res: Response) => {
  const response = await paystackApi.post<CreateVirtualAccountResponseType>('/dedicated_account', {
    customer: 'CUS_zmb5em28zxtej5o',
    // preferred_bank: 'test-bank',
    preferred_bank: 'titan-paystack', // titan-paystack is unavailable in test mode
  });

  if (!response.data) {
    return res.status(400).json({
      success: false,
      message: 'Unable to create virtual account',
    });
  }

  const isDuplicate = accountDb.findByCustomerCode(response.data.customer.customer_code);
  if (!isDuplicate) {
    accountDb.create({
      metadata: response.data,
      bankName: response.data.bank.name,
      bankId: response.data.bank.id,
      bankSlug: response.data.bank.slug,
      accountName: response.data.account_name,
      accountNumber: response.data.account_number,
      assigned: response.data.assigned,
      currency: response.data.currency,
      customerCode: response.data.customer.customer_code,
    });
  }

  return res.json({
    success: true,
    data: response.data,
  });
});

/**
 * @swagger
 * /customer:
 *   post:
 *     summary: Create a paystack customer
 *     description: Creates a new customer in the payment gateway
 *     tags: [Payment - Customer]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.post('/customer', async (req: Request, res: Response) => {
  const response = await paystackApi.post<CreateCustomerResponseType>('/customer', {
    first_name: 'Michael',
    last_name: 'Orji',
    email: 'orjimichael2240@gmail.com',
    phone: '08148863871',
  });
  if (!response.data) {
    return res.status(400).json({
      success: false,
      message: 'Unable to create customer',
    });
  }

  const isDuplicate = customerDb.findByCode(response.data.customer_code);
  if (!isDuplicate) {
    customerDb.create({
      email: response.data.email,
      firstName: response.data.first_name,
      lastName: response.data.last_name,
      code: response.data.customer_code,
      phoneNumber: response.data.phone,
      metadata: response.data,
    });
  }

  return res.json({
    success: true,
    data: response.data,
  });
});

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
    const { email = 'test@example.com', amount = 50 } = req.body;
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
  console.log('Webhook received:', req.body);
  const event = req.body as { event: string; data: any };

  if (event.event === 'charge.success') {
    const chargeData = event.data as ChargeSuccessWebhookType['data'];
    const reference = chargeData.reference;

    const transaction = transactionDb.findByReference(reference);
    if (transaction) {
      transaction.status = 'completed';
      transaction.metadata = chargeData;
      transactionDb.update(transaction.id, transaction);
      console.log(`Transaction ${reference} marked as completed.`);
    }

    const customer = customerDb.findByCode(chargeData.customer.customer_code);
    if (customer) {
      customer.walletBalance += chargeData.amount / 100; // Convert kobo to naira
      customerDb.update(customer.id, customer);
      console.log(`Customer ${customer.id} wallet balance updated.`);
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
