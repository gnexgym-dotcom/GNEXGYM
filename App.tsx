import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MemberList } from './components/MemberList';
import { Checkin } from './components/Checkin';
import { Records } from './components/Records';
import { CoachLog } from './components/CoachLog';
import { WorkoutPlanner } from './components/WorkoutPlanner';
import { DietPlanner } from './components/DietPlanner';
import { CoachManagement } from './components/CoachManagement';
import { PriceList as PriceListComponent } from './components/PriceList';
import { ProductManagement } from './components/ProductManagement';
import { WalkinLog } from './components/WalkinLog';
import { Tasks } from './components/Tasks';
import { ClassManagement } from './components/ClassManagement';
import { TaekwondoLog } from './components/TaekwondoLog';
import { UnsettledPaymentsLog } from './components/UnsettledPaymentsLog';
import { PaymentHistoryLog } from './components/PaymentHistoryLog';
import { Member, PricePlan, Class, MemberHistoryEntry, CheckinRecord } from './types';

import { useMembers } from './hooks/useMembers';
import { useCheckins } from './hooks/useCheckins';
import { useCoaches } from './hooks/useCoaches';
import { usePriceList } from './hooks/usePriceList';
import { useProducts } from './hooks/useProducts';
import { useWalkinClients } from './hooks/useWalkinClients';
import { useTasks } from './hooks/useTasks';
import { useClasses } from './hooks/useClasses';
import { formatToYMD, getTodayYMD, addMonths, addDays, addYear, getLocalISOString } from './utils/dateUtils';

export type View = 'dashboard' | 'members' | 'checkin' | 'records' | 'coach-log' | 'workout-planner' | 'diet-planner' | 'coaches' | 'prices' | 'products' | 'walkin-log' | 'tasks' | 'classes' | 'taekwondo-log' | 'unsettled-payments' | 'payment-history';

