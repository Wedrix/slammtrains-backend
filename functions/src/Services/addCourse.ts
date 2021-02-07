import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { lower } from 'case';

import { CourseData } from '../Schema/Data';

import { cloneDeep } from 'lodash';

export default async (courseData: CourseData) => {
    const courseId = admin.firestore()
                        .collection('courses')
                        .doc()
                        .id;

    const data: any = cloneDeep(courseData);

    await Promise.all(
        data.modules
            .map(async (courseModule: any, moduleIndex: any) => {
                await Promise.all(
                    courseModule.lessons
                                .map(async (lesson: any, lessonIndex: any) => {
                                    const lessonContentDocRef = admin.firestore()
                                                                    .doc(`courses/${courseId}/content/${moduleIndex}_${lessonIndex}`);

                                    const lessonContent = {
                                        [lesson.contentType]: lesson.content[lesson.contentType] || null,
                                    };
                                    
                                    await lessonContentDocRef.set(lessonContent)
                                                            .catch(error => {
                                                                throw new functions.https.HttpsError('internal', 'Problem setting lesson content', error);
                                                            });
    
                                    lesson.content = lessonContentDocRef;
                                })
                );
            })
    );

    await admin.firestore()
                .doc(`courses/${courseId}`)
                .set({
                    ...data,
                    __name: lower(data.name),
                    createdAt: new Date().valueOf(),
                    ratingsSumTotal: 0,
                    reviewsSumTotal: 0,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The course record could not be added', error);
                });
};