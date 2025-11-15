import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CheckinRecord, Product, Member, PricePlan, Coach } from '../types';
import { formatTime, formatDate, getTodayYMD, isPastOrToday } from '../utils/dateUtils';
import { AddProductModal } from './AddProductModal';
import { PaymentModal } from './PaymentModal';
import { CheckoutWithBalanceModal } from './CheckoutWithBalanceModal';
import { MemberPlanModal } from './MemberPlanModal';
import { XIcon, HistoryIcon, WarningIcon } from './icons/Icons';

interface RecordsProps {
    checkinRecords: CheckinRecord[];
    products: Product[];
    addCheckoutRecord: (recordId: string, products: { productId: string; name: string; quantity: number; price: number }[], total: number) => void;
    members: Member[];
    priceList: PricePlan[];
    onAddPlansToTab: (memberId: string, recordId: string, plans: PricePlan[]) => void;
    addServicesToWalkinRecord: (recordId: string, plans: PricePlan[]) => void;
    confirmCheckout: (id: string, balanceDueDate?: string) => void;
    cancelPendingCheckout: (id: string) => void;
    coaches: Coach[];
    assignCoachToRecord: (recordId: string, coachName: string) => void;
    onSettleAndPay: (record: CheckinRecord, paymentAmount: number, settledPlans: PricePlan[], newBalanceDueDate?: string) => void;
    removeItemFromRecord: (recordId: string, itemId: string) => void;
}

// Modal for adding a service plan to a walk-in record.
interface WalkinPlanModalProps {
    record: CheckinRecord;
    onClose: () => void;
    onSave: (record: CheckinRecord, plans: PricePlan[]) => void;
    priceList: PricePlan[];
}

