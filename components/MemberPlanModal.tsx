import React, { useState, useMemo } from 'react';
import { CheckinRecord, PricePlan, Member } from '../types';
import { XIcon, WarningIcon } from './icons/Icons';
import { isPastOrToday, formatDate } from '../utils/dateUtils';


interface MemberPlanModalProps {
    record: CheckinRecord;
    member: Member;
    onClose: () => void;
    onSave: (record: CheckinRecord, plans: PricePlan[]) => void;
    priceList: PricePlan[];
}

export const MemberPlanModal: React.FC<MemberPlanModalProps> = ({ record, member, onClose, onSave, priceList }) => {
    
    const duePlans = useMemo(() => {
        const dues: PricePlan[] = [];
        const specialMfTypes = ['LIFETIME', 'FREE ANNUAL', 'NO MF'];

        if (member.lockerDueDate && isPastOrToday(member.lockerDueDate)) {
            const lockerPlan = priceList.find(p => p.name.toLowerCase().includes('locker rental'));
            if (lockerPlan) dues.push(lockerPlan);
        }

        if (member.membershipFeeDueDate && isPastOrToday(member.membershipFeeDueDate) && !specialMfTypes.includes(member.membershipType.toUpperCase())) {
             const mfPlan = priceList.find(p => p.name.toLowerCase().includes('membership fee'));
            if (mfPlan) dues.push(mfPlan);
        }
        
        return dues;
    }, [member, priceList]);

    const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>(() => duePlans.map(p => p.id));

    const { memberPlans, servicePlans } = useMemo(() => {
        const members = priceList.filter(p => p.type === 'member').sort((a,b) => a.amount - b.amount);
        const services = priceList.filter(p => p.type === 'coach').sort((a,b) => a.name.localeCompare(b.name));
        return { memberPlans: members, servicePlans: services };
    }, [priceList]);
    
    const allPlans = useMemo(() => [...memberPlans, ...servicePlans], [memberPlans, servicePlans]);
    
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
            alert("Please select at least one item.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 border border-gray-700 animate-fade-in-up flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Make a Plan</h2>
                        <p className="text-gray-400">For: {record.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
                     {duePlans.length > 0 && (
                        <div className="bg-red-900/30 p-4 rounded-lg border border-red-700">
                             <h3 className="text-lg font-bold text-red-300 mb-2 flex items-center">
                                <WarningIcon className="w-5 h-5 mr-2"/> Outstanding Dues
                            </h3>
                            <p className="text-sm text-red-200 mb-3">The following items are overdue and have been pre-selected for payment.</p>
                            <ul className="space-y-1">
                                {duePlans.map(plan => (
                                     <li key={plan.id} className="flex justify-between text-white">
                                        <span>{plan.name}</span>
                                        <span className="font-semibold">₱{plan.amount}</span>
                                     </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {isPastOrToday(member.dueDate) && (
                         <div className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-700">
                             <h3 className="text-lg font-bold text-yellow-300 mb-2 flex items-center">
                                <WarningIcon className="w-5 h-5 mr-2"/> Membership Renewal Needed
                            </h3>
                            <p className="text-sm text-yellow-200">This member's subscription expired on {formatDate(member.dueDate)}. Please select a renewal plan below.</p>
                        </div>
                    )}
                    
                     <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Membership Renewals</h3>
                        <div className="space-y-2">
                            {memberPlans.map(plan => (
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
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Services & Coaching</h3>
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
                            <h3 className="text-xl font-bold text-white mb-2">Total to Add</h3>
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