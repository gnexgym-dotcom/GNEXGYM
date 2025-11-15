import React, { useState } from 'react';
import { CheckinRecord } from '../types';
import { XIcon, CashIcon } from './icons/Icons';
import { getTodayYMD } from '../utils/dateUtils';

interface CheckoutWithBalanceModalProps {
    record: CheckinRecord;
    onClose: () => void;
    onConfirmCheckout: (recordId: string, balanceDueDate: string) => void;
    onMakePayment: (record: CheckinRecord) => void;
}

export const CheckoutWithBalanceModal: React.FC<CheckoutWithBalanceModalProps> = ({ record, onClose, onConfirmCheckout, onMakePayment }) => {
    const [balanceDueDate, setBalanceDueDate] = useState('');

    const handleConfirm = () => {
        if (!balanceDueDate) {
            alert('Please select a future date for the payment.');
            return;
        }
        onConfirmCheckout(record.id, balanceDueDate);
    };

    const handleMakePaymentClick = () => {
        onMakePayment(record);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 border border-gray-700 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Process Checkout</h2>
                        <p className="text-gray-400">For: {record.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="bg-red-900/50 border-l-4 border-red-500 text-red-300 p-4 rounded-r-lg mb-6" role="alert">
                    <p className="font-bold text-red-200">Outstanding Balance</p>
                    <p>This client has a remaining balance of <span className="font-extrabold text-white">₱{record.balance.toFixed(2)}</span>.</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg text-white mb-3">Option 1: Settle Later</h3>
                        <p className="text-sm text-gray-400 mb-3">Set a future date for the client to settle their balance. The checkout will be confirmed immediately.</p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                             <div className="flex-grow">
                                <label htmlFor="balanceDueDate" className="sr-only">Balance Due Date</label>
                                <input
                                    type="date"
                                    id="balanceDueDate"
                                    value={balanceDueDate}
                                    onChange={(e) => setBalanceDueDate(e.target.value)}
                                    min={getTodayYMD()}
                                    className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>
                            <button 
                                onClick={handleConfirm} 
                                disabled={!balanceDueDate}
                                className="py-2.5 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                Confirm Checkout & Set Due Date
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative flex items-center">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-500">OR</span>
                        <div className="flex-grow border-t border-gray-600"></div>
                    </div>
                    
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg text-white mb-3">Option 2: Settle Now</h3>
                        <p className="text-sm text-gray-400 mb-3">Open the payment modal to record a full or partial payment before checkout.</p>
                        <button 
                            onClick={handleMakePaymentClick} 
                            className="w-full py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition flex items-center justify-center"
                        >
                            <CashIcon className="w-5 h-5 mr-2" />
                            Make a Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};