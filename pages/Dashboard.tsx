import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sale, SaleStatus, UserRole } from '../types';
import { getSales } from '../services/mockBackend';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, ShoppingBag, AlertCircle, Clock, TrendingUp } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { layoutMode } = useTheme();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const isModern = layoutMode === 'modern';

  useEffect(() => {
    const fetchSales = async () => {
      const data = await getSales();
      setSales(data);
      setLoading(false);
    };
    fetchSales();
  }, []);

  if (loading) return <div className="text-center p-10 text-gray-500 dark:text-gray-400">Carregando indicadores...</div>;

  // KPIs
  const totalRevenue = sales
    .filter(s => s.status === SaleStatus.COMPLETED)
    .reduce((acc, curr) => acc + curr.totalValue, 0);

  const completedCount = sales.filter(s => s.status === SaleStatus.COMPLETED).length;
  const pendingCount = sales.filter(s => s.status === SaleStatus.PENDING).length;
  const cancelledCount = sales.filter(s => s.status === SaleStatus.CANCELLED).length;

  const chartData = sales
    .filter(s => s.status === SaleStatus.COMPLETED)
    .slice(-10)
    .map(s => ({
      name: s.finishedAt ? new Date(s.finishedAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '-',
      valor: s.totalValue
    }));

  // Helper for Card Styles
  const getCardStyle = (colorType: 'green' | 'blue' | 'orange' | 'red') => {
    if (isModern) {
      const colors = {
        green: 'shadow-emerald-500/10 hover:shadow-emerald-500/20 border-emerald-500/10',
        blue: 'shadow-blue-500/10 hover:shadow-blue-500/20 border-blue-500/10',
        orange: 'shadow-orange-500/10 hover:shadow-orange-500/20 border-orange-500/10',
        red: 'shadow-red-500/10 hover:shadow-red-500/20 border-red-500/10'
      };
      return `bg-white dark:bg-[#1a1c29] p-6 rounded-3xl border ${colors[colorType]} shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group`;
    }
    return `bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors`;
  };

  const getIconContainerStyle = (colorType: 'green' | 'blue' | 'orange' | 'red') => {
    if (isModern) {
      const styles = {
        green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        orange: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
      };
      return `p-4 rounded-2xl ${styles[colorType]} transition-colors`;
    }
    const styles = {
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    };
    return `p-3 rounded-full ${styles[colorType]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isModern ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-white'}`}>
             Bem-vindo, {user?.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Aqui está o resumo da operação hoje.</p>
        </div>
        {isModern && (
           <div className="bg-white dark:bg-[#1a1c29] px-4 py-2 rounded-2xl text-sm font-medium text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-white/5 flex items-center">
             <Clock size={16} className="mr-2 text-indigo-500" />
             {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
           </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={getCardStyle('green')}>
          {isModern && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />}
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Receita Total</p>
              <h3 className={`font-bold ${isModern ? 'text-3xl text-gray-900 dark:text-white' : 'text-2xl text-gray-800 dark:text-white'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </h3>
            </div>
            <div className={getIconContainerStyle('green')}>
              <DollarSign size={isModern ? 28 : 24} />
            </div>
          </div>
        </div>

        <div className={getCardStyle('blue')}>
           {isModern && <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />}
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Vendas Concluídas</p>
              <h3 className={`font-bold ${isModern ? 'text-3xl text-gray-900 dark:text-white' : 'text-2xl text-gray-800 dark:text-white'}`}>{completedCount}</h3>
            </div>
            <div className={getIconContainerStyle('blue')}>
              <ShoppingBag size={isModern ? 28 : 24} />
            </div>
          </div>
        </div>

        <div className={getCardStyle('orange')}>
           {isModern && <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />}
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Aguardando Caixa</p>
              <h3 className={`font-bold ${isModern ? 'text-3xl text-gray-900 dark:text-white' : 'text-2xl text-gray-800 dark:text-white'}`}>{pendingCount}</h3>
            </div>
            <div className={getIconContainerStyle('orange')}>
              <Clock size={isModern ? 28 : 24} />
            </div>
          </div>
        </div>

        <div className={getCardStyle('red')}>
           {isModern && <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />}
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Canceladas</p>
              <h3 className={`font-bold ${isModern ? 'text-3xl text-gray-900 dark:text-white' : 'text-2xl text-gray-800 dark:text-white'}`}>{cancelledCount}</h3>
            </div>
            <div className={getIconContainerStyle('red')}>
              <AlertCircle size={isModern ? 28 : 24} />
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {user?.role === UserRole.MANAGER && (
        <div className={`
          ${isModern 
            ? 'bg-white dark:bg-[#1a1c29] p-6 rounded-3xl shadow-xl shadow-indigo-500/5 border border-gray-100 dark:border-white/5' 
            : 'bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700'}
           mt-8 transition-colors
        `}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-lg font-bold ${isModern ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-white'}`}>
              Últimas Vendas Realizadas
            </h2>
            {isModern && <TrendingUp className="text-indigo-500 opacity-50" />}
          </div>
          
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isModern ? '#e5e7eb' : '#374151'} opacity={0.2} />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: isModern ? '#f3f4f6' : '#374151', opacity: 0.2}}
                  formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                  contentStyle={{
                    borderRadius: isModern ? '16px' : '8px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: isModern ? '#fff' : '#1f2937',
                    color: isModern ? '#111' : '#f3f4f6'
                  }}
                />
                <Legend iconType={isModern ? 'circle' : 'rect'} />
                <Bar 
                  dataKey="valor" 
                  name="Valor da Venda" 
                  fill={isModern ? '#6366f1' : '#3b82f6'} 
                  radius={isModern ? [8, 8, 8, 8] : [4, 4, 0, 0]} 
                  barSize={isModern ? 40 : undefined}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
       {/* Help Section */}
      <div className={`mt-8 p-6 transition-colors
         ${isModern 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-3xl border border-blue-100 dark:border-white/5' 
            : 'bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30'}
      `}>
        <h2 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">Guia Rápido do Sistema</h2>
        <div className="grid md:grid-cols-3 gap-6 text-sm text-blue-900 dark:text-blue-200">
          <div>
            <span className="font-bold block mb-1">Vendedor</span>
            Vá para "Vendas" &gt; "Nova Venda" para iniciar um pedido. Selecione produtos e envie. O status ficará como "Pendente".
          </div>
          <div>
            <span className="font-bold block mb-1">Caixa</span>
            Vá para "Vendas" &gt; "Frente de Caixa" para ver pedidos pendentes. Confira os itens e clique em "Finalizar Venda" para baixar estoque.
          </div>
          <div>
            <span className="font-bold block mb-1">Gerente</span>
            Gerencie "Usuários" e "Produtos". No histórico de vendas, é possível cancelar pedidos indevidos.
          </div>
        </div>
      </div>
    </div>
  );
};