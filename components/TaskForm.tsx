import React, { useState, FormEvent, useEffect } from 'react';
import { Task, Member } from '../types';
import { getTodayYMD } from '../utils/dateUtils';

interface TaskFormProps {
    task: Task | null;
    members: Member[];
    onClose: () => void;
    onSave: (taskData: Omit<Task, 'id' | 'completedOn'> | Task) => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ task, members, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        details: '',
        dueDate: getTodayYMD(),
        recurrence: 'none' as Task['recurrence'],
        clientId: '',
    });

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                details: task.details,
                dueDate: task.dueDate,
                recurrence: task.recurrence || 'none',
                clientId: task.clientId || '',
            });
        }
    }, [task]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            alert("Task title cannot be empty.");
            return;
        }

        const selectedMember = members.find(m => m.id === formData.clientId);

        const saveData = {
            ...formData,
            clientName: selectedMember ? selectedMember.name : undefined,
            clientId: selectedMember ? selectedMember.id : undefined,
        };

        if (task) {
            onSave({ ...task, ...saveData });
        } else {
            onSave(saveData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 border border-gray-700 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-white">{task ? 'Edit Task' : 'Add New Task'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                     <div>
                        <label htmlFor="clientId" className="block text-sm font-medium text-gray-400 mb-1">Assign to Member (Optional)</label>
                        <select
                            id="clientId"
                            name="clientId"
                            value={formData.clientId}
                            onChange={handleChange}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            <option value="">General Task (No Member)</option>
                            {members.map(member => (
                                <option key={member.id} value={member.id}>{member.name} ({member.id})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="details" className="block text-sm font-medium text-gray-400 mb-1">Details</label>
                        <textarea
                            id="details"
                            name="details"
                            value={formData.details}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Add more details about the task..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-400 mb-1">Due Date / Start Date</label>
                            <input
                                type="date"
                                id="dueDate"
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleChange}
                                required
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>
                        <div>
                            <label htmlFor="recurrence" className="block text-sm font-medium text-gray-400 mb-1">Recurrence</label>
                            <select
                                id="recurrence"
                                name="recurrence"
                                value={formData.recurrence}
                                onChange={handleChange}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                                <option value="none">None</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancel</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold">{task ? 'Save Changes' : 'Add Task'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};