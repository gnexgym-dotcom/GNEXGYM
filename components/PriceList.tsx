import React, { useState, useMemo } from 'react';
import { PricePlan } from '../types';
import { usePriceList } from '../hooks/usePriceList';
import { PlusIcon, SearchIcon } from './icons/Icons';
import { PriceForm } from './PriceForm';

type UsePriceListReturn = ReturnType<typeof usePriceList>;

const PlanListSection: React.FC<{
    title: string;
    plans: PricePlan[];
    onEdit: (plan: PricePlan) => void;
    onDelete: (id: string) => void;
}> = ({ title, plans, onEdit, onDelete }) => (
     <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <div className="p-4 md:p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <div className="divide-y divide-gray-700">
            {plans.length > 0 ? plans.map(plan => (
                <div key={plan.id} className="p-4 flex justify-between items-center hover:bg-gray-700/50">
                    <div>
                        <p className="text-lg font-semibold text-white">{plan.name}</p>
                        <p className="text-brand-primary font-bold">₱{plan.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(plan)} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold">Edit</button>
                        <button onClick={() => onDelete(plan.id)} className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold">Delete</button>
                    </div>
                </div>
            )) : (
                <p className="text-center p-8 text-gray-400">No plans match your search in this category.</p>
            )}
        </div>
    </div>
);


export const PriceList: React.FC<UsePriceListReturn> = ({ priceList, addPlan, updatePlan, deletePlan }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<PricePlan | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPriceList = useMemo(() => {
        if (!searchTerm.trim()) {
            return priceList;
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        return priceList.filter(plan =>
            plan.name.toLowerCase().includes(lowerCaseSearch) ||
            plan.type.toLowerCase().includes(lowerCaseSearch)
        );
    }, [priceList, searchTerm]);

    const memberPlans = filteredPriceList.filter(p => p.type === 'member').sort((a,b) => a.amount - b.amount);
    const walkinPlans = filteredPriceList.filter(p => p.type === 'walk-in').sort((a,b) => a.amount - b.amount);
    
    const coachPlans = filteredPriceList.filter(p => p.type === 'coach').sort((a, b) => {
        const getPlanDetails = (name: string) => {
            const sessionMatch = name.match(/(\d+)\s*Session/i);
            const sessions = sessionMatch ? parseInt(sessionMatch[1], 10) : 999;
            
            let typeOrder = 99; // for others
            if (name.startsWith('PT')) typeOrder = 1;
            else if (name.startsWith('Boxing')) typeOrder = 2;
            else if (name.startsWith('Muaythai')) typeOrder = 3;
            
            return { sessions, typeOrder };
        };

        const detailsA = getPlanDetails(a.name);
        const detailsB = getPlanDetails(b.name);

        if (detailsA.typeOrder !== detailsB.typeOrder) {
            return detailsA.typeOrder - detailsB.typeOrder;
        }
        
        if (detailsA.sessions !== detailsB.sessions) {
            return detailsA.sessions - detailsB.sessions;
        }

        return a.name.localeCompare(b.name);
    });


    const handleAdd = () => {
        setEditingPlan(null);
        setIsModalOpen(true);
    };

    const handleEdit = (plan: PricePlan) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this price plan?')) {
            deletePlan(id);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manage Price List</h1>
                    <p className="text-gray-400">Edit prices for renewals and walk-ins.</p>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or type..."
                            className="bg-gray-700 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="flex items-center bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-2 px-4 rounded-lg"
                    >
                        <PlusIcon className="w-5 h-5 mr-2"/>
                        Add New Plan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <PlanListSection title="Member Renewal Plans" plans={memberPlans} onEdit={handleEdit} onDelete={handleDelete} />
                    <PlanListSection title="Walk-in Plans" plans={walkinPlans} onEdit={handleEdit} onDelete={handleDelete} />
                </div>
                <PlanListSection title="Coach Session Plans" plans={coachPlans} onEdit={handleEdit} onDelete={handleDelete} />
            </div>

            {isModalOpen && (
                <PriceForm
                    plan={editingPlan}
                    onClose={() => setIsModalOpen(false)}
                    addPlan={addPlan}
                    updatePlan={updatePlan}
                />
            )}
        </div>
    );
};