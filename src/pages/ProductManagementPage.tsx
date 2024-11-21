import React, { useState } from 'react';
import { Settings, Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { Product } from '../types/inventory';
import { useProducts } from '../hooks/useFirestore';
import { useScrollPosition } from '../hooks/useScrollPosition';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const ProductManagementPage: React.FC = () => {
  const { products, loading, error, saveProducts } = useProducts();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    category: 'vegetables',
    unit: 'Stück',
    kgFactor: 1
  });
  const { saveScrollPosition } = useScrollPosition([products]);

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>, isNewProduct: boolean) => {
    const newUnit = e.target.value;
    const newKgFactor = newUnit === 'kg' ? 1 : undefined;
    
    if (isNewProduct) {
      setNewProduct(prev => ({
        ...prev,
        unit: newUnit,
        kgFactor: newKgFactor ?? prev.kgFactor
      }));
    } else if (editingProduct) {
      setEditingProduct(prev => 
        prev ? {
          ...prev,
          unit: newUnit,
          kgFactor: newKgFactor ?? prev.kgFactor
        } : null
      );
    }
  };

  const handleEditProduct = (product: Product) => {
    saveScrollPosition();
    setEditingProduct(product);
  };

  const handleSaveEdit = async () => {
    if (editingProduct) {
      saveScrollPosition();
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id ? editingProduct : p
      );
      await saveProducts(updatedProducts);
      setEditingProduct(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.category && newProduct.unit && newProduct.kgFactor !== undefined) {
      saveScrollPosition();
      const id = newProduct.name
        .toLowerCase()
        .replace(/[äöüß]/g, (match) => {
          const chars: { [key: string]: string } = {
            ä: 'ae',
            ö: 'oe',
            ü: 'ue',
            ß: 'ss'
          };
          return chars[match] || match;
        })
        .replace(/[^a-z0-9]/g, '-');

      const newProductComplete: Product = {
        id,
        name: newProduct.name,
        category: newProduct.category as 'fruits' | 'vegetables' | 'salads',
        unit: newProduct.unit,
        kgFactor: newProduct.kgFactor,
        order: Math.max(...products.map(p => p.order), 0) + 1
      };

      const updatedProducts = [...products, newProductComplete];
      await saveProducts(updatedProducts);
      setNewProduct({ category: 'vegetables', unit: 'Stück', kgFactor: 1 });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Produkt löschen möchten?')) {
      saveScrollPosition();
      const updatedProducts = products.filter(p => p.id !== productId);
      await saveProducts(updatedProducts);
    }
  };

  const handleMoveProduct = async (productId: string, direction: 'up' | 'down') => {
    const currentIndex = products.findIndex(p => p.id === productId);
    if (
      (direction === 'up' && currentIndex > 0) ||
      (direction === 'down' && currentIndex < products.length - 1)
    ) {
      saveScrollPosition();
      const newProducts = [...products];
      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      const tempOrder = newProducts[currentIndex].order;
      newProducts[currentIndex].order = newProducts[swapIndex].order;
      newProducts[swapIndex].order = tempOrder;
      
      await saveProducts(newProducts.sort((a, b) => a.order - b.order));
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const categoryNames = {
    fruits: 'Obst',
    vegetables: 'Gemüse',
    salads: 'Salate'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="h-6 w-6 text-blue-500" />
        <h2 className="text-xl font-semibold text-gray-800">Produktverwaltung</h2>
      </div>

      {/* Mobiles Formular für neue Produkte */}
      <div className="mb-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Neues Produkt</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              placeholder="Produktname"
              value={newProduct.name || ''}
              onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select
              value={newProduct.category}
              onChange={e => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fruits">Obst</option>
              <option value="vegetables">Gemüse</option>
              <option value="salads">Salate</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
            <select
              value={newProduct.unit}
              onChange={e => handleUnitChange(e, true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Stück">Stück</option>
              <option value="kg">kg</option>
              <option value="Bund">Bund</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">kg pro Einheit</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="kg pro Einheit"
              value={newProduct.kgFactor || ''}
              onChange={e => setNewProduct(prev => ({ ...prev, kgFactor: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={newProduct.unit === 'kg'}
            />
          </div>
          
          <button
            onClick={handleAddProduct}
            disabled={!newProduct.name}
            className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Plus className="h-5 w-5 mr-2" />
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Mobile Produktliste */}
      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4">
            {editingProduct?.id === product.id ? (
              // Bearbeitungsmodus
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={e => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <select
                    value={editingProduct.category}
                    onChange={e => setEditingProduct(prev => prev ? { ...prev, category: e.target.value as 'fruits' | 'vegetables' | 'salads' } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fruits">Obst</option>
                    <option value="vegetables">Gemüse</option>
                    <option value="salads">Salate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                  <select
                    value={editingProduct.unit}
                    onChange={e => handleUnitChange(e, false)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Stück">Stück</option>
                    <option value="kg">kg</option>
                    <option value="Bund">Bund</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">kg pro Einheit</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.kgFactor}
                    onChange={e => setEditingProduct(prev => prev ? { ...prev, kgFactor: Number(e.target.value) } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={editingProduct.unit === 'kg'}
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              // Anzeigemodus
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleMoveProduct(product.id, 'up')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <MoveUp className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleMoveProduct(product.id, 'down')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <MoveDown className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Kategorie:</span> {categoryNames[product.category]}
                  </div>
                  <div>
                    <span className="font-medium">Einheit:</span> {product.unit}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">kg pro Einheit:</span> {product.kgFactor}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductManagementPage;