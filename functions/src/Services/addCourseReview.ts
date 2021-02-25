import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { ReviewData } from '../Schema/Data';
import { Employee } from '../Schema/Employee';
import { resolveCompany, resolveCourse } from '../Helpers/ResolveDocuments';

const getInitials = (name: string) => {
    const names = name.split(' ');

    let initials = `${names[0].charAt(0)}`;

    if (names[names.length - 1]) {
        initials = initials + `${names[names.length - 1].charAt(0)}`;
    }

    return initials;
};

export default async (employee: Employee, reviewData: ReviewData) => {
    if (!(employee.company instanceof admin.firestore.DocumentReference)) {
        throw new functions.https.HttpsError('invalid-argument', 'The reference is invalid');
    }

    const company = await resolveCompany(employee.company);

    const course = await resolveCourse(`courses/${reviewData.courseId}`);
    
    await admin.firestore()
                .doc(`courses/${course.id}/reviews/${employee.id}`)
                .set({ 
                    body: reviewData.body,
                    rating: reviewData.rating,
                    employee: admin.firestore().doc(`companies/${company.id}/employees/${employee.id}`),
                    employeeInitials: getInitials(employee.name),
                    createdAt: new Date().valueOf(),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The asked question document could not be added.', error);
                });

    await admin.firestore()
                .doc(`courses/${course.id}`)
                .update({
                    ratingsSumTotal: admin.firestore.FieldValue.increment(reviewData.rating),
                    reviewsSumTotal: admin.firestore.FieldValue.increment(1),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The course document could not be udpated.', error);
                })
};