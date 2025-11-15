import { useState, useEffect } from 'react';
import { CheckinRecord, Coach, WalkinClient, PricePlan } from '../types';
import { getLocalISOString, getTodayYMD } from '../utils/dateUtils';

const STORAGE_KEY = 'gnex-gym-checkin-records';

export const useCheckins = (
    coaches: Coach[],
    addWalkinClient: (clientData: Omit<WalkinClient, 'id'>, sessionPlan?: WalkinClient['sessionPlan']) => WalkinClient,
    updateWalkinClient: (updatedClient: WalkinClient) => void,
    updateWalkinClientSessionPlan: (clientId: string, sessionPlan: WalkinClient['sessionPlan']) => void
) => {
    const [checkinRecords, setCheckinRecords] = useState<CheckinRecord[]>(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : [];
        } catch (error) {
            console.error("Error reading check-in records from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(checkinRecords));
        } catch (error) {
            console.error("Error saving check-in records to localStorage", error);
        }
    }, [checkinRecords]);

    const addCheckinRecord = (recordData: Omit<CheckinRecord, 'id' | 'timestamp'>) => {
        setCheckinRecords(prevRecords => {
            let totalPreviousBalance = 0;
            const clientId = recordData.type === 'Member' ? recordData.gymNumber : recordData.walkinClientId;
            const clientIdentifierKey = recordData.type === 'Member' ? 'gymNumber' : 'walkinClientId';
    
            const recordIdsWithBalance = new Set<string>();

            if (clientId) {
                for (const r of prevRecords) {
                    // Ensure we're only carrying over balances from records that are closed out
                    if (r[clientIdentifierKey] === clientId && r.balance > 0 && r.checkoutTimestamp) {
                        totalPreviousBalance += r.balance;
                        recordIdsWithBalance.add(r.id);
                    }
                }
            }
    
            // We build the new record in stages using 'const' variables,
            // which provides a clearer and safer control flow for the compiler to analyze.
            
            // 1. Create the base record.
            const baseRecord: CheckinRecord = {
                id: `rec-${Date.now()}`,
                timestamp: getLocalISOString(),
                ...recordData,
                amountDue: recordData.amountDue ?? recordData.paymentDetails?.amount ?? 0,
                amountPaid: recordData.amountPaid ?? 0,
                balance: recordData.balance ?? (recordData.paymentDetails?.amount ?? 0) - (recordData.amountPaid ?? 0),
            };
    
            // 2. Adjust for carried-over balance.
            const recordWithBalance = ((): CheckinRecord => {
                if (totalPreviousBalance > 0) {
                    const existingPaymentDetails = baseRecord.paymentDetails;
                    return {
                        ...baseRecord,
                        carriedOverBalance: totalPreviousBalance,
                        amountDue: baseRecord.amountDue + totalPreviousBalance,
                        balance: baseRecord.balance + totalPreviousBalance,
                        paymentDetails: existingPaymentDetails
                            ? {
                                  ...existingPaymentDetails,
                                  plan: `${existingPaymentDetails.plan} (+₱${totalPreviousBalance.toFixed(2)} prev bal)`,
                              }
                            : undefined,
                    };
                }
                return baseRecord;
            })();
    
            // 3. Adjust for new pending records.
            const newRecord = ((): CheckinRecord => {
                if (recordWithBalance.status === 'Pending' && !('amountDue' in recordData)) {
                    // FIX: Use `recordWithBalance` which is a fully typed CheckinRecord to avoid
                    // TypeScript inferring `recordData` as `never` inside this conditional block due to a type contradiction.
                    const dueAmount = recordWithBalance.paymentDetails?.amount || 0;
                    return {
                       ...recordWithBalance,
                       amountDue: dueAmount + (recordWithBalance.carriedOverBalance || 0),
                       amountPaid: 0,
                       balance: dueAmount + (recordWithBalance.carriedOverBalance || 0),
                    };
                }
                return recordWithBalance;
            })();
            
            // Update old records to zero out the balance
            const updatedPrevRecords = prevRecords.map(r => {
                if (recordIdsWithBalance.has(r.id)) {
                    return { ...r, balance: 0 };
                }
                return r;
            });
            
            return [newRecord, ...updatedPrevRecords];
        });
    };
    
    const confirmPendingRecord = (id: string, updates?: Partial<Omit<CheckinRecord, 'id'>>) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id !== id) {
                return r;
            }
    
            // Create a mutable copy and apply any initial updates from the confirmation modal.
            const updatedRecord: CheckinRecord = { ...r, ...(updates || {}) };
    
            // Handle new walk-in client creation if necessary.
            if (updatedRecord.isNewWalkin) {
                const sessionPlan = updatedRecord.sessionPlanDetails 
                    ? { ...updatedRecord.sessionPlanDetails, used: 0 } 
                    : undefined;
    
                if (updatedRecord.walkinClientId) {
                    // Update last visit for an existing walk-in client.
                    updateWalkinClient({ 
                        id: updatedRecord.walkinClientId, 
                        name: updatedRecord.name, 
                        contactNumber: updatedRecord.contactNumber || '', 
                        photoUrl: updatedRecord.photoUrl, 
                        lastVisit: getTodayYMD()
                    });
                    if (sessionPlan) {
                        updateWalkinClientSessionPlan(updatedRecord.walkinClientId, sessionPlan);
                    }
                } else {
                    // Create a record for a brand new client.
                    const client = addWalkinClient({
                        name: updatedRecord.name, 
                        contactNumber: updatedRecord.contactNumber || '',
                        photoUrl: updatedRecord.photoUrl, 
                        lastVisit: getTodayYMD()
                    }, sessionPlan);
                    updatedRecord.walkinClientId = client.id;
                }
                updatedRecord.isNewWalkin = false;
            }
    
            // Finalize status and remove the temporary pending action flag.
            updatedRecord.status = 'Confirmed';
            delete (updatedRecord as Partial<CheckinRecord>).pendingAction;
    
            return updatedRecord;
        }));
    };
    
    const assignCoachToRecord = (recordId: string, coachName: string) => {
        setCheckinRecords(prev => prev.map(r => 
            r.id === recordId ? { ...r, coachAssigned: coachName } : r
        ));
    };

    const cancelPendingRecord = (id: string, reason: string) => {
        setCheckinRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'Cancelled', cancellationReason: reason } : r));
    };

    const confirmCheckout = (recordId: string, balanceDueDate?: string) => {
        setCheckinRecords(prev => {
            const record = prev.find(r => r.id === recordId);
            // Block checkout only if there's a balance AND no due date is provided
            if (record && record.pendingAction === 'checkout' && record.balance > 0 && !balanceDueDate) {
                alert(`Cannot confirm checkout for ${record.name}. An outstanding balance of ₱${record.balance.toFixed(2)} must be settled first or a future payment date must be set.`);
                return prev;
            }
    
            return prev.map(r => {
                if (r.id === recordId && r.pendingAction === 'checkout') {
                    const { pendingAction, ...rest } = r;
                    return { 
                        ...rest, 
                        checkoutTimestamp: getLocalISOString(),
                        balanceDueDate: balanceDueDate || r.balanceDueDate // Persist due date
                    };
                }
                return r;
            });
        });
    };

    const cancelPendingCheckout = (recordId: string) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id === recordId && r.pendingAction === 'checkout') {
                const { pendingAction, ...rest } = r;
                return rest;
            }
            return r;
        }));
    };

    const addCheckoutRecord = (recordId: string, products: { productId: string; name: string; quantity: number; price: number }[], total: number) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                const productsWithId = products!.map(p => ({
                    ...p,
                    itemId: `item-${Date.now()}-${Math.random()}`
                }));

                return { 
                    ...r, 
                    productsPurchased: [...(r.productsPurchased || []), ...productsWithId],
                    amountDue: r.amountDue + total,
                    balance: r.balance + total,
                };
            }
            return r;
        }));
    };
    
    const addPaymentToRecord = (recordId: string, paymentAmount: number, newBalanceDueDate?: string) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                const newAmountPaid = r.amountPaid + paymentAmount;
                const newBalance = r.balance - paymentAmount;
                return {
                    ...r,
                    amountPaid: newAmountPaid,
                    balance: newBalance,
                    balanceDueDate: newBalance > 0 ? newBalanceDueDate : undefined
                };
            }
            return r;
        }));
    };

    const processPayment = (recordId: string, paymentAmount: number, settledProductIds: string[], newBalanceDueDate?: string) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id !== recordId) return r;

            const newAmountPaid = r.amountPaid + paymentAmount;
            const newBalance = r.balance - paymentAmount;

            const newProductsPurchased = r.productsPurchased?.filter(p => !settledProductIds.includes(p.productId));

            return {
                ...r,
                amountPaid: newAmountPaid,
                balance: newBalance,
                productsPurchased: newProductsPurchased,
                balanceDueDate: newBalance > 0 ? newBalanceDueDate : undefined
            };
        }));
    };
    
    const requestCheckoutByRecordId = (recordId: string): boolean => {
        let success = false;
        setCheckinRecords(prev => {
            const record = prev.find(r => r.id === recordId);
            // Allow checkout request even with a balance. The request is moved to pending.
            if (record && record.status === 'Confirmed' && !record.checkoutTimestamp && !record.pendingAction) {
                success = true;
                return prev.map(r => r.id === recordId ? { ...r, pendingAction: 'checkout' } : r);
            }
            return prev;
        });
        return success;
    };

    const addPlansToRecordTab = (recordId: string, plans: PricePlan[]) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id !== recordId) return r;
    
            const totalAmount = plans.reduce((sum, plan) => sum + plan.amount, 0);
            const newProducts = plans.map(p => ({
                itemId: `item-${Date.now()}-${Math.random()}`,
                productId: p.id,
                name: p.name,
                quantity: 1,
                price: p.amount
            }));
            const hasCoachPlan = plans.some(p => p.type === 'coach');

            return {
                ...r,
                productsPurchased: [...(r.productsPurchased || []), ...newProducts],
                amountDue: r.amountDue + totalAmount,
                balance: r.balance + totalAmount,
                needsCoach: r.needsCoach || hasCoachPlan,
            };
        }));
    };
    
    const removeItemFromRecord = (recordId: string, itemId: string) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id !== recordId || !r.productsPurchased) return r;
    
            const itemToRemove = r.productsPurchased.find(p => p.itemId === itemId);
            if (!itemToRemove) return r;
    
            const priceToSubtract = itemToRemove.price * itemToRemove.quantity;
            const newProductsPurchased = r.productsPurchased.filter(p => p.itemId !== itemId);
            const newBalance = r.balance - priceToSubtract;
    
            return {
                ...r,
                productsPurchased: newProductsPurchased,
                amountDue: r.amountDue - priceToSubtract,
                balance: newBalance,
                balanceDueDate: newBalance > 0 ? r.balanceDueDate : undefined,
            };
        }));
    };

    const addPaymentsToRecord = (recordId: string, plans: PricePlan[]) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                const totalAmount = plans.reduce((sum, p) => sum + p.amount, 0);
                const planNames = plans.map(p => `Renewal: ${p.name}`).join(' + ');
    
                const newPaymentDetailsString = [
                    r.paymentDetails?.plan,
                    planNames
                ].filter(Boolean).join(' + ');
                
                const newPaymentAmount = (r.paymentDetails?.amount || 0) + totalAmount;
    
                return {
                    ...r,
                    paymentDetails: {
                        plan: newPaymentDetailsString,
                        amount: newPaymentAmount,
                    },
                    amountDue: r.amountDue + totalAmount,
                    amountPaid: r.amountPaid + totalAmount,
                    // Balance should not change because this is a direct payment, not adding to a tab
                };
            }
            return r;
        }));
    };

    const addPartialDuesPaymentToRecord = (recordId: string, plans: PricePlan[], paymentAmount: number, dueDate: string) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                const totalDues = plans.reduce((sum, p) => sum + p.amount, 0);
                const planNames = plans.map(p => `Due: ${p.name}`).join(' + ');

                const newPaymentDetailsString = [
                    r.paymentDetails?.plan,
                    planNames
                ].filter(Boolean).join(' + ');

                return {
                    ...r,
                    paymentDetails: {
                        plan: newPaymentDetailsString,
                        amount: (r.paymentDetails?.amount || 0) + totalDues,
                    },
                    amountDue: r.amountDue + totalDues,
                    amountPaid: r.amountPaid + paymentAmount,
                    balance: r.balance + totalDues - paymentAmount,
                    balanceDueDate: dueDate,
                };
            }
            return r;
        }));
    };

    const addServicesToWalkinRecord = (recordId: string, plans: PricePlan[]) => {
        setCheckinRecords(prev => prev.map(r => {
            if (r.id !== recordId || r.type !== 'Walk-in') return r;

            const totalAmount = plans.reduce((sum, plan) => sum + plan.amount, 0);
            
            const newProducts = plans.map(p => ({
                itemId: `item-${Date.now()}-${Math.random()}`,
                productId: p.id,
                name: p.name,
                quantity: 1,
                price: p.amount
            }));

            const sessionPlanInfo = plans.find(p => p.name.toLowerCase().includes('sessions'));
            if (r.walkinClientId && sessionPlanInfo) {
                const sessionMatch = sessionPlanInfo.name.match(/(\d+)\s*SESSION/i);
                const totalSessions = sessionMatch ? parseInt(sessionMatch[1], 10) : 0;
                if (totalSessions > 0) {
                    updateWalkinClientSessionPlan(r.walkinClientId, { name: sessionPlanInfo.name, total: totalSessions, used: 0 });
                }
            }

            const hasCoachPlan = plans.some(p => p.type === 'coach' || p.type === 'class' || p.name.toLowerCase().includes('pt') || p.name.toLowerCase().includes('boxing') || p.name.toLowerCase().includes('muaythai'));
            const coachAssigned = plans.some(p => p.name.toLowerCase().includes('taekwondo')) ? 'COACH RALPH' : r.coachAssigned;
            
            return {
                ...r,
                productsPurchased: [...(r.productsPurchased || []), ...newProducts],
                amountDue: r.amountDue + totalAmount,
                balance: r.balance + totalAmount,
                needsCoach: r.needsCoach || hasCoachPlan,
                coachAssigned,
                className: plans.find(p => p.type === 'class')?.name || r.className,
            };
        }));
    };

    const markRecordSessionCompleted = (recordId: string) => {
        setCheckinRecords(prev => prev.map(r => 
            r.id === recordId ? { ...r, sessionCompleted: true } : r
        ));
    };

    return { checkinRecords, addCheckinRecord, confirmPendingRecord, cancelPendingRecord, addCheckoutRecord, requestCheckoutByRecordId, addPaymentToRecord, processPayment, addPlansToRecordTab, addPaymentsToRecord, addPartialDuesPaymentToRecord, addServicesToWalkinRecord, confirmCheckout, cancelPendingCheckout, assignCoachToRecord, removeItemFromRecord, markRecordSessionCompleted };
};
