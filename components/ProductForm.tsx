import React, { useState, FormEvent, useEffect } from 'react';
import { Product } from '../types';

interface ProductFormProps {
    product: Product | null;
    onClose: () => void;
    addProduct: (product: Omit<Product, 'id'>) => void;
    updateProduct: (product: Product) => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ product, onClose, addProduct, updateProduct }) => {
    const [formData, setFormData] = useState({ name: '', category: '', price: 0, stock: 0 });

    useEffect(() => {
        if (product) {
            setFormData({ name: product.name, category: product.category, price: product.price, stock: product.stock });
        } else {
            setFormData({ name: '', category: '', price: 0, stock: 0 });
        }
    }, [product]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (product) {
            updateProduct({ ...product, ...formData });
        } else {
            addProduct(formData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 border border-gray-700 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-white">{product ? 'Edit Product' : 'Add New Product'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Product Name</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                        <input type="text" id="category" name="category" value={formData.category} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-400 mb-1">Price (₱)</label>
                            <input type="number" id="price" name="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                        <div>
                            <label htmlFor="stock" className="block text-sm font-medium text-gray-400 mb-1">Stock</label>
                            <input type="number" id="stock" name="stock" value={formData.stock} onChange={handleChange} required min="0" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold">Cancel</button>
                        <button type="submit" className="py-2 px-4 rounded-lg bg-brand-primary hover:opacity-90 text-gray-900 font-bold">{product ? 'Save Changes' : 'Add Product'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