const App: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');

    const memberHook = useMembers();
    const coachHook = useCoaches();
    const priceHook = usePriceList();
    const productHook = useProducts();
    const walkinClientHook = useWalkinClients();
    const taskHook = useTasks();
    const classHook = useClasses(coachHook.coaches);

    const { 
        checkinRecords, 
        addCheckinRecord, 
        confirmPendingRecord, 
        cancelPendingRecord, 
        addCheckoutRecord, 
        requestCheckoutByRecordId, 
        addPaymentToRecord,
        processPayment,
        addPlansToRecordTab,
        addPaymentsToRecord,
        addPartialDuesPaymentToRecord,
        addServicesToWalkinRecord,
        confirmCheckout,
        cancelPendingCheckout,
        assignCoachToRecord,
        removeItemFromRecord,
        markRecordSessionCompleted,
    } = useCheckins(
        coachHook.coaches,
        walkinClientHook.addWalkinClient,
        walkinClientHook.updateWalkinClient,
        walkinClientHook.updateWalkinClientSessionPlan
    );
    
    const onSaveMember = (
        memberData: Member | Omit<Member, 'id' | 'membershipStartDate' | 'lastPaymentDate' | 'dueDate'>,
        purchasedPlans?: PricePlan[],
        newSubscriptionStartDate?: string
    ) => {
        let memberToUpdate: Member;
        if ('id' in memberData) {
            // This now handles both the update and any payments in one go.
            memberHook.updateMember(memberData, purchasedPlans, newSubscriptionStartDate);
            memberToUpdate = memberData;
        } else {
            // This now handles adding the member and any initial payments in one go.
            memberToUpdate = memberHook.addMember(memberData, purchasedPlans, newSubscriptionStartDate);
        }
    
        // The checkin record for online payments is for logging purposes only.
        if (purchasedPlans && purchasedPlans.length > 0) {
            purchasedPlans.forEach(plan => {
                addCheckinRecord({
                    type: 'Member',
                    name: memberToUpdate.name,
                    gymNumber: memberToUpdate.id,
                    photoUrl: memberToUpdate.photoUrl,
                    status: 'Confirmed',
                    paymentDetails: {
                        plan: `Online Payment: ${plan.name}`,
                        amount: plan.amount
                    },
                    amountDue: plan.amount,
                    amountPaid: plan.amount,
                    balance: 0,
                    needsCoach: false,
                    checkoutTimestamp: getLocalISOString(),
                });
            });
        }
    };
    
    const onAddPlansToTab = (memberId: string, recordId: string, plans: PricePlan[]) => {
        // Update member profile, but log as "Added to Tab" not as a direct payment.
        memberHook.addPlansToMember(memberId, plans, false);
        // Add the plan charges to the daily record tab.
        addPlansToRecordTab(recordId, plans);
    };

    const addServicePaymentToPendingMember = (memberId: string, plan: PricePlan) => {
        const pendingRecord = checkinRecords.find(r => r.gymNumber === memberId && r.status === 'Pending');
        if (!pendingRecord) {
            alert(`Could not find a pending check-in for member ${memberId}.`);
            return;
        }

        memberHook.addPlansToMember(memberId, [plan], true);
        confirmPendingRecord(
            pendingRecord.id,
            {
                paymentDetails: { plan: `Service: ${plan.name}`, amount: plan.amount },
                amountDue: plan.amount,
                amountPaid: plan.amount,
                balance: 0,
            }
        );
    };
    
    const handleSettleAndPay = (record: CheckinRecord, paymentAmount: number, settledPlans: PricePlan[], newBalanceDueDate?: string) => {
        const settledPlanIds = settledPlans.map(p => p.id);

        if (record.gymNumber) {
            memberHook.addPaymentHistoryToMember(record.gymNumber, paymentAmount, "Payment for daily tab.");
        } else if (record.walkinClientId) {
            walkinClientHook.addPaymentHistoryToWalkinClient(record.walkinClientId, paymentAmount, "Payment for daily tab.");
        }
        
        processPayment(record.id, paymentAmount, settledPlanIds, newBalanceDueDate);
    };


    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard 
                            members={memberHook.members} 
                            checkinRecords={checkinRecords} 
                            onSaveMember={onSaveMember}
                            coaches={coachHook.coaches}
                            priceList={priceHook.priceList}
                            classes={classHook.classes}
                            confirmPendingRecord={confirmPendingRecord}
                            cancelPendingRecord={cancelPendingRecord}
                            unfreezeMember={memberHook.unfreezeMember}
                            useSession={memberHook.useSession}
                            walkinClients={walkinClientHook.walkinClients}
                            onAddServicePaymentToPendingMember={addServicePaymentToPendingMember}
                            confirmCheckout={confirmCheckout}
                            cancelPendingCheckout={cancelPendingCheckout}
                            addPaymentToRecord={addPaymentToRecord}
                            addPaymentHistoryToMember={memberHook.addPaymentHistoryToMember}
                            addPaymentHistoryToWalkinClient={walkinClientHook.addPaymentHistoryToWalkinClient}
                        />;
            case 'members':
                return <MemberList 
                            members={memberHook.members}
                            checkinRecords={checkinRecords}
                            deleteMember={memberHook.deleteMember}
                            addMultipleMembers={memberHook.addMultipleMembers}
                            getNextMemberId={memberHook.getNextMemberId}
                            coaches={coachHook.coaches}
                            onSaveMember={onSaveMember}
                            priceList={priceHook.priceList}
                            classes={classHook.classes}
                        />;
            case 'checkin':
                return <Checkin 
                            members={memberHook.members} 
                            checkinRecords={checkinRecords}
                            addCheckinRecord={addCheckinRecord}
                            useSession={memberHook.useSession}
                            priceList={priceHook.priceList}
                            walkinClients={walkinClientHook.walkinClients}
                            requestCheckoutByRecordId={requestCheckoutByRecordId}
                            useSessionForWalkinClient={walkinClientHook.useSessionForWalkinClient}
                        />;
            case 'records':
                return <Records 
                            checkinRecords={checkinRecords}
                            products={productHook.products}
                            addCheckoutRecord={addCheckoutRecord}
                            members={memberHook.members}
                            priceList={priceHook.priceList}
                            onAddPlansToTab={onAddPlansToTab}
                            addServicesToWalkinRecord={addServicesToWalkinRecord}
                            confirmCheckout={confirmCheckout}
                            cancelPendingCheckout={cancelPendingCheckout}
                            coaches={coachHook.coaches}
                            assignCoachToRecord={assignCoachToRecord}
                            onSettleAndPay={handleSettleAndPay}
                            removeItemFromRecord={removeItemFromRecord}
                        />;
            case 'coach-log':
                return <CoachLog 
                            checkinRecords={checkinRecords} 
                            members={memberHook.members}
                            markSessionComplete={memberHook.markSessionComplete} 
                            sessionCompletionMessage={memberHook.sessionCompletionMessage}
                            clearSessionCompletionMessage={memberHook.clearSessionCompletionMessage}
                            walkinClients={walkinClientHook.walkinClients}
                            useSessionForWalkinClient={walkinClientHook.useSessionForWalkinClient}
                            addCheckinRecord={addCheckinRecord}
                            markRecordSessionCompleted={markRecordSessionCompleted}
                        />;
            case 'workout-planner':
                return <WorkoutPlanner />;
            case 'diet-planner':
                return <DietPlanner />;
            case 'coaches':
                return <CoachManagement {...coachHook} />;
            case 'prices':
                return <PriceListComponent {...priceHook} />;
            case 'products':
                return <ProductManagement {...productHook} />;
            case 'walkin-log':
                return <WalkinLog 
                            walkinClients={walkinClientHook.walkinClients}
                            checkinRecords={checkinRecords}
                            onSaveMember={onSaveMember}
                            deleteWalkinClient={walkinClientHook.deleteWalkinClient}
                            getNextMemberId={memberHook.getNextMemberId}
                            coaches={coachHook.coaches}
                            priceList={priceHook.priceList}
                            classes={classHook.classes}
                            updateWalkinClient={walkinClientHook.updateWalkinClient}
                        />;
            case 'tasks':
                return <Tasks {...taskHook} members={memberHook.members} />;
            case 'classes':
                return <ClassManagement 
                            {...classHook} 
                            members={memberHook.members} 
                            coaches={coachHook.coaches}
                            updateMember={memberHook.updateMember}
                        />;
            case 'taekwondo-log':
                 return <TaekwondoLog
                            walkinClients={walkinClientHook.walkinClients}
                            checkinRecords={checkinRecords}
                            onSaveMember={onSaveMember}
                            deleteWalkinClient={walkinClientHook.deleteWalkinClient}
                            updateWalkinClient={walkinClientHook.updateWalkinClient}
                            markTaekwondoSessionUsed={walkinClientHook.markTaekwondoSessionUsed}
                            getNextMemberId={memberHook.getNextMemberId}
                            coaches={coachHook.coaches}
                            priceList={priceHook.priceList}
                            classes={classHook.classes}
                            addCheckinRecord={addCheckinRecord}
                        />;
            case 'unsettled-payments':
                return <UnsettledPaymentsLog
                            checkinRecords={checkinRecords}
                            members={memberHook.members}
                        />;
            case 'payment-history':
                return <PaymentHistoryLog members={memberHook.members} walkinClients={walkinClientHook.walkinClients} />;
            default:
                return <div>Select a view</div>;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 font-sans">
            <Sidebar currentView={view} setView={setView} />
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};

export default App;
