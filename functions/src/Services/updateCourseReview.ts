import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { ReviewData } from '../Schema/Data';
import { Employee } from '../Schema/Employee';
import { resolveReview } from '../Helpers/ResolveDocuments';

export default async (employee: Employee, reviewData: ReviewData) => {
    const review = await resolveReview(`courses/${reviewData.courseId}/reviews/${employee.id}`);
    
    await admin.firestore()
                .doc(`courses/${reviewData.courseId}/reviews/${employee.id}`)
                .update({ 
                    body: reviewData.body,
                    rating: reviewData.rating,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The asked question document could not be added.', error);
                });

    await admin.firestore()
                .doc(`courses/${reviewData.courseId}`)
                .update({
                    ratingsSumTotal: admin.firestore.FieldValue.increment((reviewData.rating - review.rating)),
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The course document could not be udpated.', error);
                });
};