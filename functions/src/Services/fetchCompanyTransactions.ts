import * as functions from 'firebase-functions';
import axios from 'axios';

import { Company } from '../Schema/Company';
import { TransactionsPaginationData } from '../Schema/Data';

export default async (company: Company, pagination: TransactionsPaginationData) => {
    const paystack = functions.config().paystack;
    
    const requestConfig =  {
        headers: {
            Authorization: `Bearer ${paystack.secret_key}`,
        },
    };

    const paystackCustomer = await axios.get(`${paystack.base_uri}/customer/${company.emailId}`, requestConfig)
                                        .then(response => response.data.data)
                                        .catch(error => {
                                            throw new functions.https.HttpsError('unknown', 'Error resolving company from paystack', error);
                                        });
    
    const { perPage, page } = pagination;

    return axios.get(`${paystack.base_uri}/transaction?perPage=${perPage}&page=${page}&customer=${paystackCustomer.id}`, requestConfig)
                .then(response => response.data)
                .catch(error => {
                    throw new functions.https.HttpsError('unknown', 'Error fetching company transactions from paystack', error);
                });
};