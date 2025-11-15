import { useState, useCallback, useEffect } from 'react';
import { Member, MemberHistoryEntry, HistoryEntryType, PricePlan } from '../types';
import { formatToYMD, getTodayYMD, addMonths, addDays, addYear, parseDate, formatDate, isPastOrToday, getLocalISOString } from '../utils/dateUtils';

const STORAGE_KEY = 'gnex-gym-members';

const addHistoryEntry = (
    member: Member, 
    type: HistoryEntryType, 
    title: string, 
    details?: string, 
    paymentAmount?: number
): Member => {
    const newEntry: MemberHistoryEntry = { 
        timestamp: getLocalISOString(), 
        type, 
        title, 
        details, 
        paymentAmount 
    };
    const history = [newEntry, ...(member.history || [])];
    return { ...member, history };
};

// This is a pure function that applies payment logic to a member object without setting state.
const applyPaymentPlansToMember = (member: Member, plans: PricePlan[], newSubscriptionStartDate?: string): Member => {
    let updatedMember = { ...member };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    plans.forEach(plan => {
        const planNameLower = plan.name.toLowerCase();
        let historyTitle = '';
        let historyDetails = '';

        const isSessionPlan = plan.type === 'coach' || (plan.type === 'class' && planNameLower.includes('session'));

        if (isSessionPlan) {
            const sessionMatch = plan.name.match(/(\d+)\s*SESSION/i);
            const sessionsToAdd = sessionMatch ? parseInt(sessionMatch[1], 10) : 1;
            
            updatedMember.hasCoach = true;
            
            if (planNameLower.includes('boxing')) updatedMember.trainingType = 'Boxing Training';
            else if (planNameLower.includes('muaythai')) updatedMember.trainingType = 'Muaythai Training';
            else if (planNameLower.includes('taekwondo')) updatedMember.trainingType = 'Taekwondo Training';
            else if (planNameLower.includes('pt -')) updatedMember.trainingType = 'Loss Weight/Circuit Training';
            
            const remainingSessions = (updatedMember.totalSessions || 0) - (updatedMember.sessionsUsed || 0);
            const sessionsExpired = updatedMember.sessionExpiryDate && parseDate(updatedMember.sessionExpiryDate)! < today;

            if (remainingSessions <= 0 || sessionsExpired) {
                updatedMember.totalSessions = sessionsToAdd;
                updatedMember.sessionsUsed = 0;
            } else {
                updatedMember.totalSessions = (updatedMember.totalSessions || 0) + sessionsToAdd;
            }
            
            updatedMember.sessionExpiryDate = formatToYMD(addMonths(new Date(), 3));
            
            historyTitle = 'Online Payment: Coach/Class Plan';
            historyDetails = `Plan: ${plan.name}. New total sessions: ${updatedMember.totalSessions}.`;
            updatedMember = addHistoryEntry(updatedMember, 'payment', historyTitle, historyDetails, plan.amount);

        } else if (planNameLower.includes('locker rental')) {
            const currentDueDate = updatedMember.lockerDueDate ? parseDate(updatedMember.lockerDueDate) : null;
            const startDate = (currentDueDate && currentDueDate > today) ? currentDueDate : today;
            const newDueDate = addMonths(startDate, 1);
            updatedMember = {
                ...updatedMember,
                lockerStartDate: updatedMember.lockerStartDate || getTodayYMD(),
                lockerDueDate: formatToYMD(newDueDate),
            };
            updatedMember = addHistoryEntry(
                updatedMember, 'payment', 'Online Payment: Locker',
                `Plan: ${plan.name}. New Due Date: ${formatDate(newDueDate)}`, plan.amount
            );
        } else if (planNameLower.includes('membership fee')) {
            const currentDueDate = updatedMember.membershipFeeDueDate ? parseDate(updatedMember.membershipFeeDueDate) : null;
            const startDate = (currentDueDate && currentDueDate > today) ? currentDueDate : today;
            const newDueDate = addYear(startDate);
            updatedMember = {
                ...updatedMember,
                membershipFeeLastPaid: getTodayYMD(),
                membershipFeeDueDate: formatToYMD(newDueDate),
            };
            updatedMember = addHistoryEntry(
                updatedMember, 'payment', 'Online Payment: Membership Fee',
                `Plan: ${plan.name}. New Due Date: ${formatDate(newDueDate)}`, plan.amount
            );
        } else { // Standard membership renewal
            const isCurrentlyDue = !updatedMember.dueDate || isPastOrToday(updatedMember.dueDate);
            let startDateForNewPeriod: Date;
    
            if (isCurrentlyDue && newSubscriptionStartDate) {
                startDateForNewPeriod = parseDate(newSubscriptionStartDate) || new Date();
            } else if (isCurrentlyDue) {
                startDateForNewPeriod = new Date();
            } else {
                startDateForNewPeriod = parseDate(updatedMember.dueDate)!;
            }
            startDateForNewPeriod.setHours(0, 0, 0, 0);
            
            let newDueDate = new Date(startDateForNewPeriod);
            let newMembershipType = updatedMember.membershipType;
            let isRenewal = false;

            if (planNameLower.includes('yearly')) { newDueDate = addYear(newDueDate); isRenewal = true; } 
            else if (planNameLower.includes('6 months')) { newDueDate = addMonths(newDueDate, 6); isRenewal = true; } 
            else if (planNameLower.includes('3 months')) { newDueDate = addMonths(newDueDate, 3); isRenewal = true; } 
            else if (planNameLower.includes('no mf')) { newDueDate = addMonths(newDueDate, 1); newMembershipType = 'NO MF'; isRenewal = true; } 
            else if (planNameLower.includes('monthly')) { newDueDate = addMonths(newDueDate, 1); isRenewal = true; } 
            else if (planNameLower.includes('daily')) { newDueDate = addDays(newDueDate, 1); isRenewal = true; }

            if (isRenewal) {
                updatedMember = {
                    ...updatedMember,
                    status: 'Active',
                    lastPaymentDate: getTodayYMD(),
                    subscriptionStartDate: formatToYMD(startDateForNewPeriod),
                    dueDate: formatToYMD(newDueDate),
                    membershipType: newMembershipType,
                };
                updatedMember = addHistoryEntry(
                    updatedMember, 'payment', 'Online Payment: Renewal',
                    `Plan: ${plan.name}. New period starts ${formatDate(startDateForNewPeriod)}. New Due Date: ${formatDate(newDueDate)}`, plan.amount
                );
            }
        }
    });

    return updatedMember;
};


