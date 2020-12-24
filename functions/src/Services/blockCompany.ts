import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import PromisePool = require('@supercharge/promise-pool');

import { resolveBusiness, resolveCompany, resolveEmployee } from '../Helpers/ResolveDocuments';

export default async (companyId: string) => {
    const supportEmail = (await resolveBusiness()).supportEmail;

    const company = await resolveCompany(`companies/${companyId}`);

    await admin.firestore()
                .doc(`/companies/${companyId}`)
                .update({
                    blockedAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The company document could not be updated.', error);
                });

    // Block HR Access
    await admin.auth()
                .updateUser(company.hr.uid, {
                    disabled: true,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal','Error blocking company HR', error);
                });

    await admin.firestore()
                .collection('mail')
                .add({
                    to: company.hr.email,
                    message: {
                        subject: `Your account has been blocked!`,
                        html: `Hello ${company.hr.name},
                            <br/>Your account has been blocked by the admin.
                            Unfortunately, this means you will no longer be able to log in to your account.
                            <br/>
                            <br/>Kindly contact our support team by sending an email to ${supportEmail} to resolve the issue. 
                            <br/>Thank You.`,
                    },
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
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
                                    .updateUser(employee.uid, {
                                        disabled: true,
                                    })
                                    .catch(error => {
                                        throw new functions.https.HttpsError('internal','Error blocking company employee', error);
                                    });

                        await admin.firestore()
                                    .collection('mail')
                                    .add({
                                        to: employee.email,
                                        message: {
                                            subject: `Your account has been blocked!`,
                                            html: `Hello ${employee.name},
                                                <br/>Your account has been blocked by the admin.
                                                Unfortunately, this means you will no longer be able to log in to your account.
                                                <br/>
                                                <br/>Kindly contact your HR to resolve the issue. 
                                                <br/>Thank You.`,
                                        },
                                    })
                                    .catch(error => {
                                        throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
                                    });
                    });
};