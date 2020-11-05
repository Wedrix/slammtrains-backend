import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import PromisePool = require('@supercharge/promise-pool');

import { resolveCompany, resolveEmployee } from '../Helpers/ResolveDocuments';

export default async (companyId: string, reason: string) => {
    const now = new Date().valueOf();

    const company = await resolveCompany(`companies/${companyId}`);

    await admin.firestore()
                .doc(`/companies/${companyId}`)
                .update({
                    accessBlockedAt: now,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The company document could not be updated.', error);
                });

    // Block HR Access
    await admin.auth()
                .setCustomUserClaims(company.hr.uid, { accessBlocked: true })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The custom claims could not be set on this user.', error);
                });

    // Block Employees Access
    const employeeDocuments = await admin.firestore()
                                .collection(`/companies/${companyId}/employees`)
                                .select()
                                .get()
                                .then(querySnapshot => {
                                    const documentSnapshots: admin.firestore.DocumentSnapshot[] = [];

                                    querySnapshot.forEach(documentSnapshot => {
                                        documentSnapshots.push(documentSnapshot);
                                    });

                                    return documentSnapshots;
                                })
                                .catch(error => {
                                    throw new functions.https.HttpsError('internal', 'The employees for the company could not be retrieved.', error);
                                });

    await PromisePool.withConcurrency(10)
                    .for(employeeDocuments)
                    .process(async (employeeDocument) => {
                        const employeeId = employeeDocument.id;

                        const employee = await resolveEmployee(employeeId);

                        await admin.auth()
                                    .setCustomUserClaims(employee.uid, { accessBlocked: true })
                                    .catch(error => {
                                        throw new functions.https.HttpsError('internal', 'The custom claims could not be set on this user.', error);
                                    });
                    });

    const supportEmail = functions.config().business.support_email;

    await admin.firestore()
            .collection('mail')
            .add({
                to: company.hr.email,
                message: {
                    subject: `Your access has been blocked!`,
                    html: `Hello ${company.hr.name},
                        <br/>Your access has been blocked. Reason: "${reason}". Unfortunately, this means courses will no longer be available to any of your employees.
                        <br/>If your subscription has expired, kindly proceed with the following steps to retrieve access:
                        <br/>
                        <ol>
                            <li>Log in to your account</li>
                            <li>Navigate to the billing page: Settings >> Billing</li>
                            <li>Click on the 'Renew Subscription' button</li>
                            <li>Make payment</li>
                        </ol>
                        <br/>
                        <br/>For all other reasons, Kindly contact our support team by sending an email to ${supportEmail}. 
                        <br/>Thank You.`,
                },
            })
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
            });

    await admin.firestore()
                .collection(`companies/${company.id}/notifications`)
                .add({
                    body: `Your access has been blocked!`,
                    title: `Your access has been blocked. Reason: "${reason}". Kindly contact support to retrieve access.`,
                    read: false,
                    createdAt: now,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The notification record could not be added', error);
                });
};