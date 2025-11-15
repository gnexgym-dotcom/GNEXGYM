import React, { useState } from 'react';
import { Product } from '../types';
import { useProducts } from '../hooks/useProducts';
import { PlusIcon } from './icons/Icons';
import { ProductForm } from './ProductForm';

type UseProductsReturn = ReturnType<typeof useProducts>;

export const ProductManagement: React.FC<UseProductsReturn> = ({ products, addProduct, updateProduct, deleteProduct }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const handleAdd = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            deleteProduct(id);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Manage Products</h1>
                <button
                    onClick={handleAdd}
                    className="flex items-center bg-brand-primary hover:opacity-90 text-gray-900 font-bold py-2 px-4 rounded-lg"
                >
                    <PlusIcon className="w-5 h-5 mr-2"/>
                    Add Product
                </button>
            </div>
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="border-b border-gray-700">
                        <tr>
                            <th className="p-4 font-semibold">Product Name</th>
                            <th className="p-4 font-semibold">Category</th>
                            <th className="p-4 font-semibold">Price</th>
                            <th className="p-4 font-semibold">Stock</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="p-4 font-medium text-white">{product.name}</td>
                                <td className="p-4 text-gray-400">{product.category}</td>
                                <td className="p-4 text-gray-400">₱{product.price.toFixed(2)}</td>
                                <td className="p-4 text-gray-400">{product.stock}</td>
                                <td className="p-4">
                                    <button onClick={() => handleEdit(product)} className="text-sm text-brand-secondary hover:underline mr-4">Edit</button>
                                    <button onClick={() => handleDelete(product.id)} className="text-sm text-red-500 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {products.length === 0 && <p className="text-center p-8 text-gray-400">No products found.</p>}
            </div>
            {isModalOpen && (
                <ProductForm
                    product={editingProduct}
                    onClose={() => setIsModalOpen(false)}
                    addProduct={addProduct}
                    updateProduct={updateProduct}
                />
            )}
        </div>
    );
};
