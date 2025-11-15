import React, { useState } from 'react';
import { Coach } from '../types';
import { useCoaches } from '../hooks/useCoaches';
import { PlusIcon, UserIcon } from './icons/Icons';
import { CoachForm } from './CoachForm';

type UseCoachesReturn = ReturnType<typeof useCoaches>;

export const CoachManagement: React.FC<UseCoachesReturn> = ({ coaches, addCoach, updateCoach, deleteCoach }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoach, setEditingCoach] = useState<Coach | null>(null);

    const handleAdd = () => {
        setEditingCoach(null);
        setIsModalOpen(true);
    };

    const handleEdit = (coach: Coach) => {
        setEditingCoach(coach);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this coach? This action cannot be undone.')) {
            deleteCoach(id);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manage Coaches</h1>
                    <p className="text-gray-400">Add, edit, or remove coach profiles.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-2 px-4 rounded-lg transition-opacity duration-200"
                >
                    <PlusIcon className="w-5 h-5 mr-2"/>
                    Add Coach
                </button>
            </div>

            {coaches.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coaches.map(coach => (
                        <div key={coach.id} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 flex flex-col justify-between">
                           <div>
                                <div className="flex items-center mb-4">
                                     <div className="p-3 rounded-full bg-brand-secondary/20 mr-4">
                                        <UserIcon className="w-6 h-6 text-brand-secondary" />
                                     </div>
                                     <div>
                                        <h2 className="text-xl font-bold text-white">{coach.name}</h2>
                                        <p className="text-sm text-gray-400">{coach.mobileNumber}</p>
                                     </div>
                                </div>
                                <p className="text-sm text-gray-300 mb-4">{coach.address}</p>
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {coach.skills.map(skill => (
                                            <span key={skill} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-full">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                           </div>
                           <div className="mt-6 flex justify-end gap-2">
                                <button onClick={() => handleEdit(coach)} className="text-sm py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition">Edit</button>
                                <button onClick={() => handleDelete(coach.id)} className="text-sm py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition">Delete</button>
                           </div>
                        </div>
                    ))}
                 </div>
            ) : (
                <div className="text-center bg-gray-800 p-12 rounded-xl border border-dashed border-gray-700">
                    <UserIcon className="w-16 h-16 text-gray-600 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-white">No Coaches Found</h3>
                    <p className="text-gray-400 mt-2">Click "Add Coach" to build your team.</p>
                </div>
            )}

            {isModalOpen && (
                <CoachForm
                    coach={editingCoach}
                    onClose={() => setIsModalOpen(false)}
                    addCoach={addCoach}
                    updateCoach={updateCoach}
                />
            )}
        </div>
    );
};