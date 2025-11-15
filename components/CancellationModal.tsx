import React, { useState } from 'react';
import { XIcon } from './icons/Icons';

interface CancellationModalProps {
    onClose: () => void;
    onSubmit: (reason: string) => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({ onClose, onSubmit }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        onSubmit(reason);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md m-4 border border-gray-700 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Reason for Cancellation</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-400 mb-1">
                        Please provide a reason for cancelling this entry.
                    </label>
                    <textarea
                        id="cancellationReason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g., Did not pay, incorrect entry..."
                        rows={4}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        autoFocus
                    />
                </div>
                <div className="flex justify-end gap-4 pt-6">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition">Cancel</button>
                    <button type="button" onClick={handleSubmit} className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition">Confirm Cancellation</button>
                </div>
            </div>
        </div>
    );
};
