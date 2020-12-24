import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { EmailData } from '../Schema/Data';

export default async (emailData: EmailData) => {
    const companyEmails = await admin.firestore()
                                    .collection('companies')
                                    .select('hr.email')
                                    .get()
                                    .then(querySnapshot => {
                                        const emails: string[] = [];

                                        querySnapshot.forEach(documentSnapshot => {
                                            const company = documentSnapshot.data();

                                            emails.push(company.hr.email);
                                        });

                                        return emails;
                                    })
                                    .catch(error => {
                                        throw new functions.https.HttpsError('internal', 'The companies with expired subscriptions could not be retrieved.', error);
                                    });

    await admin.firestore()
                .collection('mail')
                .add({
                    to: companyEmails,
                    message: {
                        subject: emailData.subject,
                        html: emailData.body,
                    },
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                });
};