const WalkinPlanModal: React.FC<WalkinPlanModalProps> = ({ record, onClose, onSave, priceList }) => {
    const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);

    const { walkinPlans, classPlans } = useMemo(() => {
        const walkin = priceList.filter(p => p.type === 'walk-in').sort((a, b) => a.amount - b.amount);
        const classp = priceList.filter(p => p.type === 'class').sort((a, b) => a.name.localeCompare(b.name));
        return { walkinPlans: walkin, classPlans: classp };
    }, [priceList]);

    const allPlans = useMemo(() => [...walkinPlans, ...classPlans], [walkinPlans, classPlans]);

    const selectedPlans = useMemo(() => {
        return allPlans.filter(p => selectedPlanIds.includes(p.id));
    }, [allPlans, selectedPlanIds]);

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
            onSave(record, selectedPlans);
        } else {
            alert("Please select at least one plan for the walk-in client.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 border border-gray-700 animate-fade-in-up flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Add Plan to Walk-in Tab</h2>
                        <p className="text-gray-400">For: {record.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Walk-in & Day Pass</h3>
                        <div className="space-y-2">
                            {walkinPlans.map(plan => (
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
                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Classes</h3>
                        <div className="space-y-2">
                             {classPlans.map(plan => (
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
                            Add to Tab
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const getMemberAlertsForRecord = (record: CheckinRecord, member: Member | null): string[] => {
    const alerts: string[] = [];

    // 1. Check record-specific balance first for all client types
    if (record.balance > 0) {
        alerts.push(`Outstanding tab balance of ₱${record.balance.toFixed(2)}.`);
    }

    if (!member) {
        // Stop here for walk-ins
        return alerts;
    }

    const specialMfTypes = ['LIFETIME', 'FREE ANNUAL', 'NO MF'];

    // 2. Check membership dues
    if (isPastOrToday(member.dueDate)) {
        alerts.push(`Membership overdue (${formatDate(member.dueDate)})`);
    }
    if (member.membershipFeeDueDate && isPastOrToday(member.membershipFeeDueDate) && !specialMfTypes.includes(member.membershipType.toUpperCase())) {
        alerts.push(`Annual fee overdue (${formatDate(member.membershipFeeDueDate)})`);
    }
    if (member.lockerDueDate && isPastOrToday(member.lockerDueDate)) {
        alerts.push(`Locker overdue (${formatDate(member.lockerDueDate)})`);
    }

    // 3. Check coach session status
    if (member.hasCoach) {
        const remainingSessions = (member.totalSessions ?? 0) - (member.sessionsUsed ?? 0);
        if (remainingSessions <= 0 && (member.totalSessions ?? 0) > 0) {
            alerts.push('All coaching sessions have been used.');
        }
        if (member.sessionExpiryDate && isPastOrToday(member.sessionExpiryDate)) {
            alerts.push(`Coaching sessions expired on ${formatDate(member.sessionExpiryDate)}.`);
        }
    }
    
    return alerts;
};


export const Records: React.FC<RecordsProps> = ({ checkinRecords, products, addCheckoutRecord, members, priceList, onAddPlansToTab, addServicesToWalkinRecord, confirmCheckout, cancelPendingCheckout, coaches, assignCoachToRecord, onSettleAndPay, removeItemFromRecord }) => {
    const [selectedDate, setSelectedDate] = useState(getTodayYMD());
    const [addingProductTo, setAddingProductTo] = useState<CheckinRecord | null>(null);
    const [makingPaymentFor, setMakingPaymentFor] = useState<CheckinRecord | null>(null);
    const [makingPlanForRecord, setMakingPlanForRecord] = useState<CheckinRecord | null>(null);
    const [makingPlanForMember, setMakingPlanForMember] = useState<Member | null>(null);
    const [addingPlanToWalkin, setAddingPlanToWalkin] = useState<CheckinRecord | null>(null);
    const [processingCheckoutFor, setProcessingCheckoutFor] = useState<CheckinRecord | null>(null);

    const isHistoryView = selectedDate < getTodayYMD();

    const filteredRecords = useMemo(() => {
        return checkinRecords
            .filter(r => r.timestamp.startsWith(selectedDate))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [checkinRecords, selectedDate]);
    
    const { totalPaid, totalReceivables } = useMemo(() => {
        return filteredRecords.reduce((acc, record) => {
            if (record.status === 'Confirmed') {
                acc.totalPaid += record.amountPaid;
                acc.totalReceivables += record.balance > 0 ? record.balance : 0; // Only sum positive balances
            }
            return acc;
        }, { totalPaid: 0, totalReceivables: 0 });
    }, [filteredRecords]);
    
    const handleSaveProduct = (recordId: string, products: Array<{ productId: string; name: string; quantity: number; price: number }>, total: number) => {
        addCheckoutRecord(recordId, products, total);
        setAddingProductTo(null);
    };

    const handleSavePayment = useCallback((recordToUpdate: CheckinRecord, paymentAmount: number, newBalanceDueDate?: string) => {
        const settledPlans: PricePlan[] = [];
        // The logic to check which plans are settled by a payment has been removed.
        // Renewals now happen immediately when a plan is added to a tab.
        // Payments will just reduce the balance. `settledPlans` is passed as an empty array
        // to ensure products are not removed from the tab list.
        
        onSettleAndPay(recordToUpdate, paymentAmount, settledPlans, newBalanceDueDate);
        
        setMakingPaymentFor(null);
    }, [onSettleAndPay]);
    
    const handleSaveMemberPlans = useCallback((recordToUpdate: CheckinRecord, plans: PricePlan[]) => {
        if (recordToUpdate.type === 'Member' && recordToUpdate.gymNumber) {
            onAddPlansToTab(recordToUpdate.gymNumber, recordToUpdate.id, plans);
        }
        setMakingPlanForRecord(null);
        setMakingPlanForMember(null);
    }, [onAddPlansToTab]);

    const handleSaveWalkinPlan = useCallback((recordToUpdate: CheckinRecord, plans: PricePlan[]) => {
        addServicesToWalkinRecord(recordToUpdate.id, plans);
        setAddingPlanToWalkin(null);
    }, [addServicesToWalkinRecord]);
    
    const handleConfirmCheckoutWithDueDate = (recordId: string, dueDate: string) => {
        confirmCheckout(recordId, dueDate);
        setProcessingCheckoutFor(null);
    };

    const openMemberPlanModal = (record: CheckinRecord) => {
        const member = members.find(m => m.id === record.gymNumber);
        if (member) {
            setMakingPlanForMember(member);
            setMakingPlanForRecord(record);
        } else {
            alert("Could not find member details for this record.");
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Daily Records</h1>
                    <p className="text-gray-400">View check-ins and sales for a specific day.</p>
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white"
                />
            </div>

            {isHistoryView && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 flex items-center gap-4 animate-fade-in-up">
                    <HistoryIcon className="w-6 h-6 text-blue-400 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-white">Viewing Historical Records</h3>
                        <p className="text-sm text-blue-300">
                            You are viewing records for {formatDate(selectedDate)}. Actions are disabled for past dates.
                        </p>
                    </div>
                </div>
            )}
            
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="border-b border-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Client</th>
                                <th className="p-4 font-semibold">Type</th>
                                <th className="p-4 font-semibold">Time In/Out</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Coach / Class</th>
                                <th className="p-4 font-semibold">Tab Details</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(record => {
                                const member = record.gymNumber ? members.find(m => m.id === record.gymNumber) : null;
                                const alerts = getMemberAlertsForRecord(record, member);

                                return (
                                <tr key={record.id} className={`border-b border-gray-700 hover:bg-gray-700/50`}>
                                    <td className="p-4 font-medium text-white">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-3 h-3 rounded-full flex-shrink-0 ${!record.checkoutTimestamp && record.status === 'Confirmed' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}
                                                title={!record.checkoutTimestamp && record.status === 'Confirmed' ? 'In Gym' : 'Checked Out / Not In'}
                                            ></span>
                                            <span>{record.name} {record.gymNumber && `(${record.gymNumber})`}</span>
                                            {alerts.length > 0 && (
                                                <div className="relative group flex items-center">
                                                    <WarningIcon className="w-5 h-5 text-yellow-400" />
                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 hidden group-hover:block bg-gray-900 border border-yellow-600 text-white text-sm rounded-lg p-3 shadow-lg z-10">
                                                        <p className="font-bold text-yellow-300 mb-2">Action Required</p>
                                                        <ul className="list-disc list-inside space-y-1 text-yellow-200">
                                                            {alerts.map((alert, i) => <li key={i}>{alert}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-400">{record.type}</td>
                                    <td className="p-4 text-gray-400">{formatTime(record.timestamp)} / {record.checkoutTimestamp ? formatTime(record.checkoutTimestamp) : 'N/A'}</td>
                                    <td className="p-4">
                                        <div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                record.status === 'Confirmed' ? 'bg-green-500/20 text-green-400' :
                                                record.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                                            }`}>{record.status}</span>
                                            {record.pendingAction === 'checkout' && (
                                                <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">
                                                    Pending Checkout
                                                </span>
                                            )}
                                        </div>
                                        {record.status === 'Cancelled' && record.cancellationReason && (
                                            <p className="text-xs text-gray-400 mt-1 italic max-w-xs whitespace-normal">
                                                Reason: {record.cancellationReason}
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-4 text-gray-400">
                                        {record.needsCoach && record.status === 'Confirmed' && !isHistoryView ? (
                                            <select
                                                value={record.coachAssigned || ''}
                                                onChange={(e) => assignCoachToRecord(record.id, e.target.value)}
                                                className="bg-gray-700 border border-gray-600 rounded-lg py-1 px-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary w-full max-w-[180px]"
                                            >
                                                <option value="">Assign coach...</option>
                                                {coaches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        ) : (
                                            record.coachAssigned || 'N/A'
                                        )}
                                        {record.className && <div className="text-xs text-purple-400 mt-1">{record.className}</div>}
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm align-top">
                                        <ul className="space-y-1 max-w-xs">
                                            {record.paymentDetails?.plan && (
                                                <li className="flex justify-between items-center">
                                                    <span>{record.paymentDetails.plan}</span>
                                                    <span>₱{record.paymentDetails.amount.toFixed(2)}</span>
                                                </li>
                                            )}
                                            {record.productsPurchased?.map(item => (
                                                <li key={item.itemId} className="flex justify-between items-center group">
                                                    <span>{item.name} {item.quantity > 1 ? `(x${item.quantity})` : ''}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                                                        {!isHistoryView && record.status === 'Confirmed' && !record.checkoutTimestamp && record.pendingAction !== 'checkout' && (
                                                            <button 
                                                                onClick={() => {
                                                                    if(window.confirm(`Are you sure you want to remove "${item.name}" from the tab?`)) {
                                                                        removeItemFromRecord(record.id, item.itemId)
                                                                    }
                                                                }}
                                                                className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Remove item"
                                                            >
                                                                <XIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        {(record.paymentDetails || (record.productsPurchased && record.productsPurchased.length > 0)) && (
                                            <hr className="my-2 border-gray-600" />
                                        )}
                                        <div className="font-semibold space-y-1 text-right">
                                            <div>Total: <span className="text-white">₱{record.amountDue.toFixed(2)}</span></div>
                                            <div>Paid: <span className="text-green-400">₱{record.amountPaid.toFixed(2)}</span></div>
                                            <div>Balance: <span className={`font-bold ${record.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>₱{record.balance.toFixed(2)}</span></div>
                                        </div>
                                        {record.carriedOverBalance && record.carriedOverBalance > 0 && (
                                            <div className="text-xs text-yellow-400 mt-1 text-right">
                                                (Includes ₱{record.carriedOverBalance.toFixed(2)} from prev)
                                            </div>
                                        )}
                                        {record.balance > 0 && record.balanceDueDate && (
                                            <div className="text-xs text-orange-400 mt-1 text-right">Due: {formatDate(record.balanceDueDate)}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {isHistoryView ? (
                                            <span className="text-xs text-gray-500 italic">No actions available</span>
                                        ) : record.pendingAction === 'checkout' ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => cancelPendingCheckout(record.id)} className="text-sm text-gray-400 hover:underline">Cancel</button>
                                                {record.balance > 0 ? (
                                                     <button onClick={() => setProcessingCheckoutFor(record)} className="text-sm text-yellow-400 hover:underline">Process Checkout</button>
                                                ) : (
                                                     <button onClick={() => confirmCheckout(record.id)} className="text-sm text-green-400 hover:underline">Confirm</button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                {record.type === 'Walk-in' && record.status === 'Confirmed' && !record.checkoutTimestamp && (
                                                     <button onClick={() => setAddingPlanToWalkin(record)} className="text-sm text-brand-secondary hover:underline">Add Plan</button>
                                                )}
                                                {record.type === 'Member' && record.status === 'Confirmed' && (
                                                    <button onClick={() => openMemberPlanModal(record)} className="text-sm text-blue-400 hover:underline">Make Plan</button>
                                                )}
                                                {record.balance > 0 && (
                                                    <button onClick={() => setMakingPaymentFor(record)} className="text-sm text-green-400 hover:underline">Make Payment</button>
                                                )}
                                                <button onClick={() => setAddingProductTo(record)} className="text-sm text-brand-secondary hover:underline" disabled={record.status !== 'Confirmed'}>Add Product</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {filteredRecords.length === 0 && <p className="text-center p-8 text-gray-400">No records found for {formatDate(selectedDate)}.</p>}
                </div>

                <div className="p-4 bg-gray-900/50 rounded-b-xl border-t border-gray-700 flex justify-end items-center gap-8">
                    <div>
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Paid Today</p>
                        <p className="text-3xl font-bold text-green-400">₱{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Receivables</p>
                        <p className="text-3xl font-bold text-red-400">₱{totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>

            </div>

            {addingProductTo && (
                <AddProductModal 
                    record={addingProductTo}
                    products={products}
                    onClose={() => setAddingProductTo(null)}
                    onSave={handleSaveProduct}
                />
            )}
            {makingPaymentFor && (
                <PaymentModal 
                    record={makingPaymentFor}
                    onClose={() => setMakingPaymentFor(null)}
                    onSave={handleSavePayment}
                />
            )}
             {makingPlanForRecord && makingPlanForMember && (
                <MemberPlanModal
                    record={makingPlanForRecord}
                    member={makingPlanForMember}
                    priceList={priceList}
                    onClose={() => {
                        setMakingPlanForRecord(null);
                        setMakingPlanForMember(null);
                    }}
                    onSave={handleSaveMemberPlans}
                />
            )}
            {addingPlanToWalkin && (
                <WalkinPlanModal
                    record={addingPlanToWalkin}
                    onClose={() => setAddingPlanToWalkin(null)}
                    onSave={handleSaveWalkinPlan}
                    priceList={priceList}
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