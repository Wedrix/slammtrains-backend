import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import PromisePool = require('@supercharge/promise-pool');

import { resolveCompany, resolveEmployee } from '../Helpers/ResolveDocuments';

export default async (companyId: string) => {
    const company = await resolveCompany(`companies/${companyId}`);

    await admin.firestore()
                .doc(`/companies/${companyId}`)
                .update({
                    accessBlockedAt: null,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The company document could not be updated.', error);
                });

    // Unlock HR Access
    await admin.auth()
                .setCustomUserClaims(company.hr.uid, { accessBlocked: false })
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
                                    .setCustomUserClaims(employee.uid, { accessBlocked: false })
                                    .catch(error => {
                                        throw new functions.https.HttpsError('internal', 'The custom claims could not be set on this user.', error);
                                    });
                    });
};