export const useMembers = () => {
    const [members, setMembers] = useState<Member[]>(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : [];
        } catch (error) {
            console.error("Error reading members from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
        } catch (error) {
            console.error("Error saving members to localStorage", error);
        }
    }, [members]);
    
    const [sessionCompletionMessage, setSessionCompletionMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

    const getNextMemberId = () => {
        const maxId = members.reduce((max, member) => {
            const match = member.id.match(/\d+$/);
            const numericId = match ? parseInt(match[0], 10) : 0;
            return numericId > max ? numericId : max;
        }, 0);
        return `G-${String(maxId + 1).padStart(4, '0')}`;
    };

    const addMember = (newMemberData: Omit<Member, 'id' | 'membershipStartDate' | 'lastPaymentDate' | 'dueDate'>, purchasedPlans?: PricePlan[], newSubscriptionStartDate?: string): Member => {
        const today = new Date();
        const dueDate = addMonths(today, 1);

        let newMember: Member = {
            ...newMemberData,
            id: getNextMemberId(),
            photoUrl: newMemberData.photoUrl || '',
            membershipStartDate: getTodayYMD(),
            subscriptionStartDate: getTodayYMD(),
            lastPaymentDate: getTodayYMD(),
            dueDate: formatToYMD(dueDate),
        };

        const details = `Initial Status: ${newMember.status}. Due Date: ${formatDate(newMember.dueDate)}`;
        newMember = addHistoryEntry(newMember, 'status_change', 'Member Created', details);

        if (purchasedPlans && purchasedPlans.length > 0) {
            newMember = applyPaymentPlansToMember(newMember, purchasedPlans, newSubscriptionStartDate);
        }

        setMembers(prev => [newMember, ...prev]);
        return newMember;
    };

    const addMultipleMembers = (newMembers: Member[]) => {
        setMembers(prev => {
            const memberMap = new Map(prev.map(m => [m.id, m]));
            newMembers.forEach(member => {
                memberMap.set(member.id, member);
            });
            return Array.from(memberMap.values());
        });
    };


    const updateMember = (updatedMember: Member, purchasedPlans?: PricePlan[], newSubscriptionStartDate?: string) => {
        setMembers(prev => prev.map(m => {
            if (m.id === updatedMember.id) {
                let memberToUpdate = { ...updatedMember };
                
                if (m.status.toLowerCase() !== memberToUpdate.status.toLowerCase()) {
                    const details = `Status manually updated from "${m.status}" to "${memberToUpdate.status}"`;
                    memberToUpdate = addHistoryEntry(memberToUpdate, 'status_change', 'Status Updated', details);
                }
                
                if (m.classId !== memberToUpdate.classId) {
                    const oldClassName = m.className || 'Unassigned';
                    const newClassName = memberToUpdate.className || 'Unassigned';
                    const details = `Class changed from "${oldClassName}" to "${newClassName}"`;
                    memberToUpdate = addHistoryEntry(memberToUpdate, 'status_change', 'Class Changed', details);
                }
                
                if (purchasedPlans && purchasedPlans.length > 0) {
                    memberToUpdate = applyPaymentPlansToMember(memberToUpdate, purchasedPlans, newSubscriptionStartDate);
                }

                return memberToUpdate;
            }
            return m;
        }));
    };

    const deleteMember = (id: string) => {
        setMembers(prev => prev.filter(m => m.id !== id));
    };

    const useSession = (memberId: string): boolean => {
        let success = false;
        setMembers(prev => prev.map(m => {
            if (m.id === memberId && m.hasCoach) {
                const sessionsUsed = m.sessionsUsed ?? 0;
                const totalSessions = m.totalSessions ?? 0;
                if (sessionsUsed < totalSessions) {
                    success = true;
                    const updatedMember = { ...m, sessionsUsed: sessionsUsed + 1 };
                    const details = `1 session used. ${totalSessions - (sessionsUsed + 1)} remaining.`;
                    return addHistoryEntry(updatedMember, 'session_update', 'Session Used', details);
                }
            }
            return m;
        }));
        return success;
    };
    
    const addPlansToMember = (memberId: string, plans: PricePlan[], asPayment: boolean = true) => {
        setMembers(prev => prev.map(m => {
            if (m.id !== memberId) return m;
    
            let updatedMember = { ...m };
            const today = new Date();
            today.setHours(0, 0, 0, 0);
    
            plans.forEach(plan => {
                const planNameLower = plan.name.toLowerCase();
    
                const historyType: HistoryEntryType = asPayment ? 'payment' : 'note';
                const paymentAmount = asPayment ? plan.amount : undefined;
                let historyTitle = '';
                let historyDetails = '';

                const isSessionPlan = plan.type === 'coach' || (plan.type === 'class' && planNameLower.includes('session'));
    
                if (isSessionPlan) {
                    const sessionMatch = plan.name.match(/(\d+)\s*SESSION/i);
                    const sessionsToAdd = sessionMatch ? parseInt(sessionMatch[1], 10) : 1;
                    
                    updatedMember.hasCoach = true;
                    
                    if (planNameLower.includes('boxing')) updatedMember.trainingType = 'Boxing Training';
                    else if (planNameLower.includes('muaythai')) updatedMember.trainingType = 'Muaythai Training';
                    else if (planNameLower.includes('taekwondo')) updatedMember.trainingType = 'Taekwondo Training';
                    else if (planNameLower.includes('pt -')) updatedMember.trainingType = 'Loss Weight/Circuit Training';
                    
                    const remainingSessions = (updatedMember.totalSessions || 0) - (updatedMember.sessionsUsed || 0);
                    const sessionsExpired = updatedMember.sessionExpiryDate && parseDate(updatedMember.sessionExpiryDate)! < today;
    
                    if (remainingSessions <= 0 || sessionsExpired) {
                        updatedMember.totalSessions = sessionsToAdd;
                        updatedMember.sessionsUsed = 0;
                    } else {
                        updatedMember.totalSessions = (updatedMember.totalSessions || 0) + sessionsToAdd;
                    }
                    
                    updatedMember.sessionExpiryDate = formatToYMD(addMonths(new Date(), 3));
                    
                    historyTitle = asPayment ? 'Coach/Class Plan Purchased' : 'Coach/Class Plan Added to Tab';
                    historyDetails = `Plan: ${plan.name}. New total sessions: ${updatedMember.totalSessions}.`;
                    updatedMember = addHistoryEntry(updatedMember, historyType, historyTitle, historyDetails, paymentAmount);

                } else if (planNameLower.includes('locker rental')) {
                    const currentDueDate = updatedMember.lockerDueDate ? parseDate(updatedMember.lockerDueDate) : null;
                    const startDate = (currentDueDate && currentDueDate > today) ? currentDueDate : today;
                    const newDueDate = addMonths(startDate, 1);
                    updatedMember = {
                        ...updatedMember,
                        lockerStartDate: updatedMember.lockerStartDate || getTodayYMD(),
                        lockerDueDate: formatToYMD(newDueDate),
                    };
                    historyTitle = asPayment ? 'Locker Rental Paid' : 'Locker Added to Tab';
                    historyDetails = `Plan: ${plan.name}. New Due Date: ${formatDate(newDueDate)}`;
                    updatedMember = addHistoryEntry(updatedMember, historyType, historyTitle, historyDetails, paymentAmount);

                } else if (planNameLower.includes('membership fee')) {
                    const currentDueDate = updatedMember.membershipFeeDueDate ? parseDate(updatedMember.membershipFeeDueDate) : null;
                    const startDate = (currentDueDate && currentDueDate > today) ? currentDueDate : today;
                    const newDueDate = addYear(startDate);
                    updatedMember = {
                        ...updatedMember,
                        membershipFeeLastPaid: getTodayYMD(),
                        membershipFeeDueDate: formatToYMD(newDueDate),
                    };
                    historyTitle = asPayment ? 'Membership Fee Paid' : 'Fee Added to Tab';
                    historyDetails = `Plan: ${plan.name}. New Due Date: ${formatDate(newDueDate)}`;
                    updatedMember = addHistoryEntry(updatedMember, historyType, historyTitle, historyDetails, paymentAmount);
                    
                } else { 
                    const currentMainDueDate = updatedMember.dueDate ? parseDate(updatedMember.dueDate) : today;
                    const startDateForNewPeriod = (currentMainDueDate && currentMainDueDate > today) ? currentMainDueDate : today;
                    
                    let newDueDate = new Date(startDateForNewPeriod);
                    let newMembershipType = updatedMember.membershipType;
                    let isRenewal = false;

                    if (planNameLower.includes('yearly')) { newDueDate = addYear(newDueDate); isRenewal = true; } 
                    else if (planNameLower.includes('6 months')) { newDueDate = addMonths(newDueDate, 6); isRenewal = true; } 
                    else if (planNameLower.includes('3 months')) { newDueDate = addMonths(newDueDate, 3); isRenewal = true; } 
                    else if (planNameLower.includes('no mf')) { newDueDate = addMonths(newDueDate, 1); newMembershipType = 'NO MF'; isRenewal = true; } 
                    else if (planNameLower.includes('monthly')) { newDueDate = addMonths(newDueDate, 1); isRenewal = true; } 
                    else if (planNameLower.includes('daily')) { newDueDate = addDays(newDueDate, 1); isRenewal = true; }

                    if (isRenewal) {
                        updatedMember = {
                            ...updatedMember,
                            status: 'Active',
                            lastPaymentDate: getTodayYMD(),
                            subscriptionStartDate: formatToYMD(startDateForNewPeriod),
                            dueDate: formatToYMD(newDueDate),
                            membershipType: newMembershipType,
                        };
                        historyTitle = asPayment ? 'Membership Renewed' : 'Renewal Added to Tab';
                        historyDetails = `Plan: ${plan.name}. New Due Date: ${formatDate(newDueDate)}`;
                        updatedMember = addHistoryEntry(updatedMember, historyType, historyTitle, historyDetails, paymentAmount);
                    }
                }
            });
    
            return updatedMember;
        }));
    };

    const renewMembership = (memberId: string, paymentDetails: { plan: string; amount: number }) => {
        const plan: PricePlan = { id: '', name: paymentDetails.plan, amount: paymentDetails.amount, type: 'member' };
        addPlansToMember(memberId, [plan], true);
    };

    const unfreezeMember = (memberId: string) => {
        setMembers(prev => prev.map(m => {
            if (m.id === memberId && m.status.toLowerCase() === 'frozen') {
                let newDueDate = new Date();
                if (m.daysRemainingOnFreeze && m.daysRemainingOnFreeze > 0) {
                    newDueDate = addDays(newDueDate, m.daysRemainingOnFreeze);
                } else {
                    newDueDate = addDays(newDueDate, 30);
                }

                const updatedMember = {
                    ...m,
                    status: 'Active',
                    dueDate: formatToYMD(newDueDate),
                    daysRemainingOnFreeze: 0,
                };
                return addHistoryEntry(updatedMember, 'status_change', 'Account Unfrozen', `New Due Date: ${formatDate(newDueDate)}`);
            }
            return m;
        }));
    };

    const markSessionComplete = useCallback((memberId: string) => {
        let message: { type: 'success' | 'error' | 'info', text: string } | null = null;
        let finalMemberState: Member | null = null;
        
        const memberIndex = members.findIndex(m => m.id === memberId);

        if (memberIndex === -1) {
            message = { type: 'error', text: "Member not found." };
        } else {
            const member = members[memberIndex];
            let memberToUpdate = { ...member };

            if (member.sessionExpiryDate && isPastOrToday(member.sessionExpiryDate)) {
                message = { type: 'info', text: `${member.name}'s sessions have expired. Please ask them to purchase a new package.` };
                if (member.status.toLowerCase() !== 'inactive') {
                    memberToUpdate.status = 'Inactive';
                    memberToUpdate.totalSessions = 0;
                    memberToUpdate.sessionsUsed = 0;
                    memberToUpdate = addHistoryEntry(memberToUpdate, 'status_change', 'Sessions Expired', `Coaching sessions expired on ${formatDate(member.sessionExpiryDate)}.`);
                    finalMemberState = memberToUpdate;
                }
            } else if (!member.hasCoach || (member.totalSessions ?? 0) <= 0) {
                message = { type: 'error', text: `${member.name} does not have an active coaching plan.` };
            } else if ((member.sessionsUsed ?? 0) >= (member.totalSessions ?? 0)) {
                message = { type: 'info', text: `${member.name} has no remaining sessions to use.` };
                if (member.status.toLowerCase() !== 'sessions') {
                    memberToUpdate.status = 'Sessions';
                    memberToUpdate = addHistoryEntry(memberToUpdate, 'status_change', 'Sessions Finished', 'No remaining sessions. Status updated.');
                    finalMemberState = memberToUpdate;
                }
            } else {
                const newSessionsUsed = (member.sessionsUsed ?? 0) + 1;
                const remaining = (member.totalSessions ?? 0) - newSessionsUsed;
                const isLastSession = newSessionsUsed >= (member.totalSessions ?? 0);
                
                const messageText = isLastSession
                    ? `${member.name} has completed all available sessions. Please ask if they would like to renew their package.`
                    : `Session marked as complete for ${member.name}. ${remaining} sessions remaining.`;
                message = { type: 'success', text: messageText };
                
                memberToUpdate.sessionsUsed = newSessionsUsed;
                memberToUpdate = addHistoryEntry(memberToUpdate, 'session_update', 'Session Marked Complete', `1 session used. ${remaining} remaining.`);
                
                if (isLastSession) {
                    memberToUpdate.status = 'Sessions';
                    memberToUpdate = addHistoryEntry(memberToUpdate, 'status_change', 'Sessions Finished', 'Completed all available coaching sessions.');
                }
                finalMemberState = memberToUpdate;
            }
        }
        
        if (finalMemberState) {
            const updatedMembers = [...members];
            updatedMembers[memberIndex] = finalMemberState;
            setMembers(updatedMembers);
        }

        if (message) {
            setSessionCompletionMessage(message);
        }
    }, [members]);

    const clearSessionCompletionMessage = useCallback(() => {
        setSessionCompletionMessage(null);
    }, []);

    const addPaymentHistoryToMember = (memberId: string, amount: number, notes: string) => {
        setMembers(prev => prev.map(m => {
            if (m.id === memberId) {
                return addHistoryEntry(m, 'payment', 'Payment Made', notes, amount);
            }
            return m;
        }));
    };

    return { members, addMember, updateMember, deleteMember, addMultipleMembers, getNextMemberId, useSession, renewMembership, addPlansToMember, unfreezeMember, markSessionComplete, addPaymentHistoryToMember, sessionCompletionMessage, clearSessionCompletionMessage };
};
