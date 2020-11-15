import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { Company } from '../Schema/Company';
import { Employee } from '../Schema/Employee';
import { Plan } from '../Schema/Plan';
import { Course } from '../Schema/Course';

const fetchDocument = async (documentPath: string | admin.firestore.DocumentReference) => {
    const documentReference = (typeof documentPath === 'string') ? admin.firestore().doc(documentPath) : documentPath;

    const document = await documentReference.get()
                                            .catch(error => {
                                                throw new functions.https.HttpsError('internal', 'Error retrieving document', error);
                                            });
    
    return document;
};

export const resolveCompany = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);

    const documentData = Object.assign(document.data(), { id: document.id });
                                
    return Company.parseAsync(documentData);
};

export const resolveEmployee = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);

    const documentData = Object.assign(document.data(), { id: document.id });
    
    return Employee.parseAsync(documentData);
};

export const resolvePlan = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);

    const documentData = Object.assign(document.data(), { id: document.id });
    
    return Plan.parseAsync(documentData);
};

export const resolveCourse = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);

    const documentData = Object.assign(document.data(), { id: document.id });
    
    return Course.parseAsync(documentData);
};