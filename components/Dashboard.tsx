import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Member, CheckinRecord, Coach, PricePlan, WalkinClient, Class } from '../types';
import { MembersIcon, CheckCircleIcon, XCircleIcon, RecordsIcon, ClipboardUserIcon, SearchIcon, UserIcon, XIcon, CheckinIcon, ClipboardIcon, HistoryIcon, WarningIcon, PlusIcon, UploadIcon, CashIcon } from './icons/Icons';
import { MemberForm } from './MemberForm';
import { CancellationModal } from './CancellationModal';
import { MemberHistoryModal } from './MemberHistoryModal';
import { PaymentModal } from './PaymentModal';
import { CheckoutWithBalanceModal } from './CheckoutWithBalanceModal';
import { formatDate, isPastOrToday, getTodayYMD, parseDate } from '../utils/dateUtils';

interface DashboardProps {
    members: Member[];
    checkinRecords: CheckinRecord[];
    onSaveMember: (memberData: Member | Omit<Member, 'id' | 'membershipStartDate' | 'lastPaymentDate' | 'dueDate'>, purchasedPlans?: PricePlan[], newSubscriptionStartDate?: string) => void;
    coaches: Coach[];
    priceList: PricePlan[];
    classes: Class[];
    confirmPendingRecord: (id: string, updates?: Partial<Omit<CheckinRecord, 'id'>>) => void;
    cancelPendingRecord: (id: string, reason: string) => void;
    unfreezeMember: (memberId: string) => void;
    useSession: (memberId: string) => boolean;
    walkinClients: WalkinClient[];
    onAddServicePaymentToPendingMember: (memberId: string, plan: PricePlan) => void;
    confirmCheckout: (id: string, balanceDueDate?: string) => void;
    cancelPendingCheckout: (id: string) => void;
    addPaymentToRecord: (recordId: string, paymentAmount: number, newBalanceDueDate?: string) => void;
    addPaymentHistoryToMember: (memberId: string, amount: number, notes: string) => void;
    addPaymentHistoryToWalkinClient: (clientId: string, amount: number, notes: string) => void;
}

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, colorClass }) => (
    <div className="bg-gray-800 p-6 rounded-xl flex items-center shadow-lg border border-gray-700">
        <div className={`p-3 rounded-full mr-4 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

// This modal is defined here because it's only used within the Dashboard context.
interface AddPaymentModalProps {
    member: Member;
    onClose: () => void;
    onSave: (plans: PricePlan[]) => void;
    priceList: PricePlan[];
    title?: string;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ member, onClose, onSave, priceList, title }) => {
    const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);

    const servicePlans = useMemo(() => {
        return priceList.filter(p => p.type === 'coach' || p.name.toLowerCase().includes('locker') || p.type === 'member');
    }, [priceList]);

    const selectedPlans = useMemo(() => {
        return servicePlans.filter(p => selectedPlanIds.includes(p.id));
    }, [servicePlans, selectedPlanIds]);

    const totalAmount = useMemo(() => {
        return selectedPlans.reduce((sum, plan) => sum + plan.amount, 0);
    }, [selectedPlans]);

    const handleTogglePlan = (planId: string) => {
        setSelectedPlanIds(prev =>
            prev.includes(planId)
                ? prev.filter(id => id !== planId)
                : [...prev, planId]
        );
    };

    const handleSubmit = () => {
        if (selectedPlans.length > 0) {
            onSave(selectedPlans);
            onClose();
        } else {
            alert("Please select at least one plan.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 border border-gray-700 animate-fade-in-up flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{title || 'Add Payment/Service'}</h2>
                        <p className="text-gray-400">For: {member.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Available Services & Plans</h3>
                        <div className="space-y-2">
                            {servicePlans.map(plan => (
                                <label key={plan.id} className="flex items-center p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedPlanIds.includes(plan.id)}
                                        onChange={() => handleTogglePlan(plan.id)}
                                        className="h-5 w-5 rounded border-gray-500 bg-gray-800 text-brand-primary focus:ring-brand-primary"
                                    />
                                    <span className="ml-3 text-white flex-grow">{plan.name}</span>
                                    <span className="font-semibold text-gray-300">₱{plan.amount}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="pt-4 flex-shrink-0">
                    {selectedPlans.length > 0 && (
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                            <h3 className="text-xl font-bold text-white mb-2">Total Due</h3>
                            <p className="text-4xl font-extrabold text-brand-primary">
                                ₱{totalAmount.toFixed(2)}
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end gap-4 pt-6">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition">Cancel</button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={selectedPlans.length === 0}
                            className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed">
                            Process Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const statusColorMap: Record<string, string> = {
    'active': 'bg-green-500/20 text-green-400 border-green-500',
    'inactive': 'bg-gray-500/20 text-gray-400 border-gray-500',
    'frozen': 'bg-blue-500/20 text-blue-400 border-blue-500',
    'due': 'bg-red-500/20 text-red-400 border-red-500',
    'sessions': 'bg-orange-500/20 text-orange-400 border-orange-500',
};
const defaultStatusColor = 'bg-purple-500/20 text-purple-400 border-purple-500';

const getMemberAlerts = (member: Member, checkinRecords: CheckinRecord[]): string[] => {
    const alerts: string[] = [];
    const specialMfTypes = ['LIFETIME', 'FREE ANNUAL', 'NO MF'];

    if (member.status.toLowerCase() === 'due' || isPastOrToday(member.dueDate)) {
        alerts.push(`Membership is overdue. Due date was ${formatDate(member.dueDate)}.`);
    }

    const memberBalance = checkinRecords
        .filter(r => r.gymNumber === member.id && r.status === 'Confirmed' && !r.checkoutTimestamp && r.balance > 0)
        .reduce((sum, record) => sum + record.balance, 0);

    if (memberBalance > 0) {
        alerts.push(`Outstanding balance of ₱${memberBalance.toFixed(2)}.`);
    }

    if (member.membershipFeeDueDate && isPastOrToday(member.membershipFeeDueDate) && !specialMfTypes.includes(member.membershipType.toUpperCase())) {
        alerts.push(`Membership Fee is overdue. Due date was ${formatDate(member.membershipFeeDueDate)}.`);
    }

    if (member.lockerDueDate && isPastOrToday(member.lockerDueDate)) {
        alerts.push(`Locker rental is overdue. Due date was ${formatDate(member.lockerDueDate)}.`);
    }

    if (member.hasCoach) {
        const remainingSessions = (member.totalSessions ?? 0) - (member.sessionsUsed ?? 0);
        if (remainingSessions <= 0 && (member.totalSessions ?? 0) > 0) {
            alerts.push('All coaching sessions have been used. Please renew the coaching plan.');
        }
        if (member.sessionExpiryDate && isPastOrToday(member.sessionExpiryDate)) {
            alerts.push(`Coaching sessions expired on ${formatDate(member.sessionExpiryDate)}.`);
        }
    }
    
    if (member.details?.trim()) {
        alerts.push('Member has notes. See details below.');
    }

    return alerts;
};

/**
 * Calculates a member's status dynamically based on their data.
 * This provides a more accurate, real-time status than the stored `member.status` property.
 * Priority: Inactive/Frozen > Due > Sessions Finished > Active.
 */
const getDynamicMemberStatus = (member: Member): { key: string; label: string } => {
    const specialMfTypes = ['LIFETIME', 'FREE ANNUAL', 'NO MF'];
    const lowerCaseStatus = member.status.toLowerCase();

    // If manually set to inactive or frozen, that takes precedence.
    if (lowerCaseStatus === 'inactive' || lowerCaseStatus === 'frozen') {
        return { key: lowerCaseStatus, label: member.status };
    }

    // Check if membership has been lapsed for over a year
    const dueDate = parseDate(member.dueDate);
    if (dueDate) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (dueDate < oneYearAgo) {
            return { key: 'inactive', label: 'Inactive' };
        }
    }

    // Check for payment issues. This is the highest priority for active members.
    if (isPastOrToday(member.dueDate) || (member.membershipFeeDueDate && isPastOrToday(member.membershipFeeDueDate) && !specialMfTypes.includes(member.membershipType.toUpperCase())) || (member.lockerDueDate && isPastOrToday(member.lockerDueDate))) {
        return { key: 'due', label: 'Due' };
    }

    // Check for session issues.
    if (member.hasCoach) {
        const remainingSessions = (member.totalSessions ?? 0) - (member.sessionsUsed ?? 0);
        const sessionsExpired = member.sessionExpiryDate && isPastOrToday(member.sessionExpiryDate);
        if ((remainingSessions <= 0 && (member.totalSessions ?? 0) > 0) || sessionsExpired) {
            return { key: 'sessions', label: 'Sessions Finished' };
        }
    }

    // If no issues are found, they are considered active.
    return { key: 'active', label: 'Active' };
};


const InfoItem: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-white">{value || 'N/A'}</p>
    </div>
);

const AlertBlock: React.FC<{ messages: string[] }> = ({ messages }) => {
    if (messages.length === 0) return null;
    return (
        <div className="bg-red-900/50 border-l-4 border-red-500 text-red-300 p-4 rounded-r-lg mb-6 col-span-1 md:col-span-3" role="alert">
            <p className="font-bold text-red-200 flex items-center"><WarningIcon className="w-5 h-5 mr-2"/>Attention Required</p>
            <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                {messages.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
        </div>
    );
};


const MemberCard: React.FC<{ member: Member; checkinRecords: CheckinRecord[]; onEdit: (member: Member) => void; onClose: () => void; onViewHistory: (member: Member) => void; hasActiveCheckin: boolean; }> = ({ member, checkinRecords, onEdit, onClose, onViewHistory, hasActiveCheckin }) => {
    const { key: dynamicStatusKey, label: dynamicStatusLabel } = getDynamicMemberStatus(member);
    const statusColor = statusColorMap[dynamicStatusKey] || defaultStatusColor;
    const alerts = getMemberAlerts(member, checkinRecords);
    
    const memberBalance = useMemo(() => {
        return checkinRecords
            .filter(r => r.gymNumber === member.id && r.status === 'Confirmed' && !r.checkoutTimestamp && r.balance > 0)
            .reduce((sum, record) => sum + record.balance, 0);
    }, [checkinRecords, member.id]);
    
    return (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 mt-6 w-full max-w-4xl mx-auto animate-fade-in-up">
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {alerts.length > 0 && <AlertBlock messages={alerts} />}

                {/* Photo and Basic Info */}
                <div className="md:col-span-1 flex flex-col items-center text-center">
                    <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mb-4 border-2 border-gray-600">
                        {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <UserIcon className="w-16 h-16 text-gray-500" />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{member.name}</h2>
                    <p className="text-gray-400 font-mono">{member.id}</p>
                    <span className={`mt-3 px-3 py-1.5 rounded-full text-sm font-bold ${statusColor.split(' ')[0]} ${statusColor.split(' ')[1]}`}>
                        {dynamicStatusLabel}
                    </span>
                    {member.className && (
                        <span className="mt-2 px-3 py-1.5 rounded-full text-sm font-bold bg-purple-500/20 text-purple-400">
                            {member.className}
                        </span>
                    )}
                </div>

                {/* Detailed Info */}
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-brand-primary mb-3 border-b border-gray-700 pb-2">Membership Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoItem label="Membership Type" value={member.membershipType} />
                            <InfoItem label="Joining Date" value={formatDate(member.membershipStartDate)} />
                            <InfoItem label="Subscription Start Date" value={formatDate(member.subscriptionStartDate)} />
                            <InfoItem label="Due Date" value={
                                <span className={isPastOrToday(member.dueDate) ? 'text-red-400' : 'text-white'}>
                                    {formatDate(member.dueDate)}
                                </span>
                            } />
                            <InfoItem label="Membership Fee Last Paid" value={formatDate(member.membershipFeeLastPaid)} />
                            <InfoItem label="Membership Fee Due Date" value={
                                 <span className={member.membershipFeeDueDate && isPastOrToday(member.membershipFeeDueDate) ? 'text-red-400' : 'text-green-400'}>
                                    {formatDate(member.membershipFeeDueDate)}
                                </span>
                            }/>
                            <InfoItem label="Outstanding Balance" value={
                                <span className={memberBalance > 0 ? 'text-red-400 font-bold' : 'text-white'}>
                                    ₱{memberBalance.toFixed(2)}
                                </span>
                            } />
                        </div>
                        {member.details && (
                            <div className="mt-4">
                                <p className="text-sm text-gray-400">Member Notes</p>
                                <p className="text-md text-gray-300 bg-gray-700/50 p-3 rounded-md whitespace-pre-wrap">{member.details}</p>
                            </div>
                        )}
                    </div>

                    {member.lockerStartDate && (
                        <div>
                            <h3 className="text-lg font-semibold text-teal-400 mb-3 border-b border-gray-700 pb-2">Locker Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoItem label="Locker Start Date" value={formatDate(member.lockerStartDate)} />
                                <InfoItem label="Locker Due Date" value={
                                    <span className={member.lockerDueDate && isPastOrToday(member.lockerDueDate) ? 'text-red-400' : 'text-green-400'}>
                                        {formatDate(member.lockerDueDate)}
                                    </span>
                                } />
                            </div>
                        </div>
                     )}

                    {member.hasCoach && (
                        <div>
                            <h3 className="text-lg font-semibold text-brand-secondary mb-3 border-b border-gray-700 pb-2">Coach Details</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <InfoItem label="Assigned Coach" value={member.coachName} />
                                <InfoItem label="Training Program" value={member.trainingType} />
                            </div>

                            <div className="bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="text-md font-semibold text-gray-300 mb-3 text-center">Session Status</h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <InfoItem label="Used" value={<span className="text-2xl font-bold">{member.sessionsUsed ?? 0}</span>} />
                                    <InfoItem label="Total" value={<span className="text-2xl font-bold">{member.totalSessions ?? 0}</span>} />
                                    <InfoItem
                                        label="Remaining"
                                        value={
                                            <span className={`text-2xl font-extrabold ${
                                                ((member.totalSessions ?? 0) - (member.sessionsUsed ?? 0)) <= 3 && ((member.totalSessions ?? 0) - (member.sessionsUsed ?? 0)) > 0
                                                    ? 'text-orange-400'
                                                    : ((member.totalSessions ?? 0) - (member.sessionsUsed ?? 0)) <= 0
                                                    ? 'text-red-400'
                                                    : 'text-white'
                                            }`}>
                                                {(member.totalSessions ?? 0) - (member.sessionsUsed ?? 0)}
                                            </span>
                                        }
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-4">
                               <InfoItem label="Session Expiry" value={
                                    <span className={member.sessionExpiryDate && isPastOrToday(member.sessionExpiryDate) ? 'text-red-400' : 'text-white'}>
                                        {formatDate(member.sessionExpiryDate)}
                                    </span>
                                } />
                            </div>
                        </div>
                    )}
                </div>
            </div>
             <div className="p-4 bg-gray-700/50 flex justify-end gap-4 rounded-b-xl border-t border-gray-700">
                <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition flex items-center">
                    <XIcon className="w-4 h-4 mr-2"/>
                    Close
                </button>
                <button onClick={() => onViewHistory(member)} className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center">
                    <HistoryIcon className="w-4 h-4 mr-2"/>
                    History
                </button>
                <button onClick={() => onEdit(member)} className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition">
                    Edit Member
                </button>
            </div>
        </div>
    );
};


export const Dashboard: React.FC<DashboardProps> = ({ members, checkinRecords, onSaveMember, coaches, priceList, classes, confirmPendingRecord, cancelPendingRecord, unfreezeMember, useSession, walkinClients, onAddServicePaymentToPendingMember, confirmCheckout, cancelPendingCheckout, addPaymentToRecord, addPaymentHistoryToMember, addPaymentHistoryToWalkinClient }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingMember, setViewingMember] = useState<Member | null>(null);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [cancellingRecord, setCancellingRecord] = useState<CheckinRecord | null>(null);
    const [viewingHistoryMember, setViewingHistoryMember] = useState<Member | null>(null);
    const [addingServiceToPending, setAddingServiceToPending] = useState<CheckinRecord | null>(null);
    const [makingPaymentFor, setMakingPaymentFor] = useState<CheckinRecord | null>(null);
    const [processingCheckoutFor, setProcessingCheckoutFor] = useState<CheckinRecord | null>(null);

    const searchResult = useMemo(() => {
        if (!searchTerm.trim()) {
            return null;
        }
        const lowerCaseSearch = searchTerm.toLowerCase().trim();
        return members.find(member =>
            member.name.toLowerCase().includes(lowerCaseSearch) ||
            member.id.toLowerCase().includes(lowerCaseSearch)
        );
    }, [members, searchTerm]);

    useEffect(() => {
        setViewingMember(searchResult);
        if(searchResult) {
            setEditingMember(null); // Close edit form if a new search is performed
        }
    }, [searchResult]);

    const pendingRequests = useMemo(() => {
        return checkinRecords
            .filter(r => r.status === 'Pending' || (r.status === 'Confirmed' && r.pendingAction === 'checkout'))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [checkinRecords]);
    
    const activeCheckinForViewingMember = useMemo(() => {
        if (!viewingMember) return null;
        return checkinRecords.find(r => r.gymNumber === viewingMember.id && r.status === 'Confirmed' && !r.checkoutTimestamp);
    }, [viewingMember, checkinRecords]);

    const handleConfirm = (record: CheckinRecord) => {
        if (record.gymNumber && record.pendingAction === 'unfreeze') {
            unfreezeMember(record.gymNumber);
        }
        // FIX: The `useSession` call was removed from here. This was the root cause of the "double-counting"
        // of sessions. A session should ONLY be consumed when a coach clicks "Session Done" in their log.
        // Confirming a check-in now only marks the member as present.
        confirmPendingRecord(record.id);
    };

    const submitCancellation = (reason: string) => {
        if (cancellingRecord) {
            cancelPendingRecord(cancellingRecord.id, reason || "No reason provided");
        }
        setCancellingRecord(null);
    };

    const getPendingActionText = (record: CheckinRecord) => {
        switch(record.pendingAction) {
            case 'payment':
                if (record.type === 'Member') return 'Renewal Required';
                if (record.type === 'Walk-in') return 'Walk-in: Needs Plan Selection';
                return 'Payment Required';
            case 'unfreeze':
                return 'Request to Unfreeze Account';
            case 'check-in':
                return 'Standard Member Check-in';
            case 'checkout':
                if (record.balance > 0) {
                    return `Pending Checkout - Balance Due: ₱${record.balance.toFixed(2)}`;
                }
                return 'Pending Checkout Request';
            default:
                return 'Pending Request';
        }
    };
    
    const handleSavePendingServicePayment = (plans: PricePlan[]) => {
        if (!addingServiceToPending || !addingServiceToPending.gymNumber) {
            alert("Error processing payment: Could not find the associated member.");
            setAddingServiceToPending(null);
            return;
        }
        const memberId = addingServiceToPending.gymNumber;
        
        let planNames: string[] = [];
        plans.forEach(plan => {
            onAddServicePaymentToPendingMember(memberId, plan);
            planNames.push(plan.name);
        });
        
        alert(`Successfully processed payment for ${planNames.join(', ')} for ${addingServiceToPending.name}.`);
        setAddingServiceToPending(null);
    };
    
    const memberForPendingService = useMemo(() => {
        if (!addingServiceToPending || !addingServiceToPending.gymNumber) return null;
        return members.find(m => m.id === addingServiceToPending.gymNumber);
    }, [addingServiceToPending, members]);
    
    const handleSaveDashboardPayment = useCallback((recordToUpdate: CheckinRecord, paymentAmount: number, newBalanceDueDate?: string) => {
        addPaymentToRecord(recordToUpdate.id, paymentAmount, newBalanceDueDate);
        if (recordToUpdate.gymNumber) {
            addPaymentHistoryToMember(
                recordToUpdate.gymNumber,
                paymentAmount,
                'Balance payment for outstanding daily tab.'
            );
        } else if (recordToUpdate.walkinClientId) {
            addPaymentHistoryToWalkinClient(
                recordToUpdate.walkinClientId,
                paymentAmount,
                'Balance payment for outstanding daily tab.'
            );
        }
        setMakingPaymentFor(null);
    }, [addPaymentToRecord, addPaymentHistoryToMember, addPaymentHistoryToWalkinClient]);

    const handleConfirmCheckoutWithDueDate = (recordId: string, dueDate: string) => {
        confirmCheckout(recordId, dueDate);
        setProcessingCheckoutFor(null);
    };


    const { stats } = useMemo(() => {
        const todayStr = getTodayYMD();

        const totalMembers = members.length;
        const activeMembers = members.filter(m => getDynamicMemberStatus(m).key === 'active').length;
        const dueMembers = members.filter(m => getDynamicMemberStatus(m).key === 'due').length;
        const membersWithCoach = members.filter(m => m.hasCoach).length;
        
        const todaysConfirmedCheckins = checkinRecords
            .filter(r => r.timestamp.startsWith(todayStr) && r.status === 'Confirmed');
        
        const clientsInGym = todaysConfirmedCheckins.filter(r => !r.checkoutTimestamp).length;

        const totalTodaysCheckins = todaysConfirmedCheckins.filter(r => {
            const planName = r.paymentDetails?.plan || '';
            // Exclude records that are purely for logging financial transactions
            return !planName.startsWith('Online Payment:') && 
                   !planName.startsWith('Renewal:') &&
                   !planName.startsWith('Used Session (Manual):');
        }).length;

        const stats = [
            { title: 'Clients in Gym', value: clientsInGym, icon: <CheckinIcon className="w-6 h-6 text-white" />, colorClass: 'bg-brand-primary' },
            { title: "Today's Check-ins", value: totalTodaysCheckins, icon: <RecordsIcon className="w-6 h-6 text-white" />, colorClass: 'bg-brand-secondary' },
            { title: 'Total Members', value: totalMembers, icon: <MembersIcon className="w-6 h-6 text-white" />, colorClass: 'bg-blue-500' },
            { title: 'Active Members', value: activeMembers, icon: <CheckCircleIcon className="w-6 h-6 text-white" />, colorClass: 'bg-green-500' },
            { title: 'Due Memberships', value: dueMembers, icon: <XCircleIcon className="w-6 h-6 text-white" />, colorClass: 'bg-red-500' },
            { title: 'Members with Coach', value: membersWithCoach, icon: <ClipboardUserIcon className="w-6 h-6 text-white" />, colorClass: 'bg-purple-500' },
        ];

        return { stats };
    }, [members, checkinRecords]);

    return (
        <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {stats.map(stat => <StatCard key={stat.title} {...stat} />)}
            </div>

            {/* Search and Member Display */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-white">Member Lookup</h2>
                <div className="relative w-full max-w-2xl mx-auto">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name or Gym Number (e.g., G-1001)..."
                        className="w-full bg-gray-700 border-2 border-gray-600 rounded-xl py-4 pl-14 pr-4 text-white text-lg focus:outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-300 shadow-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button onClick={() => setSearchTerm('')} className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-opacity ${searchTerm ? 'opacity-100' : 'opacity-0'}`}>
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>
                {viewingMember && (
                    <MemberCard 
                        member={viewingMember} 
                        checkinRecords={checkinRecords}
                        onEdit={(member) => setEditingMember(member)}
                        onClose={() => setSearchTerm('')}
                        onViewHistory={(member) => setViewingHistoryMember(member)}
                        hasActiveCheckin={!!activeCheckinForViewingMember}
                    />
                )}
                 {!viewingMember && searchTerm.trim() && (
                    <div className="mt-8 text-center bg-gray-800/50 p-12 rounded-xl border border-dashed border-gray-700 max-w-md mx-auto">
                        <h3 className="text-xl font-bold text-white">No Member Found</h3>
                        <p className="text-gray-400 mt-2">Could not find a member matching your search query.</p>
                    </div>
                )}
            </div>
            
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl shadow-lg">
                    <div className="p-4 md:p-6 border-b border-yellow-700">
                        <h2 className="text-xl font-bold text-yellow-300">Pending Requests</h2>
                    </div>
                    <div className="divide-y divide-yellow-700/50">
                        {pendingRequests.map(record => (
                            <div key={record.id} className="p-4 flex flex-wrap justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-gray-600">
                                        {record.photoUrl ? (
                                            <img src={record.photoUrl} alt={record.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-6 h-6 text-gray-500" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{record.name} {record.gymNumber && `(${record.gymNumber})`}</p>
                                        <p className="text-sm text-yellow-300">{getPendingActionText(record)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {record.pendingAction === 'checkout' ? (
                                        <>
                                            <button onClick={() => cancelPendingCheckout(record.id)} className="py-2 px-3 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition text-sm">Cancel</button>
                                            {record.balance > 0 ? (
                                                <button onClick={() => setProcessingCheckoutFor(record)} className="py-2 px-3 rounded-md bg-yellow-600 hover:bg-yellow-500 text-white font-semibold transition text-sm">Process Checkout</button>
                                            ) : (
                                                <button onClick={() => confirmCheckout(record.id)} className="py-2 px-3 rounded-md bg-green-600 hover:bg-green-500 text-white font-semibold transition text-sm">Confirm Checkout</button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => setCancellingRecord(record)} className="py-2 px-3 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition text-sm">Cancel</button>
                                            <button onClick={() => handleConfirm(record)} className="py-2 px-3 rounded-md bg-green-600 hover:bg-green-500 text-white font-semibold transition text-sm">Confirm</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Modals */}
            {editingMember && (
                <MemberForm 
                    member={editingMember} 
                    onClose={() => setEditingMember(null)}
                    onSaveMember={(data, plans, newStartDate) => {
                        onSaveMember(data, plans, newStartDate);
                        setEditingMember(null);
                        // Refresh viewing member data
                        if (viewingMember && 'id' in data && viewingMember.id === data.id) {
                            setViewingMember(data as Member);
                        }
                    }}
                    coaches={coaches}
                    priceList={priceList}
                    classes={classes}
                />
            )}
            {cancellingRecord && (
                <CancellationModal 
                    onClose={() => setCancellingRecord(null)}
                    onSubmit={submitCancellation}
                />
            )}
            {viewingHistoryMember && (
                <MemberHistoryModal
                    member={viewingHistoryMember}
                    onClose={() => setViewingHistoryMember(null)}
                />
            )}
            {addingServiceToPending && memberForPendingService && (
                <AddPaymentModal
                    member={memberForPendingService}
                    onClose={() => setAddingServiceToPending(null)}
                    onSave={handleSavePendingServicePayment}
                    priceList={priceList}
                    title="Add Service to Pending Check-in"
                />
            )}
            {makingPaymentFor && (
                <PaymentModal
                    record={makingPaymentFor}
                    onClose={() => setMakingPaymentFor(null)}
                    onSave={handleSaveDashboardPayment}
                />
            )}
            {processingCheckoutFor && (
                <CheckoutWithBalanceModal
                    record={processingCheckoutFor}
                    onClose={() => setProcessingCheckoutFor(null)}
                    onConfirmCheckout={handleConfirmCheckoutWithDueDate}
                    onMakePayment={(record) => {
                        setMakingPaymentFor(record);
                        setProcessingCheckoutFor(null);
                    }}
                />
            )}
        </div>
    );
};