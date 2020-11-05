import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import * as path from 'path';
import * as os from 'os';

admin.initializeApp(functions.config().firebase);

import setAdmin from './Services/setAdmin';
import signUpHR from './Services/signUpHR';
import registerCompany from './Services/registerCompany';
import addEmployee from './Services/addEmployee';
import importEmployees from './Services/importEmployees';
import removeEmployee from './Services/removeEmployee';
import processPaystackEvents from './processPaystackEvents';
import addPlan from './Services/addPlan';
import addCourse from './Services/addCourse';
import addDraftCourse from './Services/addDraftCourse';
import setCustomPlanForCompany from './Services/setCustomPlanForCompany';
import setPlanForCompany from './Services/setPlanForCompany';
import sendSubscriptionReminders from './Services/sendSubscriptionReminders';
import blockAccessForCompaniesWithExpiredSubscriptions from './Services/blockAccessForCompaniesWithExpiredSubscriptions';

import * as Schema from 'zod';
import { EmployeeData, PlanData, CompanyData, HRData, CourseData, DraftCourseData } from './Schema/Data';

interface Auth {
    uid: string;
    token: admin.auth.DecodedIdToken;
};

const authorizeRequestForHR = async (auth: Auth | undefined) => {
    if (!auth) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');
    }

    const authUserRecord = await admin.auth().getUser(auth.uid);
    const customClaims = authUserRecord.customClaims; 

    if (!customClaims) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');     
    }

    if (customClaims.accessLevel !== 'hr') {
        throw new functions.https.HttpsError('permission-denied', 'You are not authroized to call this function');
    }
};

const authorizeRequestForAdmin = async (auth: Auth | undefined) => {
    if (!auth) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');
    }

    const authUserRecord = await admin.auth().getUser(auth.uid);
    const customClaims = authUserRecord.customClaims; 

    if (!customClaims) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');     
    }

    if (customClaims.accessLevel !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'You are not authroized to call this function');
    }
};

const resolveCompanyIdForHR = async (auth: Auth | undefined) => {
    if (!auth) {
        throw new functions.https.HttpsError('permission-denied', 'You are not authorized to call this function');
    }

    const uid = auth.uid;

    const companyId = await admin.firestore()
                                .collection('companies')
                                .where('hr.uid','==',uid)
                                .select()
                                .get()
                                .then(documentsSnapshot => {
                                    const document = documentsSnapshot.docs[0];

                                    if (!document) {
                                        throw new functions.https.HttpsError('failed-precondition', 'Kindly register a company on your account to proceed');
                                    }

                                    return document.id;
                                })
                                .catch(error => {
                                    throw new functions.https.HttpsError('internal', 'Error resolving company Id from request', error);
                                });

    return companyId;
};

exports.setAdmin = functions.https.onCall(async () => {
    await setAdmin();
});

exports.signUpHR = functions.https.onCall(async data => {
    const hrData = await HRData.parseAsync(data.hrData)
                            .catch(error => {
                                throw new functions.https.HttpsError('invalid-argument', 'The hr data is invalid.', error);
                            });

    await signUpHR(hrData);
});

exports.registerCompany = functions.https.onCall(async (data, context) => {
    await authorizeRequestForHR(context.auth);
    
    if (context.auth) {
        const uid = context.auth.uid;

        const companyData = await CompanyData.parseAsync(data.companyData)
                                            .catch(error => {
                                                throw new functions.https.HttpsError('invalid-argument', 'The company data is invalid.', error);
                                            });
    
        await registerCompany(uid, companyData);
    }
});

exports.addEmployee = functions.https.onCall(async (data, context) => {
    await authorizeRequestForHR(context.auth);

    const companyId = await resolveCompanyIdForHR(context.auth);

    const employeeData = await EmployeeData.parseAsync(data.employeeData)
                                            .catch(error => {
                                                throw new functions.https.HttpsError('invalid-argument', 'The employee data is invalid', error);
                                            });

    await addEmployee(employeeData, companyId);
});

exports.removeEmployee = functions.https.onCall(async (data, context) => {
    await authorizeRequestForHR(context.auth);

    const companyId = await resolveCompanyIdForHR(context.auth);

    const employeeId = await Schema.string()
                                    .parseAsync(data.employeeId)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The employee Id is invalid', error);
                                    });

    await removeEmployee(employeeId, companyId);
});

