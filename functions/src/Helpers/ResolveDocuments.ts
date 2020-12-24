import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { Company } from '../Schema/Company';
import { Employee } from '../Schema/Employee';
import { Plan } from '../Schema/Plan';
import { Course } from '../Schema/Course';
import { Business } from '../Schema/Business';

const fetchDocument = async (documentPath: string | admin.firestore.DocumentReference) => {
    const documentReference = (typeof documentPath === 'string') ? admin.firestore().doc(documentPath) : documentPath;

    const documentSnapshot = await documentReference.get()
                                                    .catch(error => {
                                                        throw new functions.https.HttpsError('internal', 'Error retrieving document', error);
                                                    });

    const documentData = documentSnapshot.data();

    if (!documentData) {
        throw new functions.https.HttpsError('not-found', 'The document does not exist.');
    }

    return Object.assign(documentData, { id: documentSnapshot.id });
};

export const resolveBusiness = async () => {
    const settingsDocument = await fetchDocument('/settings/index');

    const businessData = settingsDocument.business;

    return Business.parseAsync(businessData);
};

export const resolveCompany = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);
    
    return Company.parseAsync(document);
};

export const resolveEmployee = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);
    
    return Employee.parseAsync(document);
};

export const resolvePlan = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);
    
    return Plan.parseAsync(document);
};

export const resolveCourse = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);
    
    return Course.parseAsync(document);
};