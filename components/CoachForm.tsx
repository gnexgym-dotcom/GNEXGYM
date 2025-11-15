import React, { useState, FormEvent, useEffect } from 'react';
import { Coach } from '../types';

interface CoachFormProps {
    coach: Coach | null;
    onClose: () => void;
    addCoach: (coach: Omit<Coach, 'id'>) => void;
    updateCoach: (coach: Coach) => void;
}

export const CoachForm: React.FC<CoachFormProps> = ({ coach, onClose, addCoach, updateCoach }) => {
    const [formData, setFormData] = useState({
        name: '',
        mobileNumber: '',
        address: '',
        skills: '', // Stored as a comma-separated string for the input
    });

    useEffect(() => {
        if (coach) {
            setFormData({
                name: coach.name,
                mobileNumber: coach.mobileNumber,
                address: coach.address,
                skills: coach.skills.join(', '),
            });
        }
    }, [coach]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        
        const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);

        const coachData = {
            name: formData.name,
            mobileNumber: formData.mobileNumber,
            address: formData.address,
            skills: skillsArray,
        };

        if (coach) {
            updateCoach({ ...coach, ...coachData });
        } else {
            addCoach(coachData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 border border-gray-700 animate-fade-in-up max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 text-white">{coach ? 'Edit Coach' : 'Add New Coach'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                    </div>
                     <div>
                        <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-400 mb-1">Mobile Number</label>
                        <input type="tel" id="mobileNumber" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                    </div>
                     <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-400 mb-1">Address</label>
                        <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"/>
                    </div>
                    <div>
                        <label htmlFor="skills" className="block text-sm font-medium text-gray-400 mb-1">Skills</label>
                        <textarea id="skills" name="skills" value={formData.skills} onChange={handleChange} rows={3} placeholder="e.g., Bodybuilding, Boxing, Yoga" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                         <p className="text-xs text-gray-500 mt-1">Separate skills with a comma.</p>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition">Cancel</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold transition">{coach ? 'Save Changes' : 'Add Coach'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};