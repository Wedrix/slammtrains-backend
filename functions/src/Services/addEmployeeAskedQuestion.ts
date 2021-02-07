import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { AskedQuestionData } from '../Schema/Data';
import { Employee } from '../Schema/Employee';
import { resolveCompany } from '../Helpers/ResolveDocuments';

export default async (employee: Employee, questionData: AskedQuestionData) => {
    if (!(employee.company instanceof admin.firestore.DocumentReference)) {
        throw new functions.https.HttpsError('invalid-argument', 'The reference is invalid');
    }

    const company = await resolveCompany(employee.company);

    await admin.firestore()
                .collection(`companies/${company.id}/employees/${employee.id}/askedQuestions`)
                .add({ 
                    ...questionData,
                    answer: null,
                    createdAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The asked question document could not be added.', error);
                });
};