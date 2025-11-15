
import React, { useState, FormEvent, useEffect } from 'react';
import { PricePlan } from '../types';

interface PriceFormProps {
    plan: PricePlan | null;
    onClose: () => void;
    addPlan: (plan: Omit<PricePlan, 'id'>) => void;
    updatePlan: (plan: PricePlan) => void;
}

export const PriceForm: React.FC<PriceFormProps> = ({ plan, onClose, addPlan, updatePlan }) => {
    // FIX: Add 'class' to the type definition to match the PricePlan type.
    const [formData, setFormData] = useState({ name: '', amount: 0, type: 'member' as 'member' | 'walk-in' | 'coach' | 'class' });

    useEffect(() => {
        if (plan) {
            setFormData({ name: plan.name, amount: plan.amount, type: plan.type });
        } else {
            // FIX: Add 'class' to the type definition to match the PricePlan type.
            setFormData({ name: '', amount: 0, type: 'member' as 'member' | 'walk-in' | 'coach' | 'class' });
        }
    }, [plan]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name === 'amount') {
             setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value as any }));
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || formData.amount <= 0) {
            alert("Please provide a valid name and a positive price.");
            return;
        }

        if (plan) {
            updatePlan({ ...plan, ...formData });
        } else {
            addPlan(formData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 border border-gray-700 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-white">{plan ? 'Edit Price Plan' : 'Add New Price Plan'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Plan Name</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">Amount (₱)</label>
                        <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} required min="0" step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>
                     <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-400 mb-1">Plan Type</label>
                        <select id="type" name="type" value={formData.type} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary">
                            <option value="member">Member Renewal</option>
                            <option value="walk-in">Walk-in</option>
                            <option value="coach">Coach Session</option>
                            {/* FIX: Add 'class' as an option to support class pricing. */}
                            <option value="class">Class</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancel</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold">{plan ? 'Save Changes' : 'Add Plan'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};