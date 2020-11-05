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
                                
    return Company.parseAsync(documentData)
                    .catch(error => {
                        functions.logger.error('Error resolving document', error);

                        throw new functions.https.HttpsError('internal', 'The document is invalid or non-existent', error);
                    });
};

export const resolveEmployee = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);

    const documentData = Object.assign(document.data(), { id: document.id });
    
    return Employee.parseAsync(documentData)
                    .catch(error => {
                        functions.logger.error('Error resolving document', error);
                        
                        throw new functions.https.HttpsError('internal', 'The document is invalid or non-existent', error);
                    });
};

export const resolvePlan = async (documentPathOrData: any) => {
    return Plan.parseAsync(documentPathOrData)
                .catch(async () => {
                    const document = await fetchDocument(documentPathOrData);
                
                    const documentData = document.data();
                
                    if (!documentData) {
                        return null;
                    }
                
                    const plan = Object.assign(documentData, { id: document.id });
                    
                    return Plan.parseAsync(plan)
                                .catch(error => {
                                    functions.logger.error('Error resolving document', error);
                                    
                                    throw new functions.https.HttpsError('internal', 'The document is invalid', error);
                                });
                });
};

export const resolveCourse = async (documentPath: string | admin.firestore.DocumentReference) => {
    const document = await fetchDocument(documentPath);

    const documentData = Object.assign(document.data(), { id: document.id });
    
    return Course.parseAsync(documentData)
                .catch(error => {
                    functions.logger.error('Error resolving document', error);
                    
                    throw new functions.https.HttpsError('internal', 'The document is invalid or non-existent', error);
                });
};