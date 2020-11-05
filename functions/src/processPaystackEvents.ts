import * as functions from 'firebase-functions';
import * as express from 'express';

import * as Paystack from './Schema/Paystack';

import activatePlan from './Services/activatePlan';

const cors = require('cors');
const crypto = require('crypto');
const app = express();

const authorizeRequest = (request: any) => {
    const requestSignature = request.headers['x-paystack-signature'];
    
    if (!requestSignature) { 
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');
    }
    
    const secretKey = functions.config().paystack.secret_key;

    const signature = crypto.createHmac('sha512', secretKey).update(JSON.stringify(request.body)).digest('hex');
    
    if (signature !== requestSignature) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');
    }
};

app.use(cors({ origin: true }));

app.post('/', async (request, response) => {
    try {
        authorizeRequest(request);
    
        const { event, data } = request.body;
    
        if (event === 'charge.success') {
            const transaction = await Paystack.Transaction
                                                .parseAsync(data)
                                                .catch(error => {
                                                    throw new functions.https.HttpsError('invalid-argument', 'The transaction data is invalid', error);
                                                });
    
            await activatePlan(transaction);
        }
    
        response.status(200).end();
    } catch (error) {
        functions.logger.error(error);

        response.status(400).end();
    }
});

export default app;