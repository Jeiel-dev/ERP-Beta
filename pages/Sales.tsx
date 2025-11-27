import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Product, Sale, SaleItem, SaleStatus, UserRole, PaymentDetails, Seller } from '../types';
import { getProducts, getSales, createSale, updateSale, completeSale, cancelSale, getSellers } from '../services/mockBackend';
import { supabase } from '../services/supabase';
import { Search, PlusCircle, Check, Trash2, CheckCircle, Clock, XCircle, User, CreditCard, DollarSign, Edit2, MapPin, Lock, X, FileText, AlertTriangle, Eye, ArrowRight, Briefcase } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Helper functions for currency
const formatMoney = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseMoney = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return parseInt(digits || "0") / 100;
};

// Unique ID generator for cart items to keep React happy
const generateLocalId = () => Math.random().toString(36).substr(2, 9);

export const Sales: React.FC = () => {
  const { user } = useAuth();
  const { layoutMode } = useTheme();
  const { toast } = useToast();
  
  const isModern = layoutMode === 'modern';

  // Initialize Active Tab based on User Role
  const [activeTab, setActiveTab] = useState<'new' | 'pending' | 'history'>(() => {
    return user?.role === UserRole.CASHIER ? 'pending' : 'new';
  });
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(false);

  // --- POS STATE (New/Edit Sale) ---
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [isCashierConfirming, setIsCashierConfirming] = useState(false);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [posClient, setPosClient] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState<string>(''); // For the dropdown
  
  // Product Search State
  const [searchCode, setSearchCode] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);

  // Monetary Values
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posFreight, setPosFreight] = useState<number>(0);
  const [posOther, setPosOther] = useState<number>(0);
  
  // Detailed Payments
  const [payments, setPayments] = useState<PaymentDetails>({
    cash: 0, debit: 0, credit: 0, pix: 0, 
    boleto: 0, creditStore: 0, ticket: 0, transfer: 0, cheque: 0
  });
  
  // Installments logic
  const [creditInstallments, setCreditInstallments] = useState<number>(1);

  // Info
  const [obs, setObs] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [email, setEmail] = useState('');
  const [cashierIdent, setCashierIdent] = useState('');
  const [purchaseOrder, setPurchaseOrder] = useState('');

  // --- MODAL STATES ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItemIndex, setEditItemIndex] = useState<number | null>(null);
  const [editItemData, setEditItemData] = useState<Partial<SaleItem>>({});

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [tempDiscountValue, setTempDiscountValue] = useState(0);
  const [tempDiscountPercent, setTempDiscountPercent] = useState(0);
  const [discountToken, setDiscountToken] = useState('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [saleToView, setSaleToView] = useState<Sale | null>(null);

  const isSalesperson = user?.role === UserRole.SALESPERSON || user?.role === UserRole.MANAGER;
  const isCashier = user?.role === UserRole.CASHIER || user?.role === UserRole.MANAGER;
  const isManager = user?.role === UserRole.MANAGER;

  // ... (Same logic for refreshData, Realtime, Calculations as before)
  const refreshData = async () => {
    const [pData, sData, sellersData] = await Promise.all([getProducts(), getSales(), getSellers()]);
    setProducts(pData);
    setSellers(sellersData.filter(s => s.active));
    
    const sortedSales = sData.sort((a, b) => {
      if (a.status === SaleStatus.PENDING && b.status !== SaleStatus.PENDING) return -1;
      if (a.status !== SaleStatus.PENDING && b.status === SaleStatus.PENDING) return 1;
      if (a.status === SaleStatus.PENDING && b.status === SaleStatus.PENDING) {
         return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setSales(sortedSales);
  };

  useEffect(() => {
    setLoading(true);
    refreshData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('sales-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => { refreshData(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (posDiscount > 0) {
      setCreditInstallments(1);
    }
  }, [posDiscount]);

  const subTotal = cart.reduce((acc: number, item) => acc + item.total, 0);
  const totalGeneral = Math.max(0, subTotal - posDiscount + posFreight + posOther);
  const totalPaid = (Object.values(payments) as number[]).reduce((acc: number, val: number) => acc + val, 0);
  const remaining = Math.max(0, totalGeneral - totalPaid);

  // --- HANDLERS (Same as before) ---
  const handleProductSearch = (val: string) => {
    if (isCashierConfirming) return;
    setSearchCode(val);
    setShowSearchResults(val.length > 0);
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchCode(product.name);
    setItemPrice(product.price);
    setItemQty(1);
    setShowSearchResults(false);
  };

  const handleBlurSearch = () => { setTimeout(() => setShowSearchResults(false), 200); };

  const handleAddItem = () => {
    if (isCashierConfirming) return;
    if (!selectedProduct) { toast.error("Selecione um produto válido."); return; }
    const currentInCart = cart.filter(i => i.productId === selectedProduct.id).reduce((acc, i) => acc + i.quantity, 0);
    if (selectedProduct.stock < (currentInCart + itemQty)) { toast.error(`Estoque insuficiente! Disponível: ${selectedProduct.stock}`); return; }

    const newItem: SaleItem = {
      internalId: generateLocalId(),
      productId: selectedProduct.id,
      productCode: selectedProduct.code,
      productName: selectedProduct.name,
      quantity: itemQty,
      unitPrice: itemPrice,
      originalPrice: selectedProduct.price,
      total: itemPrice * itemQty,
      unit: selectedProduct.unit || 'UNID',
      observation: ''
    };
    setCart(prev => [...prev, newItem]);
    setSearchCode(''); setSelectedProduct(null); setItemQty(1); setItemPrice(0);
    if(searchInputRef.current) searchInputRef.current.focus();
  };

  const handleRemoveItem = (idx: number) => { setCart(prev => prev.filter((_, i) => i !== idx)); };

  const openEditModal = (idx: number) => {
    const item = cart[idx];
    setEditItemIndex(idx);
    setEditItemData({ ...item });
    setEditModalOpen(true);
  };

  const saveEditItem = () => {
    if (editItemIndex !== null && editItemData.quantity) {
      const original = editItemData.originalPrice || editItemData.unitPrice || 0;
      let finalPrice = editItemData.unitPrice;
      if (!finalPrice || finalPrice === 0) { finalPrice = original; toast.info("Valor inválido. Revertido para o preço original."); }
      const minAllowedPrice = original * 0.94;
      if (finalPrice! < minAllowedPrice) { finalPrice = minAllowedPrice; toast.info("Preço ajustado para o limite máximo de 6% de desconto."); }

      const updatedCart = [...cart];
      const newItem = { ...updatedCart[editItemIndex], ...editItemData, unitPrice: finalPrice, total: (editItemData.quantity || 0) * (finalPrice || 0) } as SaleItem;
      updatedCart[editItemIndex] = newItem;
      setCart(updatedCart);
      setEditModalOpen(false);
    }
  };

  const openDiscountModal = () => {
    if (isCashierConfirming) return;
    const totalOriginalValue = cart.reduce((acc, item) => acc + (item.quantity * (item.originalPrice || item.unitPrice)), 0);
    const currentSubTotal = subTotal;
    const discountFromItems = totalOriginalValue - currentSubTotal;
    setTempDiscountValue(posDiscount);
    const totalDiscount = discountFromItems + posDiscount;
    const effectivePercent = totalOriginalValue > 0 ? (totalDiscount / totalOriginalValue) * 100 : 0;
    setTempDiscountPercent(effectivePercent);
    setDiscountToken('');
    setDiscountModalOpen(true);
  };

  const handleDiscountValueChange = (val: number) => {
    setTempDiscountValue(val);
    const totalOriginalValue = cart.reduce((acc, item) => acc + (item.quantity * (item.originalPrice || item.unitPrice)), 0);
    const discountFromItems = totalOriginalValue - subTotal;
    const totalDiscount = discountFromItems + val;
    setTempDiscountPercent(totalOriginalValue > 0 ? (totalDiscount / totalOriginalValue) * 100 : 0);
  };

  const handleDiscountPercentChange = (pct: number) => {
    setTempDiscountPercent(pct);
    const totalOriginalValue = cart.reduce((acc, item) => acc + (item.quantity * (item.originalPrice || item.unitPrice)), 0);
    const discountFromItems = totalOriginalValue - subTotal;
    const targetTotalDiscount = (totalOriginalValue * pct) / 100;
    const neededGlobalDiscount = Math.max(0, targetTotalDiscount - discountFromItems);
    setTempDiscountValue(neededGlobalDiscount);
  };
  
  const handleDiscountTotalChange = (totalComDesconto: number) => {
     const totalOriginalValue = cart.reduce((acc, item) => acc + (item.quantity * (item.originalPrice || item.unitPrice)), 0);
     const newGlobalDiscount = Math.max(0, subTotal - totalComDesconto);
     setTempDiscountValue(newGlobalDiscount);
     const discountFromItems = totalOriginalValue - subTotal;
     const totalDiscount = discountFromItems + newGlobalDiscount;
     setTempDiscountPercent(totalOriginalValue > 0 ? (totalDiscount / totalOriginalValue) * 100 : 0);
  };

  const confirmDiscount = () => {
    const totalOriginalValue = cart.reduce((acc, item) => acc + (item.quantity * (item.originalPrice || item.unitPrice)), 0);
    const discountFromItems = totalOriginalValue - subTotal;
    const totalDiscount = discountFromItems + tempDiscountValue;
    const finalPercent = totalOriginalValue > 0 ? (totalDiscount / totalOriginalValue) * 100 : 0;
    if (finalPercent > 6 && discountToken.length < 3) { toast.error(`Desconto total (${finalPercent.toFixed(2)}%) excede 6%. Token obrigatório.`); return; }
    setPosDiscount(tempDiscountValue);
    setDiscountModalOpen(false);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSaleId(sale.id);
    const hydratedItems = sale.items.map(item => ({ ...item, internalId: generateLocalId(), productCode: item.productCode || products.find(p => p.id === item.productId)?.code }));
    setCart(hydratedItems); setPosClient(sale.clientName || ''); setPosDiscount(sale.discount || 0); setPosFreight(sale.freight || 0); setPosOther(sale.otherCosts || 0);
    setPayments(sale.payments || { cash: 0, debit: 0, credit: 0, pix: 0, boleto: 0, creditStore: 0, ticket: 0, transfer: 0, cheque: 0 });
    setCreditInstallments(sale.installments || 1); setObs(sale.observation || ''); setDeliveryAddress(sale.deliveryAddress || ''); setEmail(sale.customerEmail || '');
    setPurchaseOrder(sale.purchaseOrder || ''); setCashierIdent(sale.cashierIdent || ''); setSelectedSellerId(sale.salespersonId || '');
    setActiveTab('new');
  };

  const handleCashierOpenSale = (sale: Sale) => { handleEditSale(sale); setIsCashierConfirming(true); };
  const handleViewSale = (sale: Sale) => { setSaleToView(sale); setViewModalOpen(true); };

  const resetSalesState = () => {
    setEditingSaleId(null); setIsCashierConfirming(false); setCart([]); setPosClient(''); setPosDiscount(0); setPosFreight(0); setPosOther(0);
    setPayments({ cash: 0, debit: 0, credit: 0, pix: 0, boleto: 0, creditStore: 0, ticket: 0, transfer: 0, cheque: 0 });
    setCreditInstallments(1); setObs(''); setDeliveryAddress(''); setEmail(''); setPurchaseOrder(''); setCashierIdent(''); setSearchCode(''); setSelectedProduct(null); setSelectedSellerId('');
  };

  const handleSubmitSale = useCallback(async (asBudget = false) => {
    if (cart.length === 0) { toast.error("Adicione produtos à venda."); return; }
    if (!selectedSellerId) { toast.error("Selecione o vendedor responsável."); return; }
    if (!asBudget) {
      const currentTotalPaid = (Object.values(payments) as number[]).reduce((a, b) => a + b, 0);
      if (totalGeneral > 0) {
        if (currentTotalPaid === 0) { toast.error("Selecione uma forma de pagamento antes de finalizar."); return; }
        if (Math.abs(currentTotalPaid - totalGeneral) > 0.05) {
           const diff = totalGeneral - currentTotalPaid;
           toast.error(`Pagamento divergente! ${diff > 0 ? `Falta R$ ${formatMoney(diff)}` : `Sobra R$ ${formatMoney(Math.abs(diff))}`}.`); return;
        }
      }
    }
    if (!user?.id) { toast.error("Sessão inválida. Faça login novamente."); return; }

    const sellerInfo = sellers.find(s => s.id === selectedSellerId);
    const finalClientName = posClient.trim() === '' ? 'CONSUMIDOR FINAL' : posClient;

    const salePayload: Partial<Sale> = {
      items: cart, sellerId: user.id, sellerName: user.name, salespersonId: selectedSellerId, salespersonName: sellerInfo?.name || 'Desconhecido',
      clientName: finalClientName, discount: posDiscount, freight: posFreight, otherCosts: posOther, payments: payments, installments: creditInstallments,
      totalValue: totalGeneral, observation: obs, deliveryAddress: deliveryAddress, customerEmail: email, purchaseOrder: purchaseOrder, cashierIdent: cashierIdent,
      status: asBudget ? SaleStatus.BUDGET : SaleStatus.PENDING
    };

    try {
      if (editingSaleId) { await updateSale({ ...salePayload, id: editingSaleId }); toast.success(asBudget ? 'Orçamento atualizado!' : 'Venda atualizada!'); } 
      else { await createSale(salePayload); toast.success(asBudget ? 'Orçamento salvo com sucesso!' : 'Venda registrada com sucesso!'); }
      resetSalesState(); refreshData();
      const clientInput = document.getElementById('client-input'); if(clientInput) clientInput.focus();
    } catch (error) { console.error(error); toast.error('Erro ao processar venda.'); }
  }, [cart, user, posClient, posDiscount, posFreight, posOther, payments, creditInstallments, totalGeneral, obs, deliveryAddress, email, purchaseOrder, cashierIdent, editingSaleId, toast, selectedSellerId, sellers]);

  const handleCashierFinalize = async () => {
    if (!editingSaleId || !user?.id) return;
    const paid = (Object.values(payments) as number[]).reduce((a, b) => a + b, 0);
    if (Math.abs(paid - totalGeneral) > 0.05) { toast.error(`Valor incorreto! Falta R$ ${formatMoney(totalGeneral - paid)}`); return; }
    try {
        await updateSale({ id: editingSaleId, payments: payments, installments: creditInstallments, cashierIdent: cashierIdent });
        await completeSale(editingSaleId, user.id, user.name);
        toast.success("Venda recebida e finalizada com sucesso!");
        resetSalesState(); setActiveTab('pending'); refreshData();
    } catch (e: any) { toast.error(e.message); }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'new') return;
      if (e.key === 'F4') { e.preventDefault(); isCashierConfirming ? handleCashierFinalize() : handleSubmitSale(false); }
      if (e.key === 'F8') { e.preventDefault(); if (!isCashierConfirming) handleSubmitSale(true); }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleSubmitSale, isCashierConfirming, handleCashierFinalize]);

  const handlePaymentChange = (key: keyof PaymentDetails, value: number) => {
    const currentFieldValue = payments[key];
    const totalPaidByOthers = (Object.values(payments) as number[]).reduce((acc, val) => acc + val, 0) - currentFieldValue;
    const roomLeft = totalGeneral - totalPaidByOthers;
    if (value > roomLeft + 0.001) { toast.error(`O valor não pode exceder o restante (Máx: R$ ${formatMoney(roomLeft)})`); return; }
    setPayments(prev => ({ ...prev, [key]: value }));
  };

  const handlePaymentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key: keyof PaymentDetails) => {
    if (e.key === 'Enter') { e.preventDefault(); const currentVal = payments[key]; const newValue = currentVal + remaining; handlePaymentChange(key, newValue); }
  };

  const requestCancelSale = (sale: Sale) => { setSaleToCancel(sale); setCancelModalOpen(true); };
  const executeCancelSale = async () => {
    if (!saleToCancel) return;
    try { await cancelSale(saleToCancel.id); toast.success(`Venda #${saleToCancel.id} cancelada com sucesso.`); await refreshData(); setCancelModalOpen(false); setSaleToCancel(null); } 
    catch (e: any) { toast.error("Erro ao cancelar: " + (e.message || "Erro desconhecido")); }
  };

  const filteredProducts = products.filter(p => p.active && (p.name.toLowerCase().includes(searchCode.toLowerCase()) || p.code.toLowerCase().includes(searchCode.toLowerCase())));

  // STYLES
  const tabBaseClass = isModern 
    ? "flex bg-gray-100 dark:bg-[#1a1c29] p-1 rounded-2xl mb-6 shadow-inner"
    : "flex border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 rounded-t-xl transition-colors";

  const getTabClass = (name: string) => {
    if (isModern) {
      const isActive = activeTab === name;
      return `flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center
        ${isActive 
          ? 'bg-white dark:bg-[#6366f1] text-indigo-600 dark:text-white shadow-md' 
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5'
        }`;
    }
    return `px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center 
      ${activeTab === name 
        ? 'border-sky-600 text-sky-700 dark:text-sky-400' 
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`;
  };

  return (
    <div className={`font-sans text-sm pb-10 ${isModern ? '' : 'space-y-4'}`}>
      {/* TABS */}
      <div className={`${tabBaseClass} no-print`}>
        {(isSalesperson || isCashierConfirming) && (
          <button onClick={() => { if(isSalesperson) setActiveTab('new'); }} disabled={!isSalesperson && !isCashierConfirming} className={getTabClass('new')}>
            {editingSaleId ? <Edit2 size={14} className="mr-2"/> : <PlusCircle size={14} className="mr-2"/>}
            {editingSaleId ? (isCashierConfirming ? 'Conferência de Caixa' : 'Editando Venda') : 'Nova Venda (POS)'}
          </button>
        )}
        {isCashier && (
          <button onClick={() => { setActiveTab('pending'); resetSalesState(); }} className={getTabClass('pending')}>
            Frente de Caixa
          </button>
        )}
        <button onClick={() => { setActiveTab('history'); resetSalesState(); }} className={getTabClass('history')}>
          Histórico
        </button>
      </div>

      {/* --- TAB: NEW SALE --- */}
      {activeTab === 'new' && (isSalesperson || isCashierConfirming) && (
        <div className={`${isModern ? 'bg-white dark:bg-[#1a1c29] rounded-3xl p-6 shadow-xl shadow-indigo-500/5' : 'bg-gray-100 dark:bg-slate-900 mt-4'} flex flex-col gap-4 max-w-[1400px] mx-auto transition-colors`}>
          
          {editingSaleId && (
            <div className={`px-4 py-3 rounded border flex justify-between items-center shadow-sm
                ${isCashierConfirming 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800' 
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                } ${isModern ? 'rounded-xl' : ''}
            `}>
              <div className="font-bold flex items-center">
                  {isCashierConfirming ? <CheckCircle size={18} className="mr-2"/> : <Edit2 size={18} className="mr-2"/>}
                  {isCashierConfirming ? `CONFERÊNCIA DE CAIXA - VENDA #${editingSaleId}` : `MODO DE EDIÇÃO - VENDA #${editingSaleId}`}
              </div>
              <button onClick={resetSalesState} className="text-sm underline hover:opacity-80">
                  {isCashierConfirming ? 'Cancelar Conferência' : 'Cancelar Edição'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <div className={`${isModern ? 'rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#121420]' : 'bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700'} overflow-hidden`}>
                <div className={`${isModern ? 'bg-indigo-600 text-white rounded-t-xl' : 'bg-slate-800 dark:bg-slate-950 text-white'} px-3 py-1 text-xs font-bold flex items-center`}>
                   <User size={12} className="mr-2" /> Cliente do pedido
                </div>
                <div className="p-3 flex">
                  <div className={`${isModern ? 'bg-white dark:bg-[#1a1c29] text-gray-400 border border-r-0 border-gray-200 dark:border-white/10' : 'bg-slate-700 dark:bg-slate-900 text-white'} w-10 flex items-center justify-center rounded-l`}>
                    <Search size={14} />
                  </div>
                  <input 
                    id="client-input"
                    type="text" 
                    disabled={isCashierConfirming}
                    placeholder="Digite o nome ou CPF/CNPJ..." 
                    className={`flex-1 px-3 py-2 text-sm focus:outline-none rounded-r uppercase font-medium disabled:opacity-60
                       ${isModern 
                         ? 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1c29] dark:text-white focus:ring-2 focus:ring-indigo-100' 
                         : 'border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white focus:border-sky-500'}`}
                    value={posClient}
                    onChange={e => setPosClient(e.target.value)}
                  />
                </div>
              </div>

              <div className={`${isModern ? 'rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#121420]' : 'bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700'} relative`}>
                <div className={`${isModern ? 'bg-indigo-600 rounded-t-xl' : 'bg-slate-800 dark:bg-slate-950'} text-white px-3 py-2 text-sm font-bold flex items-center justify-between`}>
                  <div className="flex items-center">
                    <PlusCircle size={16} className="mr-2" /> Novo Item
                  </div>
                  <span className="text-xs text-gray-300 font-normal">Item R$ { formatMoney(itemQty * itemPrice) }</span>
                </div>
                
                <div className={`p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end ${isCashierConfirming ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="sm:col-span-5 relative">
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Pesquise o produto</label>
                    <input 
                      ref={searchInputRef}
                      type="text"
                      className={`w-full rounded px-2 py-2 text-sm focus:outline-none font-medium uppercase
                        ${isModern
                           ? 'bg-white dark:bg-[#1a1c29] border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-200 dark:text-white'
                           : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 focus:border-yellow-400 dark:text-yellow-100 placeholder-yellow-800/50'
                        }`}
                      placeholder="Pesquise aqui o produto a ser vendido"
                      value={searchCode}
                      onChange={e => handleProductSearch(e.target.value)}
                      onFocus={() => searchCode && setShowSearchResults(true)}
                      onBlur={handleBlurSearch}
                      autoComplete="off"
                      disabled={isCashierConfirming}
                    />
                    {showSearchResults && filteredProducts.length > 0 && (
                      <div className="absolute z-50 left-0 top-full mt-1 w-[150%] bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 shadow-xl rounded-md max-h-64 overflow-y-auto">
                        {filteredProducts.map(product => (
                          <div 
                            key={product.id}
                            onMouseDown={() => selectProduct(product)}
                            className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-gray-800 dark:text-gray-200 text-xs uppercase">{product.name}</span>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">R$ {formatMoney(product.price)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
                              <span>Cód: {product.code}</span>
                              <span>Estoque: {product.stock} {product.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">R$ Unitário</label>
                    <input 
                      type="text" 
                      className={`w-full rounded px-2 py-2 text-sm text-right font-bold
                         ${isModern ? 'bg-white dark:bg-[#1a1c29] border border-gray-200 dark:border-white/10 dark:text-white' : 'bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'}`}
                      value={formatMoney(itemPrice)}
                      readOnly
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Quantidade</label>
                    <input 
                      type="number" 
                      min="1"
                      className={`w-full rounded px-2 py-2 text-sm text-center font-bold 
                        ${isModern ? 'bg-white dark:bg-[#1a1c29] border border-gray-200 dark:border-white/10 dark:text-white' : 'border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white'}`}
                      value={itemQty}
                      onChange={e => setItemQty(parseInt(e.target.value) || 1)}
                      disabled={isCashierConfirming}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">R$ Total</label>
                    <input 
                      type="text" 
                      className={`w-full rounded px-2 py-2 text-sm text-right font-bold 
                        ${isModern ? 'bg-white dark:bg-[#1a1c29] border border-gray-200 dark:border-white/10 dark:text-white' : 'bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'}`}
                      value={formatMoney(itemPrice * itemQty)}
                      readOnly
                    />
                  </div>
                  <div className="sm:col-span-1">
                     <button 
                      onClick={handleAddItem}
                      disabled={isCashierConfirming}
                      className={`w-full font-bold py-2 rounded flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                         ${isModern ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-amber-400 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-900 dark:text-white'}`}
                     >
                       <Check size={20} />
                     </button>
                  </div>
                </div>
              </div>

              <div className={`${isModern ? 'rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a1c29]' : 'bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700'} overflow-hidden min-h-[200px]`}>
                <table className="w-full text-left text-xs">
                  <thead className={`${isModern ? 'bg-gray-50 dark:bg-[#121420]' : 'bg-gray-50 dark:bg-slate-700'} border-b border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300`}>
                    <tr>
                      <th className="px-3 py-2 font-semibold w-2/3">Descrição do produto</th>
                      <th className="px-3 py-2 font-semibold text-center">Qtde</th>
                      <th className="px-3 py-2 font-semibold text-center">Unid</th>
                      <th className="px-3 py-2 font-semibold text-right">Vlr Unit</th>
                      <th className="px-3 py-2 font-semibold text-right">Total</th>
                      <th className="px-3 py-2 text-center w-20">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isModern ? 'divide-gray-50 dark:divide-white/5' : 'divide-gray-100 dark:divide-slate-700'}`}>
                    {cart.map((item, idx) => (
                      <tr key={item.internalId || idx} className={`${isModern ? 'hover:bg-gray-50 dark:hover:bg-white/5' : 'hover:bg-blue-50 dark:hover:bg-slate-700/50'} group transition-colors`}>
                        <td className="px-3 py-2">
                          <div className="font-bold text-gray-700 dark:text-gray-200 uppercase">{item.productName}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500">
                             {item.productCode || item.productId} {item.observation && `- ${item.observation}`}
                          </div>
                        </td>
                        <td className={`px-3 py-2 text-center font-bold ${isModern ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>{item.quantity}</td>
                        <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">{item.unit || 'UNID'}</td>
                        <td className="px-3 py-2 text-right dark:text-gray-300">{formatMoney(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-200">{formatMoney(item.total)}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center space-x-1">
                             <button 
                                onClick={() => { if (isCashierConfirming) return; if (posDiscount > 0) { toast.info("Remova o desconto global para editar itens."); return; } openEditModal(idx); }}
                                disabled={isCashierConfirming || posDiscount > 0}
                                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                             >
                              <Edit2 size={14} />
                             </button>
                             <button 
                                onClick={() => handleRemoveItem(idx)} 
                                disabled={isCashierConfirming}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                             >
                              <Trash2 size={14} />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-300 dark:text-gray-600 italic">
                          Nenhum item adicionado ao carrinho.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* TOTALS ROW */}
              <div className={`${isModern ? 'rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#121420]' : 'bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700'} p-3`}>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {['R$ Produtos', 'R$ Descontos', 'R$ Outros', 'R$ Frete', 'R$ Total'].map((label, i) => {
                     const isTotal = i === 4;
                     const isDiscount = i === 1;
                     let val = i === 0 ? subTotal : i === 2 ? posOther : i === 3 ? posFreight : totalGeneral;
                     if(isDiscount) val = posDiscount;

                     return (
                        <div key={label}>
                            <label className={`text-[10px] uppercase block ${isTotal ? 'font-bold text-gray-700 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{label}</label>
                            {isDiscount ? (
                                <div className="flex">
                                    <input 
                                      type="text" 
                                      readOnly 
                                      value={formatMoney(posDiscount)} 
                                      className={`w-full px-2 py-1 text-sm text-right outline-none
                                        ${isModern 
                                            ? 'rounded-l-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1c29] dark:text-white border-r-0' 
                                            : 'rounded-l border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white'}
                                      `} 
                                    />
                                    <button 
                                      onClick={openDiscountModal} 
                                      disabled={isCashierConfirming} 
                                      className={`px-2 flex items-center justify-center disabled:opacity-50 transition-colors
                                        ${isModern 
                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                                            : 'bg-slate-600 hover:bg-slate-700 text-white'}
                                      `}
                                    >
                                      <Lock size={12} />
                                    </button>
                                    <button 
                                      onClick={() => setPosDiscount(0)} 
                                      disabled={isCashierConfirming} 
                                      className={`px-2 rounded-r flex items-center justify-center disabled:opacity-50 transition-colors
                                         ${isModern 
                                            ? 'bg-indigo-500 hover:bg-indigo-600 text-white rounded-r-lg' 
                                            : 'bg-slate-500 hover:bg-slate-600 text-white rounded-r'}
                                      `}
                                    >
                                      <XCircle size={12} />
                                    </button>
                                </div>
                            ) : (
                                <input 
                                    type="text" 
                                    readOnly={isTotal || i === 0}
                                    value={formatMoney(val)} 
                                    onChange={e => {
                                        const v = parseMoney(e.target.value);
                                        if(i===2) setPosOther(v); if(i===3) setPosFreight(v);
                                    }}
                                    disabled={isCashierConfirming && !isTotal && i !== 0}
                                    className={`w-full px-2 py-1 text-sm text-right outline-none
                                        ${isModern 
                                            ? `rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1c29] dark:text-white ${isTotal ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}`
                                            : `rounded border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white ${isTotal ? 'font-bold' : ''}`
                                        }
                                    `} 
                                />
                            )}
                        </div>
                     )
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              <div className={`${isModern ? 'bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-xl shadow-indigo-500/20' : 'bg-sky-500 dark:bg-sky-600 rounded shadow-md'} text-white p-5 relative overflow-hidden flex flex-col justify-center`}>
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <CheckCircle size={64} />
                </div>
                <h3 className="text-xs font-bold uppercase mb-1 flex items-center">
                  <Check size={14} className="mr-1" /> Total Geral
                </h3>
                <div className="text-4xl font-bold tracking-tight z-10">
                  R$ {formatMoney(totalGeneral)}
                </div>
              </div>

              <div className={`${isModern ? 'bg-gray-50 dark:bg-[#121420] border border-gray-100 dark:border-white/5 rounded-2xl' : 'bg-gray-100 dark:bg-slate-900 rounded shadow-inner border border-gray-200 dark:border-slate-700'} p-4`}>
                <div className="flex justify-between items-center mb-3 border-b border-gray-200 dark:border-white/10 pb-1">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center uppercase">
                    <CreditCard size={12} className="mr-1" /> Pagamentos
                  </h4>
                  <span className={`text-xs font-bold ${remaining > 0.01 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    TOTAL RESTANTE R$ {formatMoney(remaining)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'cash', label: 'Dinheiro' }, { key: 'debit', label: 'Cart/Débito' },
                    { key: 'credit', label: 'Cart/Crédito' }, { key: 'pix', label: 'PIX' },
                    { key: 'boleto', label: 'Boleto' }, { key: 'creditStore', label: 'Crédito/Loja' }
                  ].map((field) => (
                      <div key={field.key} className={field.key === 'creditStore' ? 'col-span-1' : ''}>
                         <label className="text-[10px] text-gray-500 dark:text-gray-400 block">{field.label}</label>
                         <div className="flex">
                            <input 
                                type="text" 
                                className={`w-full px-2 py-1 text-sm text-right outline-none
                                    ${isModern 
                                        ? `rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1c29] dark:text-white focus:border-indigo-500 ${field.key === 'credit' ? 'rounded-r-none border-r-0' : ''}` 
                                        : `rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white ${field.key === 'credit' ? 'rounded-r-none' : ''}`
                                    }
                                `}
                                placeholder="0,00"
                                value={payments[field.key as keyof PaymentDetails] ? formatMoney(payments[field.key as keyof PaymentDetails]) : ''}
                                onChange={e => handlePaymentChange(field.key as keyof PaymentDetails, parseMoney(e.target.value))}
                                onKeyDown={e => handlePaymentKeyDown(e, field.key as keyof PaymentDetails)}
                            />
                            {field.key === 'credit' && (
                                <select 
                                    value={creditInstallments}
                                    onChange={(e) => setCreditInstallments(parseInt(e.target.value))}
                                    disabled={posDiscount > 0}
                                    className={`text-[10px] px-1 text-gray-500 dark:text-gray-300 disabled:opacity-50
                                        ${isModern 
                                            ? 'rounded-r-lg bg-gray-100 dark:bg-[#0b0c15] border border-gray-200 dark:border-white/10 border-l-0' 
                                            : 'rounded-r bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 border-l-0'}
                                    `}
                                >
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}X</option>)}
                                </select>
                            )}
                         </div>
                      </div>
                  ))}
                </div>
              </div>

              {/* Extras (Info, Address) */}
              {[
                { icon: FileText, title: "Informações complementares", content: (
                    <>
                        <textarea className={`w-full rounded p-2 text-xs h-14 resize-none mb-2 outline-none disabled:opacity-60 ${isModern ? 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1c29] dark:text-white focus:border-indigo-500 rounded-xl' : 'border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white'}`} placeholder="Digite as informações complementares (NF-e)" value={obs} onChange={e => setObs(e.target.value)} disabled={isCashierConfirming}></textarea>
                        <input type="email" placeholder="E-mail para envio do pedido de venda e NF-e" className={`w-full rounded px-2 py-1 text-xs disabled:opacity-60 ${isModern ? 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1c29] dark:text-white rounded-lg' : 'border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white'}`} value={email} onChange={e => setEmail(e.target.value)} disabled={isCashierConfirming} />
                    </>
                )},
                { icon: MapPin, title: "Endereço de entrega", content: (
                     <div className={`p-3 text-center border border-dashed ${isModern ? 'bg-white dark:bg-[#1a1c29] border-gray-300 dark:border-white/20 rounded-xl' : 'bg-gray-50 dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 rounded'}`}>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold block">SITUAÇÃO: CLIENTE RETIRA NA LOJA</span>
                        <button disabled={isCashierConfirming} className="text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 mt-1 flex items-center justify-center w-full disabled:text-gray-400 disabled:cursor-not-allowed" onClick={() => { const addr = prompt("Digite o endereço de entrega:"); if(addr) setDeliveryAddress(addr); }}>
                            <PlusCircle size={12} className="mr-1" /> {deliveryAddress ? 'Alterar endereço' : 'Adicionar endereço de entrega'}
                        </button>
                        {deliveryAddress && <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 break-words">{deliveryAddress}</div>}
                     </div>
                )}
              ].map((box, i) => (
                  <div key={i} className={`${isModern ? 'bg-gray-50 dark:bg-[#121420] border border-gray-100 dark:border-white/5 rounded-2xl' : 'bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700'} p-3`}>
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center"><box.icon size={12} className="mr-1"/> {box.title}</h4>
                    {box.content}
                  </div>
              ))}

            </div>
          </div>

          {/* Footer Inputs (Cashier ID, PO, Seller) */}
          <div className={`${isModern ? 'bg-gray-50 dark:bg-[#121420] border border-gray-100 dark:border-white/5 rounded-2xl' : 'bg-white dark:bg-slate-800 rounded shadow-sm border border-gray-200 dark:border-slate-700'} p-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-end`}>
             {[
                { label: "Nome de identificação no caixa", val: cashierIdent, set: setCashierIdent, ph: "Nome no caixa" },
                { label: "Pedido de compra", val: purchaseOrder, set: setPurchaseOrder, ph: "" }
             ].map((inp, i) => (
                <div key={i}>
                    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block uppercase">{inp.label}</label>
                    <input className={`w-full rounded px-2 py-2 text-sm disabled:opacity-60 ${isModern ? 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1c29] dark:text-white rounded-xl' : 'border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white'}`} placeholder={inp.ph} value={inp.val} onChange={e => inp.set(e.target.value)} disabled={isCashierConfirming && i > 0} />
                </div>
             ))}
             <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block uppercase">Vendedor</label>
              <div className="w-full relative">
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400"><Briefcase size={14} /></div>
                 <select value={selectedSellerId} onChange={(e) => setSelectedSellerId(e.target.value)} disabled={isCashierConfirming} className={`w-full rounded px-2 py-2 text-sm uppercase appearance-none focus:outline-none disabled:opacity-60 ${isModern ? 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1c29] text-gray-700 dark:text-white rounded-xl' : 'border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-white'}`}>
                    <option value="" disabled>Selecione o vendedor...</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-2">
            {!isCashierConfirming ? (
                <>
                    <button onClick={() => handleSubmitSale(true)} className={`${isModern ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 rounded-xl' : 'bg-slate-500 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded'} font-bold py-3 px-6 shadow uppercase text-sm w-full md:w-auto`}>
                        F8 - {editingSaleId ? 'Atualizar Orçamento' : 'Finalizar como Orçamento'}
                    </button>
                    <button onClick={() => handleSubmitSale(false)} className={`${isModern ? 'bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl' : 'bg-amber-400 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-900 dark:text-white rounded'} font-bold py-3 px-6 shadow uppercase text-sm w-full md:w-auto`}>
                        F4 - {editingSaleId ? 'Atualizar Venda' : 'Finalizar Pedido de Venda'}
                    </button>
                </>
            ) : (
                <button onClick={handleCashierFinalize} className={`${isModern ? 'bg-emerald-600 hover:bg-emerald-700 rounded-xl' : 'bg-green-600 hover:bg-green-700 rounded'} text-white font-bold py-3 px-8 shadow uppercase text-sm w-full md:w-auto flex items-center justify-center animate-pulse`}>
                  <CheckCircle size={18} className="mr-2"/> F4 - Confirmar Pagamento e Baixar
                </button>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: PENDING (CASHIER) --- */}
      {activeTab === 'pending' && isCashier && (
        <div className="grid gap-4 max-w-5xl mx-auto mt-6">
          {sales.filter(s => s.status === SaleStatus.PENDING).length === 0 && (
             <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
               <Clock size={48} className="mx-auto text-gray-200 dark:text-gray-600 mb-4" />
               <p className="text-gray-500 dark:text-gray-400">Nenhuma venda pendente para processar.</p>
             </div>
          )}
          {sales.filter(s => s.status === SaleStatus.PENDING).map(sale => (
            <div key={sale.id} className={`${isModern ? 'bg-white dark:bg-[#1a1c29] border border-gray-100 dark:border-white/5 shadow-lg shadow-indigo-500/5 rounded-2xl' : 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-orange-100 dark:border-orange-900/30'} p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors`}>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`${isModern ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'} text-xs px-2 py-1 rounded-full font-bold`}>PENDENTE</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(sale.createdAt).toLocaleString()}</span>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{sale.clientName || 'Cliente não identificado'}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center"><Briefcase size={12} className="mr-1" /> Vendedor: <strong className="ml-1 text-gray-700 dark:text-gray-300">{sale.salespersonName || sale.sellerName}</strong></div>
                <div className="space-y-1 bg-gray-50 dark:bg-slate-700/50 p-3 rounded text-sm">
                  {sale.items.slice(0, 3).map((item, idx) => (
                    <div key={item.internalId || idx} className="flex justify-between border-b border-gray-100 dark:border-slate-600 last:border-0 pb-1 last:pb-0 text-gray-700 dark:text-gray-300">
                      <span>{item.quantity} {item.unit} x {item.productName}</span><span className="text-gray-600 dark:text-gray-400 font-mono">R$ {formatMoney(item.total)}</span>
                    </div>
                  ))}
                  {sale.items.length > 3 && <div className="text-xs text-gray-500 dark:text-gray-400 italic pt-1">+ {sale.items.length - 3} itens...</div>}
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-3 min-w-[200px]">
                <div className="text-2xl font-bold text-gray-800 dark:text-white">R$ {formatMoney(sale.totalValue)}</div>
                <button onClick={() => handleCashierOpenSale(sale)} className={`w-full ${isModern ? 'bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20' : 'bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm'} text-white px-6 py-3 flex items-center justify-center font-bold transition-transform active:scale-95`}>
                  <ArrowRight size={18} className="mr-2" /> ABRIR E CONFERIR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- TAB: HISTORY --- */}
      {activeTab === 'history' && (
        <div className={`${isModern ? 'bg-white dark:bg-[#1a1c29] border border-gray-100 dark:border-white/5 shadow-lg shadow-indigo-500/5 rounded-3xl' : 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700'} overflow-hidden max-w-6xl mx-auto mt-6`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`${isModern ? 'bg-gray-50 dark:bg-[#121420]' : 'bg-gray-50 dark:bg-slate-700'} border-b border-gray-100 dark:border-slate-600`}>
                <tr>
                  {['ID / Data', 'Cliente', 'Vendedor', 'Status', 'Total', 'Ações'].map((h, i) => (
                      <th key={i} className={`px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4"><div className="text-xs font-mono text-gray-500 dark:text-gray-400">#{sale.id.slice(0, 8)}</div><div className="text-sm text-gray-900 dark:text-white">{new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{sale.clientName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{sale.salespersonName || sale.sellerName}</td>
                    <td className="px-6 py-4">
                      {sale.status === SaleStatus.COMPLETED && <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isModern ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'}`}><CheckCircle size={12} className="mr-1"/> Concluída</span>}
                      {sale.status === SaleStatus.PENDING && <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isModern ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'}`}><Clock size={12} className="mr-1"/> Pendente</span>}
                      {sale.status === SaleStatus.BUDGET && <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isModern ? 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300'}`}><FileText size={12} className="mr-1"/> Orçamento</span>}
                      {sale.status === SaleStatus.CANCELLED && <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isModern ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'}`}><XCircle size={12} className="mr-1"/> Cancelada</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">R$ {formatMoney(sale.totalValue)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {isSalesperson && sale.status !== SaleStatus.COMPLETED && sale.status !== SaleStatus.CANCELLED && (
                        <button onClick={() => handleEditSale(sale)} title="Editar Venda" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 size={18} /></button>
                      )}
                      {isManager && sale.status !== SaleStatus.CANCELLED && (
                        <button onClick={() => requestCancelSale(sale)} title="Cancelar Venda" className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><XCircle size={18} /></button>
                      )}
                      <button onClick={() => handleViewSale(sale)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Ver Detalhes"><Eye size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODALS --- (Kept structure mostly same, just slight container tweaks if needed for consistency) */}
      {/* ... (Modals remain functionally identical, just inheriting theme colors) ... */}
      
      {/* Only showing minimal modal update for context */}
      {editModalOpen && editItemData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className={`bg-white dark:bg-slate-800 ${isModern ? 'rounded-2xl' : 'rounded-lg'} shadow-xl w-full max-w-md overflow-hidden border dark:border-slate-700`}>
              {/* ... Content ... */}
               <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                  <h3 className="font-bold text-gray-800 dark:text-white uppercase">{editItemData.productName}</h3>
               </div>
               <div className="p-6 space-y-4">
                  {/* ... Inputs ... */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">R$ Unitário</label>
                      <input type="text" className="w-full border border-gray-300 dark:border-slate-600 rounded p-2 text-right bg-white dark:bg-slate-700 dark:text-white" value={editItemData.unitPrice ? formatMoney(editItemData.unitPrice) : ''} onChange={e => setEditItemData({...editItemData, unitPrice: parseMoney(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Quantidade</label>
                      <input type="number" className="w-full border border-blue-300 ring-1 ring-blue-200 dark:border-blue-900 dark:ring-blue-900 rounded p-2 text-blue-600 dark:text-blue-400 font-bold text-center bg-white dark:bg-slate-700" value={editItemData.quantity} onChange={e => setEditItemData({...editItemData, quantity: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Observação do item vendido</label>
                    <input className="w-full border border-gray-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-white" placeholder="Máximo de 80 caracteres" maxLength={80} value={editItemData.observation || ''} onChange={e => setEditItemData({...editItemData, observation: e.target.value})} />
                  </div>
                  <div className="border-t dark:border-slate-700 pt-4">
                    <div className="text-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total R$</span>
                      <div className="text-2xl font-bold text-gray-800 dark:text-white">{formatMoney((editItemData.unitPrice || 0) * (editItemData.quantity || 0))}</div>
                    </div>
                  </div>
                  <button onClick={saveEditItem} className="w-full bg-amber-400 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-900 dark:text-white font-bold py-3 rounded uppercase text-sm">Confirmar</button>
               </div>
           </div>
        </div>
      )}
      
      {/* (Other modals - Discount, Cancel, View - omitted to save space as logic is identical, just inherited styles apply) */}
      {/* ... */}
      {discountModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className={`bg-white dark:bg-slate-800 ${isModern ? 'rounded-2xl' : 'rounded-lg'} shadow-xl w-full max-w-md overflow-hidden border dark:border-slate-700`}>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 dark:text-white text-sm uppercase flex items-center"><DollarSign size={16} className="mr-1" /> Desconto Pré-Autorizado</h3>
                <button onClick={() => setDiscountModalOpen(false)}><X size={20} className="text-gray-400 dark:text-gray-300" /></button>
              </div>
              <div className="p-6">
                 {/* ... Inputs ... */}
                 <div className="flex justify-between mb-6 text-sm">
                    <div className="space-y-1">
                      <div className="text-gray-500 dark:text-gray-400">PRODUTOS (ATUAL) <span className="text-gray-800 dark:text-white font-bold">R$ {formatMoney(subTotal)}</span></div>
                      <div className="text-gray-500 dark:text-gray-400">DESC. GLOBAL <span className="text-red-600 dark:text-red-400 font-bold">R$ {formatMoney(tempDiscountValue)}</span></div>
                      <div className="text-gray-800 dark:text-white font-bold pt-2 border-t dark:border-slate-700">A PAGAR R$ {formatMoney(subTotal - tempDiscountValue)}</div>
                      <div className="text-xs text-blue-500 dark:text-blue-400 pt-1">% Total s/ Orig: {tempDiscountPercent.toFixed(2)}%</div>
                    </div>
                    <div className="space-y-3 w-32">
                       <div><label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">→ DESCONTO GLOBAL R$</label><input type="text" className="w-full border border-gray-300 dark:border-slate-600 rounded p-1 text-right text-sm bg-white dark:bg-slate-700 dark:text-white" value={formatMoney(tempDiscountValue)} onChange={e => handleDiscountValueChange(parseMoney(e.target.value))} /></div>
                       <div><label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">→ % TOTAL (Item+Global)</label><input type="number" className="w-full border border-gray-300 dark:border-slate-600 rounded p-1 text-right text-sm bg-white dark:bg-slate-700 dark:text-white" value={tempDiscountPercent.toFixed(2)} onChange={e => handleDiscountPercentChange(parseFloat(e.target.value)||0)} /></div>
                       <div><label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">→ TOTAL C/ DESC R$</label><input type="text" className="w-full border border-gray-300 dark:border-slate-600 rounded p-1 text-right text-sm font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700" value={formatMoney(subTotal - tempDiscountValue)} onChange={e => handleDiscountTotalChange(parseMoney(e.target.value))} /></div>
                    </div>
                 </div>
                 { (tempDiscountPercent > 6) && (
                   <div className="mb-6 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-900/30">
                      <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1">Token Gerencial Obrigatório (&gt; 6%)</label>
                      <input type="password" className="w-full border border-gray-300 dark:border-slate-600 rounded p-2 text-center bg-white dark:bg-slate-700 dark:text-white" placeholder="******" value={discountToken} onChange={e => setDiscountToken(e.target.value)} />
                   </div>
                 )}
                 <div className="space-y-2">
                    <button onClick={confirmDiscount} className="w-full bg-amber-400 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-900 dark:text-white font-bold py-2 rounded uppercase text-sm flex items-center justify-center"><Check size={16} className="mr-2" /> Confirmar Desconto</button>
                    <button onClick={() => setDiscountModalOpen(false)} className="w-full bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold py-2 rounded uppercase text-sm">Cancelar</button>
                 </div>
              </div>
           </div>
         </div>
      )}
      
      {/* Cancel and View Modals follow same pattern (code omitted for brevity but logic persists) */}
      {cancelModalOpen && saleToCancel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={`bg-white dark:bg-slate-800 ${isModern ? 'rounded-2xl' : 'rounded-lg'} shadow-xl w-full max-w-md overflow-hidden border dark:border-slate-700 animate-in zoom-in duration-200`}>
                <div className="p-6 text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Cancelar Venda #{saleToCancel.id.slice(0,8)}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Tem certeza que deseja cancelar esta venda? <br/>{saleToCancel.status === SaleStatus.COMPLETED && <span className="font-bold text-red-600 dark:text-red-400 block mt-2">ATENÇÃO: O estoque dos produtos será estornado!</span>}</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setCancelModalOpen(false)} className="bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white font-bold py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">Voltar</button>
                        <button onClick={executeCancelSale} className="bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors shadow-md">Confirmar Cancelamento</button>
                    </div>
                </div>
            </div>
          </div>
      )}

      {viewModalOpen && saleToView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`bg-white dark:bg-slate-800 ${isModern ? 'rounded-2xl' : 'rounded-xl'} shadow-xl w-full max-w-2xl overflow-hidden border dark:border-slate-700 flex flex-col max-h-[90vh]`}>
            {/* View Modal Content */}
             <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
              <div>
                 <h3 className="font-bold text-gray-800 dark:text-white text-lg">Detalhes da Venda #{saleToView.id.slice(0,8)}</h3>
                 <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>Data: {new Date(saleToView.createdAt).toLocaleString()}</div>
                    <div>Vendedor: <span className="text-gray-700 dark:text-gray-300 font-bold">{saleToView.salespersonName || saleToView.sellerName}</span></div>
                 </div>
              </div>
              <button onClick={() => setViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Header */}
              <div className="flex justify-between items-center bg-gray-100 dark:bg-slate-700/50 p-3 rounded-lg">
                 <div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</div>
                    {saleToView.status === SaleStatus.COMPLETED && <span className="text-green-600 dark:text-green-400 font-bold flex items-center"><CheckCircle size={14} className="mr-1"/> CONCLUÍDA</span>}
                    {saleToView.status === SaleStatus.PENDING && <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center"><Clock size={14} className="mr-1"/> PENDENTE</span>}
                    {saleToView.status === SaleStatus.BUDGET && <span className="text-gray-600 dark:text-gray-400 font-bold flex items-center"><FileText size={14} className="mr-1"/> ORÇAMENTO</span>}
                    {saleToView.status === SaleStatus.CANCELLED && <span className="text-red-600 dark:text-red-400 font-bold flex items-center"><XCircle size={14} className="mr-1"/> CANCELADA</span>}
                 </div>
                 <div className="text-right">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total Geral</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">R$ {formatMoney(saleToView.totalValue)}</div>
                 </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 text-sm flex items-center"><Check size={14} className="mr-1"/> Itens do Pedido</h4>
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
                      <tr><th className="px-4 py-2">Produto</th><th className="px-4 py-2 text-center">Qtde</th><th className="px-4 py-2 text-right">Vlr Unit</th><th className="px-4 py-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                      {saleToView.items.map((item, i) => (
                        <tr key={i}><td className="px-4 py-2"><div className="font-medium text-gray-800 dark:text-gray-200">{item.productName}</div>{item.observation && <div className="text-xs text-gray-400 italic">{item.observation}</div>}</td><td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">{item.quantity} {item.unit}</td><td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{formatMoney(item.unitPrice)}</td><td className="px-4 py-2 text-right font-medium text-gray-800 dark:text-gray-200">{formatMoney(item.total)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financials & Payments Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 text-sm flex items-center"><CreditCard size={14} className="mr-1"/> Pagamentos</h4>
                    <div className="bg-gray-50 dark:bg-slate-700/30 p-3 rounded text-sm space-y-1">
                      {saleToView.payments && Object.entries(saleToView.payments).map(([key, value]) => {
                         if ((value as number) > 0) {
                           return (
                             <div key={key} className="flex justify-between text-gray-700 dark:text-gray-300">
                               <div className="flex items-center"><span className="uppercase text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">{key}</span>{key === 'credit' && saleToView.installments && saleToView.installments > 1 && (<span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">{saleToView.installments}x</span>)}</div><span>R$ {formatMoney(value as number)}</span>
                             </div>
                           )
                         }
                         return null;
                      })}
                    </div>
                 </div>

                 <div>
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2 text-sm flex items-center"><DollarSign size={14} className="mr-1"/> Resumo Financeiro</h4>
                    <div className="space-y-1 text-sm">
                       <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal Itens:</span><span>R$ {formatMoney(saleToView.items.reduce((acc, i) => acc + i.total, 0))}</span></div>
                       {saleToView.discount ? (<div className="flex justify-between text-red-600 dark:text-red-400"><span>Descontos:</span><span>- R$ {formatMoney(saleToView.discount)}</span></div>) : null}
                       <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-700 pt-2 mt-2 text-base"><span>Total Geral:</span><span>R$ {formatMoney(saleToView.totalValue)}</span></div>
                    </div>
                 </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex justify-end">
               <button onClick={() => setViewModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white font-bold py-2 px-6 rounded transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};