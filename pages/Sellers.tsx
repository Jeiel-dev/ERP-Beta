
import React, { useEffect, useState } from 'react';
import { Seller } from '../types';
import { getSellers, createSeller, updateSeller, deleteSeller, toggleSellerActive } from '../services/mockBackend';
import { Users, Trash2, Edit, AlertTriangle, Plus, Power } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const Sellers: React.FC = () => {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
  
  const [formData, setFormData] = useState({
    name: ''
  });

  const loadSellers = async () => {
    const data = await getSellers();
    setSellers(data);
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const handleOpenModal = (seller?: Seller) => {
    if (seller) {
      setEditingSeller(seller);
      setFormData({ name: seller.name });
    } else {
      setEditingSeller(null);
      setFormData({ name: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingSeller) {
        await updateSeller({ ...editingSeller, name: formData.name });
        toast.success("Vendedor atualizado com sucesso!");
      } else {
        await createSeller(formData.name);
        toast.success("Vendedor cadastrado com sucesso!");
      }
      setIsModalOpen(false);
      loadSellers();
    } catch (e: any) {
      toast.error("Erro ao salvar vendedor.");
    }
  };

  const handleDeleteClick = (seller: Seller) => {
    setSellerToDelete(seller);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (sellerToDelete) {
      try {
        await deleteSeller(sellerToDelete.id);
        toast.success("Vendedor removido com sucesso.");
        setDeleteModalOpen(false);
        setSellerToDelete(null);
        loadSellers();
      } catch (e) {
        toast.error("Erro ao excluir vendedor.");
      }
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await toggleSellerActive(id);
      toast.info(currentStatus ? "Vendedor desativado." : "Vendedor ativado.");
      loadSellers();
    } catch (e) {
      toast.error("Erro ao alterar status.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
          <Users className="mr-2" /> Equipe de Vendas
        </h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm transition-colors"
        >
          <Plus size={18} className="mr-2" /> Novo Vendedor
        </button>
      </div>
      <p className="text-gray-500 dark:text-gray-400">Gerencie os vendedores que aparecerão como opção na tela de vendas.</p>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-600">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nome</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {sellers.map(seller => (
              <tr key={seller.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                 <td className="px-6 py-4">
                     <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${seller.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{seller.active ? 'Ativo' : 'Inativo'}</span>
                     </div>
                  </td>
                <td className="px-6 py-4 text-gray-800 dark:text-white font-medium">{seller.name}</td>
                <td className="px-6 py-4 text-right space-x-2">
                   <button 
                      onClick={() => handleToggleActive(seller.id, seller.active)}
                      className={`p-1 rounded transition-colors ${seller.active ? 'text-green-600 hover:text-green-800 dark:text-green-400' : 'text-gray-400 hover:text-gray-600'}`}
                      title={seller.active ? "Desativar" : "Ativar"}
                    >
                      <Power size={18} />
                    </button>
                  <button onClick={() => handleOpenModal(seller)} className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDeleteClick(seller)} className="p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
             {sellers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    Nenhum vendedor cadastrado.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm border dark:border-slate-700">
            <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white">{editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                <input type="text" required className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-bold">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && sellerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden border dark:border-slate-700 animate-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir Vendedor</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Tem certeza que deseja excluir <strong>{sellerToDelete.name}</strong>?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  className="bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white font-bold py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors shadow-md"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
