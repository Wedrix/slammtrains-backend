import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { PlanData } from '../Schema/Data';
import { resolveCompany } from '../Helpers/ResolveDocuments';

export default async (planData: PlanData, companyId: string) => {
    const company = await resolveCompany(`companies/${companyId}`);

    if (planData.licensedNumberOfEmployees < company.employeesTotalCount) {
        throw new functions.https.HttpsError('failed-precondition', 'The new plan does not have enough licenses for all the company\'s employees');
    }

    const courses = planData.courseIds.map(courseId => {
        return admin.firestore().doc(`courses/${courseId}`);
    });
    
    const id = admin.firestore().collection('plans').doc().id;
    const subscription = null;

    await admin.firestore()
                .doc(`companies/${companyId}`)
                .update({ 
                    plan: {
                        id,
                        name: planData.name,
                        description: planData.description,
                        licensedNumberOfEmployees: planData.licensedNumberOfEmployees,
                        billing: planData.billing,
                        courses,
                        createdAt: new Date().valueOf(),
                    },
                    subscription,
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'The company plan could not be updated.', error);
                });

    await admin.firestore()
                .collection('customPlanRequests')
                .where('company', '==', admin.firestore().doc(`companies/${company.id}`))
                .get()
                .then(async querySnapshot => {
                    const documents = querySnapshot.docs;

                    const customPlanRequestId = documents[0].id;

                    await admin.firestore()
                                .doc(`customPlanRequests/${customPlanRequestId}`)
                                .delete()
                                .catch(error => {
                                    throw new functions.https.HttpsError('internal', 'Cannot delete the custom plan request', error);
                                });
                })
                .catch(error => {
                    throw new functions.https.HttpsError('internal', 'Cannot get the custom plan request for deletion', error);
                });

    // Send Email Notification
    await admin.firestore()
            .collection('mail')
            .add({
                to: company.hr.email,
                message: {
                    subject: `Plan changed to custom plan`,
                    html: `Hello ${company.hr.firstName},
                        <br/>Your active plan has been changed to a custom plan as per your request.
                        <br/>To activate this plan, kindly log in, navigate to Settings -> Billing and click on the 'Activate Plan' button if billing is enabled for the plan.
                        <br/>Thank You.`,
                },
            })
            .catch(error => {
                throw new functions.https.HttpsError('internal', 'The mail record could not be added', error);
            });
};