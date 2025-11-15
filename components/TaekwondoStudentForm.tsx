import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { WalkinClient } from '../types';
import { UserIcon } from './icons/Icons';
import { WebcamCapture } from './WebcamCapture';
import { ImageEditor } from './ImageEditor';

interface TaekwondoStudentFormProps {
    client: WalkinClient;
    onClose: () => void;
    onSave: (client: WalkinClient) => void;
}

export const TaekwondoStudentForm: React.FC<TaekwondoStudentFormProps> = ({ client, onClose, onSave }) => {
    const [formData, setFormData] = useState<WalkinClient>(client);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingImageSrc, setEditingImageSrc] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData(client);
    }, [client]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSessionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseInt(value, 10) || 0;
        setFormData(prev => ({
            ...prev,
            sessionPlan: {
                ...prev.sessionPlan!,
                [name]: Math.max(0, numValue),
            }
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const result = loadEvent.target?.result;
                if (typeof result === 'string') {
                    setEditingImageSrc(result);
                    setIsEditorOpen(true);
                }
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
    };

    const handleWebcamCapture = (imageDataUrl: string) => {
        setEditingImageSrc(imageDataUrl);
        setIsEditorOpen(true);
        setIsCameraOpen(false);
    };

    const handleEditorSave = (newImageDataUrl: string) => {
        setFormData(prev => ({ ...prev, photoUrl: newImageDataUrl }));
        setIsEditorOpen(false);
        setEditingImageSrc(null);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 border border-gray-700 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-white">Edit Session Client</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Photo part */}
                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mb-4 border-2 border-gray-600">
                            {formData.photoUrl ? (
                                <img src={formData.photoUrl} alt={formData.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <UserIcon className="w-16 h-16 text-gray-500" />
                            )}
                        </div>
                        <div className="flex gap-2">
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition">Upload Photo</button>
                            <button type="button" onClick={() => setIsCameraOpen(true)} className="text-sm py-2 px-4 rounded-lg bg-brand-secondary hover:opacity-90 text-gray-900 font-bold transition">Take Photo</button>
                        </div>
                    </div>
                    {/* Form fields */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white"/>
                    </div>
                    <div>
                        <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-400 mb-1">Contact Number</label>
                        <input type="text" id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white"/>
                    </div>
                    {formData.sessionPlan && (
                        <div className="p-4 bg-gray-700/50 rounded-lg">
                            <p className="text-lg font-semibold text-gray-300 mb-2">{formData.sessionPlan.name}</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="total" className="block text-sm font-medium text-gray-400 mb-1">Total Sessions</label>
                                    <input type="number" id="total" name="total" value={formData.sessionPlan.total} onChange={handleSessionChange} className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2.5 text-white"/>
                                </div>
                                <div>
                                    <label htmlFor="used" className="block text-sm font-medium text-gray-400 mb-1">Sessions Used</label>
                                    <input type="number" id="used" name="used" value={formData.sessionPlan.used} onChange={handleSessionChange} max={formData.sessionPlan.total} className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2.5 text-white"/>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Buttons */}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancel</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold">Save Changes</button>
                    </div>
                </form>
                 {isCameraOpen && <WebcamCapture onCapture={handleWebcamCapture} onClose={() => setIsCameraOpen(false)} />}
                 {isEditorOpen && editingImageSrc && <ImageEditor src={editingImageSrc} onSave={handleEditorSave} onClose={() => setIsEditorOpen(false)} />}
            </div>
        </div>
    );
};