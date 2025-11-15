import React from 'react';
import { TicketIcon } from './icons/Icons';
import { formatDate } from '../utils/dateUtils';

interface FreePassManagementProps {
    freePass: { date: string; code: string } | null;
    generateNewCode: () => void;
}

export const FreePassManagement: React.FC<FreePassManagementProps> = ({ freePass, generateNewCode }) => {
    
    const handleGenerate = () => {
        if (!freePass || window.confirm('Are you sure you want to generate a new code? The old code for today will be invalid.')) {
            generateNewCode();
        }
    }

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                <h1 className="text-2xl font-bold text-white">Daily Free Pass Management</h1>
                <p className="text-gray-400">Generate a unique code for today's free pass clients.</p>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700 text-center max-w-md mx-auto">
                <TicketIcon className="w-20 h-20 text-brand-secondary mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Today's Free Pass Code</h2>
                <p className="text-gray-400 mb-6">Date: {formatDate(new Date())}</p>
                
                {freePass ? (
                    <div className="bg-gray-900/50 p-6 rounded-lg border border-dashed border-gray-600">
                        <p className="text-5xl font-mono font-bold text-brand-primary tracking-widest">{freePass.code}</p>
                    </div>
                ) : (
                     <div className="bg-gray-900/50 p-6 rounded-lg border border-dashed border-gray-600">
                        <p className="text-2xl font-bold text-gray-500">No code generated yet.</p>
                    </div>
                )}
                
                <button 
                    onClick={handleGenerate}
                    className="mt-8 w-full bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-3 px-6 rounded-xl transition-all duration-300 text-lg shadow-lg"
                >
                    {freePass ? 'Generate New Code' : 'Generate Code for Today'}
                </button>
            </div>
        </div>
    );
};