exports.setPlanForCompany = functions.https.onCall(async (data, context) => {
    await authorizeRequestForHR(context.auth);

    const companyId = await resolveCompanyIdForHR(context.auth);

    const planId = await Schema.string()
                                .parseAsync(data.planId)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The plan Id is invalid', error);
                                });

    await setPlanForCompany(planId, companyId);
});

exports.addPlan = functions.https.onCall(async (data, context) => {
    await authorizeRequestForAdmin(context.auth);

    const planData = await PlanData.parseAsync(data.planData)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The plan data is invalid', error);
                                    });

    await addPlan(planData);
});

exports.setCustomPlanForCompany = functions.https.onCall(async (data, context) => {
    await authorizeRequestForAdmin(context.auth);

    const planData = await PlanData.parseAsync(data.planData)
                                    .catch(error => {
                                        throw new functions.https.HttpsError('invalid-argument', 'The plan data is invalid', error);
                                    });

    const companyId = await Schema.string()
                                .parseAsync(data.companyId)
                                .catch(error => {
                                    throw new functions.https.HttpsError('invalid-argument', 'The company Id is invalid', error);
                                });

    await setCustomPlanForCompany(planData, companyId);
});

exports.addCourse = functions.https.onCall(async (data, context) => {
    await authorizeRequestForAdmin(context.auth);

    const courseData = await CourseData.parseAsync(data.courseData)
                                        .catch(error => {
                                            throw new functions.https.HttpsError('invalid-argument', 'The course data is invalid', error);
                                        });

    await addCourse(courseData);
});

exports.addDraftCourse = functions.https.onCall(async (data, context) => {
    await authorizeRequestForAdmin(context.auth);

    const draftCourseData = await DraftCourseData.parseAsync(data.draftCourseData)
                                        .catch(error => {
                                            throw new functions.https.HttpsError('invalid-argument', 'The draft course data is invalid', error);
                                        });

    await addDraftCourse(draftCourseData);
});

exports.importEmployeesOnCSVUpload = functions.storage.object().onFinalize(async object => {
    // Run the function
    const fileBucket = object.bucket;
    const filePath = object.name;

    if (filePath) {
        // Get the file name.
        const fileName = path.basename(filePath); 
        const dirName = path.dirname(filePath);

        // Return if this is triggered on a file that is not a csv
        if (!fileName.match(/.csv/gi)) {
            return;
        }

        // Return if this is triggered on a csv that does not contain employee data
        if (!dirName.endsWith('/employees')) {
            return;
        }
    
        // Download file from bucket.
        const bucket = admin.storage().bucket(fileBucket);
        const tempFilePath = path.join(os.tmpdir(), fileName);
    
        try {
            await bucket.file(filePath).download({destination: tempFilePath}); 
        } catch (error) {
            throw new functions.https.HttpsError('internal', 'Error downloading CSV file', error);
        }

        const companyId = dirName.split('/')[1];

        await importEmployees(tempFilePath, companyId);
    }
});

exports.processPaystackEvents = functions.https.onRequest(processPaystackEvents);

exports.sendSubscriptionRemindersEveryTenMinutes = functions.pubsub
                                                        .schedule('every 10 minutes from 03:00 to 07:00')
                                                        .onRun(async (context) => {
                                                            await sendSubscriptionReminders();
                                                        });

exports.blockAccessForCompaniesWithExpiredSubscriptionsEveryTenMinutes = functions.pubsub
                                                                            .schedule('every 10 minutes from 03:00 to 07:00')
                                                                            .onRun(async (context) => {
                                                                                await blockAccessForCompaniesWithExpiredSubscriptions();
                                                                            });

exports.incrementEmployeesTotalCountOnCreate = functions.firestore
                                                    .document(`/companies/{companyId}/employees/{employeeId}`)
                                                    .onCreate(async (documentSnapshot, context) => {
                                                        const companyId = context.params.companyId;

                                                        await admin.firestore()
                                                                .doc(`companies/${companyId}`)
                                                                .update('employeesTotalCount', admin.firestore.FieldValue.increment(1));
                                                    });

exports.decrementEmployeesTotalCountOnDelete = functions.firestore
                                                    .document(`/companies/{companyId}/employees/{employeeId}`)
                                                    .onDelete(async (documentSnapshot, context) => {
                                                        const companyId = context.params.companyId;

                                                        await admin.firestore()
                                                                .doc(`companies/${companyId}`)
                                                                .update('employeesTotalCount', admin.firestore.FieldValue.increment(-1));
                                                    });