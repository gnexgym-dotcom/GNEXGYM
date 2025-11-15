import React, { useState, FormEvent, useEffect } from 'react';
import { CheckinRecord } from '../types';
import { XIcon } from './icons/Icons';
import { formatToYMD } from '../utils/dateUtils';

interface PaymentModalProps {
    record: CheckinRecord;
    onClose: () => void;
    onSave: (record: CheckinRecord, paymentAmount: number, newBalanceDueDate?: string) => void;
}

const InfoItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-white' }) => (
    <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
);

export const PaymentModal: React.FC<PaymentModalProps> = ({ record, onClose, onSave }) => {
    const [paymentAmount, setPaymentAmount] = useState<number | ''>(record.balance);
    const [balanceDueDate, setBalanceDueDate] = useState(record.balanceDueDate || '');
    
    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        const amount = Number(paymentAmount);
        if (isNaN(amount) || amount <= 0 || amount > record.balance) {
            alert(`Please enter a valid payment amount between ₱0.01 and ₱${record.balance.toFixed(2)}.`);
            return;
        }
        
        const remainingBalance = record.balance - amount;
        if(remainingBalance > 0 && !balanceDueDate) {
            alert("Please set a due date for the remaining balance.");
            return;
        }

        onSave(record, amount, remainingBalance > 0 ? balanceDueDate : undefined);
    };

    const remainingBalance = record.balance - (Number(paymentAmount) || 0);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md m-4 border border-gray-700 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Add Payment</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <p className="text-lg font-semibold text-gray-300">{record.name}</p>
                        <p className="text-sm text-gray-400">{record.paymentDetails?.plan}</p>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                            <InfoItem label="Total Due" value={`₱${record.amountDue.toFixed(2)}`} />
                            <InfoItem label="Paid" value={`₱${record.amountPaid.toFixed(2)}`} color="text-green-400" />
                            <InfoItem label="Balance" value={`₱${record.balance.toFixed(2)}`} color="text-red-400" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-400 mb-1">
                            Payment Amount
                        </label>
                         <input
                            type="number"
                            id="paymentAmount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            min="0.01"
                            max={record.balance}
                            step="0.01"
                            required
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white text-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            autoFocus
                        />
                    </div>
                    
                    {remainingBalance > 0 && (
                        <div className="animate-fade-in-up">
                            <label htmlFor="balanceDueDate" className="block text-sm font-medium text-gray-400 mb-1">
                                Next Payment Due Date
                            </label>
                            <input
                                type="date"
                                id="balanceDueDate"
                                value={balanceDueDate}
                                onChange={(e) => setBalanceDueDate(e.target.value)}
                                min={formatToYMD(new Date())}
                                required
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                             <p className="text-xs text-orange-400 mt-2">
                                A due date is required as there will be a remaining balance of ₱{remainingBalance.toFixed(2)}.
                            </p>
                        </div>
                    )}
                    

                    <div className="flex justify-end gap-4 pt-6">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition">Cancel</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition">Record Payment</button>
                    </div>
                </form>
            </div>
        </div>
    );
};