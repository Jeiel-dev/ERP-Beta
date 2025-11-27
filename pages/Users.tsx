import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, UserRole } from '../types';
import { getUsers, createUser, updateUser, deleteUser } from '../services/mockBackend';
import { UserPlus, Shield, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const Users: React.FC = () => {
  const { toast } = useToast();
  const { layoutMode } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  
  const isModern = layoutMode === 'modern';

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: UserRole.SALESPERSON
  });

  const loadUsers = async () => {
    const data = await getUsers();
    setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, username: user.username, password: '', role: user.role });
    } else {
      setEditingUser(null);
      setFormData({ name: '', username: '', password: '', role: UserRole.SALESPERSON });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await updateUser({ ...editingUser, ...formData, active: true });
      toast.success("Usuário atualizado com sucesso!");
    } else {
      await createUser({ ...formData, active: true });
      toast.success("Usuário criado com sucesso!");
    }
    setIsModalOpen(false);
    loadUsers();
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete.id);
      toast.success("Usuário removido com sucesso.");
      setDeleteModalOpen(false);
      setUserToDelete(null);
      loadUsers();
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    if (isModern) {
      if (role === UserRole.MANAGER) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
      if (role === UserRole.CASHIER) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    }
    if (role === UserRole.MANAGER) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    if (role === UserRole.CASHIER) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className={`text-2xl font-bold flex items-center ${isModern ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-white'}`}>
          <Shield className={`mr-2 ${isModern ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Gerenciamento de Usuários
        </h1>
        <button 
          onClick={() => handleOpenModal()}
          className={`${isModern ? 'bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20' : 'bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm'} text-white px-4 py-2 flex items-center transition-colors`}
        >
          <UserPlus size={18} className="mr-2" /> Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <div key={user.id} className={`${isModern ? 'bg-white dark:bg-[#1a1c29] border border-gray-100 dark:border-white/5 shadow-xl shadow-indigo-500/5 rounded-3xl' : 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700'} p-6 relative group transition-all duration-300 hover:-translate-y-1`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{user.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">@{user.username}</p>
                <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getRoleBadgeStyle(user.role)}`}>
                  {user.role === UserRole.MANAGER ? 'Gerente' : user.role === UserRole.CASHIER ? 'Caixa' : 'Vendedor'}
                </span>
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(user)} className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 rounded-full">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDeleteClick(user)} className="p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-full">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {isModern && <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-tr-3xl -z-10" />}
          </div>
        ))}
      </div>

      {/* User Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`bg-white dark:bg-slate-800 ${isModern ? 'rounded-2xl' : 'rounded-xl'} shadow-xl w-full max-w-md border dark:border-slate-700`}>
            <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                <input type="text" required className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário (Login)</label>
                <input type="text" required className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white"
                  value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha {editingUser && '(Deixe em branco para manter)'}</label>
                <input type="password" required={!editingUser} className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white"
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perfil</label>
                <select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white"
                  value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                  <option value={UserRole.SALESPERSON}>Vendedor</option>
                  <option value={UserRole.CASHIER}>Caixa</option>
                  <option value={UserRole.MANAGER}>Gerente</option>
                </select>
              </div>
              <button type="submit" className={`w-full ${isModern ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 rounded-lg transition-colors`}>Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`bg-white dark:bg-slate-800 ${isModern ? 'rounded-2xl' : 'rounded-lg'} shadow-xl w-full max-w-md overflow-hidden border dark:border-slate-700 animate-in zoom-in duration-200`}>
            <div className="p-6 text-center">
              <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir Usuário</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Tem certeza que deseja excluir permanentemente o usuário <strong>{userToDelete.name}</strong>?
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