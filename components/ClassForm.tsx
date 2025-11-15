import React, { useState, FormEvent, useEffect } from 'react';
import { Class, Coach } from '../types';

interface ClassFormProps {
    classData: Class | null;
    coaches: Coach[];
    onClose: () => void;
    onSave: (classData: Omit<Class, 'id'> | Class) => void;
}

export const ClassForm: React.FC<ClassFormProps> = ({ classData, coaches, onClose, onSave }) => {
    const [formData, setFormData] = useState({ name: '', coachId: '' });

    useEffect(() => {
        if (classData) {
            setFormData({ name: classData.name, coachId: classData.coachId || '' });
        }
    }, [classData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Please enter a class name.');
            return;
        }

        const saveData = {
            name: formData.name,
            coachId: formData.coachId || undefined,
        };

        if (classData) {
            onSave({ ...classData, ...saveData });
        } else {
            onSave(saveData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 border border-gray-700 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-white">{classData ? 'Edit Class' : 'Add New Class'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Class Name</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white" />
                    </div>
                    <div>
                        <label htmlFor="coachId" className="block text-sm font-medium text-gray-400 mb-1">Assign Coach (Optional)</label>
                        <select id="coachId" name="coachId" value={formData.coachId} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white">
                            <option value="">No Coach Assigned</option>
                            {coaches.map(coach => (
                                <option key={coach.id} value={coach.id}>{coach.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancel</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold">{classData ? 'Save Changes' : 'Add Class'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
