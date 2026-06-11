"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronDown, ThumbsUp, ThumbsDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useViewport } from "@/hooks/useViewport";

// Helper: convert YYYY-MM-DD -> DD/MM/AAAA
const toDisplayDate = (isoDate: string): string => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
};

// Helper: convert DD/MM/AAAA -> YYYY-MM-DD
const toISODate = (displayDate: string): string => {
  if (!displayDate) return "";
  const [d, m, y] = displayDate.split("/");
  if (!d || !m || !y || y.length < 4) return "";
  return `${y}-${m}-${d}`;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAY_NAMES = ["D", "S", "T", "Q", "Q", "S", "S"];

const generateCalendarDays = (year: number, month: number) => {
  const days = [];
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month,
      year,
      isCurrentMonth: true,
    });
  }
  
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }
  
  return days;
};

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
}

interface Account {
  id: string;
  name: string;
  type: "cash" | "bank" | "credit_card";
  entity_id?: string;
}

interface Entity {
  id: string;
  name: string;
  type: "personal" | "business";
}

interface QuickInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "income" | "expense";
  categories: Category[];
  accounts: Account[];
  entities: Entity[];
  onSave: (data: {
    amount_cents: number;
    category_id: string;
    account_id: string;
    description: string;
    date: string;
    recurrence_type: "single" | "fixed" | "installment";
    installments_total?: number;
    interval?: "weekly" | "monthly" | "yearly";
    cleared?: boolean;
    entity_id: string;
    notes?: string;
  }, editScope?: "single" | "future" | "all") => void;
  onAddCategory?: (category: Omit<Category, "id">) => void;
  editingTransaction?: any;
  defaultEntityId?: string;
}

export default function QuickInsertModal({
  isOpen,
  onClose,
  type,
  categories,
  accounts,
  entities,
  onSave,
  onAddCategory,
  editingTransaction,
  defaultEntityId,
}: QuickInsertModalProps) {
  const visibleHeight = useViewport();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("ent-1");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isCleared, setIsCleared] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [recurrenceType, setRecurrenceType] = useState<"single" | "fixed" | "installment">("single");
  const [interval, setInterval] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [installmentsTotal, setInstallmentsTotal] = useState<number>(3);
  const [isRecurrenceTypeDropdownOpen, setIsRecurrenceTypeDropdownOpen] = useState(false);
  const [isIntervalDropdownOpen, setIsIntervalDropdownOpen] = useState(false);

  const [dateInputVal, setDateInputVal] = useState("");
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendarPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (showCalendarPopover) {
      const iso = toISODate(dateInputVal);
      if (iso) {
        const parsed = new Date(iso);
        if (!isNaN(parsed.getTime())) {
          const [y, m, d] = iso.split("-").map(Number);
          setCurrentCalendarDate(new Date(y, m - 1, d));
        }
      }
    }
  }, [showCalendarPopover, dateInputVal]);

  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      return new Date(year, month - 1, 1);
    });
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      return new Date(year, month + 1, 1);
    });
  };

  const handleSelectDay = (dayObj: { day: number; month: number; year: number }) => {
    const formattedDay = String(dayObj.day).padStart(2, "0");
    const formattedMonth = String(dayObj.month + 1).padStart(2, "0");
    setDateInputVal(`${formattedDay}/${formattedMonth}/${dayObj.year}`);
    setShowCalendarPopover(false);
  };

  const isDaySelected = (dayObj: { day: number; month: number; year: number }) => {
    const iso = toISODate(dateInputVal);
    if (!iso) return false;
    const [y, m, d] = iso.split("-").map(Number);
    return dayObj.day === d && (dayObj.month + 1) === m && dayObj.year === y;
  };

  const isDayToday = (dayObj: { day: number; month: number; year: number }) => {
    const today = new Date();
    return (
      dayObj.day === today.getDate() &&
      dayObj.month === today.getMonth() &&
      dayObj.year === today.getFullYear()
    );
  };

  const calendarDays = generateCalendarDays(
    currentCalendarDate.getFullYear(),
    currentCalendarDate.getMonth()
  );

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.substring(0, 8);
    
    let formatted = "";
    if (value.length > 0) {
      formatted += value.substring(0, 2);
    }
    if (value.length > 2) {
      formatted += "/" + value.substring(2, 4);
    }
    if (value.length > 4) {
      formatted += "/" + value.substring(4, 8);
    }
    setDateInputVal(formatted);
  };

  const toggleRecurrenceTypeDropdown = () => {
    setIsRecurrenceTypeDropdownOpen(!isRecurrenceTypeDropdownOpen);
    setIsDropdownOpen(false);
    setIsAccountDropdownOpen(false);
    setIsEntityDropdownOpen(false);
    setIsIntervalDropdownOpen(false);
  };

  const toggleIntervalDropdown = () => {
    setIsIntervalDropdownOpen(!isIntervalDropdownOpen);
    setIsDropdownOpen(false);
    setIsAccountDropdownOpen(false);
    setIsEntityDropdownOpen(false);
    setIsRecurrenceTypeDropdownOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkSize = () => setIsDesktop(window.innerWidth >= 768);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  const toggleCategoryDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    setIsAccountDropdownOpen(false);
    setIsEntityDropdownOpen(false);
  };

  const toggleAccountDropdown = () => {
    setIsAccountDropdownOpen(!isAccountDropdownOpen);
    setIsDropdownOpen(false);
    setIsEntityDropdownOpen(false);
  };

  const toggleEntityDropdown = () => {
    setIsEntityDropdownOpen(!isEntityDropdownOpen);
    setIsDropdownOpen(false);
    setIsAccountDropdownOpen(false);
  };

  // Filtrar categorias pelo tipo (despesa ou receita)
  const filteredCategories = categories.filter((cat) => cat.type === type);

  // Resetar estados quando abrir ou ao carregar para edição
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        let initialAmount = editingTransaction.amount_cents;
        if (editingTransaction.recurrence_type === "installment") {
          const totalInst = editingTransaction.installments_total || 1;
          initialAmount = initialAmount * totalInst;
        }
        
        setInputValue(initialAmount.toString());
        setDescription(editingTransaction.description || "");
        setNotes(editingTransaction.notes || "");
        setIsCleared(editingTransaction.cleared ?? false);
        setRecurrenceType(editingTransaction.recurrence_type || "single");
        setInterval(editingTransaction.interval || "monthly");
        setInstallmentsTotal(editingTransaction.installments_total || 3);
        setDateInputVal(toDisplayDate(editingTransaction.date));
        
        setSelectedAccountId(editingTransaction.account_id);
        const initialEntityId = editingTransaction.entity_id || (defaultEntityId && defaultEntityId !== "all" ? defaultEntityId : (entities[0]?.id || "ent-1"));
        setSelectedEntityId(initialEntityId);
        setSelectedCategory(editingTransaction.category_id);
      } else {
        setInputValue("");
        setDescription("");
        setNotes("");
        setIsCleared(false);
        const defaultAcc = accounts.find((a) => a.type === "bank") || accounts[0];
        setSelectedAccountId(defaultAcc?.id || "");
        const initialEntityId = (defaultEntityId && defaultEntityId !== "all") ? defaultEntityId : (entities[0]?.id || "ent-1");
        setSelectedEntityId(initialEntityId);
        setRecurrenceType("single");
        setInterval("monthly");
        setInstallmentsTotal(3);
        setDateInputVal(toDisplayDate(new Date().toISOString().split("T")[0]));
        if (filteredCategories.length > 0) {
          setSelectedCategory(filteredCategories[0].id);
        }
      }
      setIsDropdownOpen(false);
      setIsAccountDropdownOpen(false);
      setIsEntityDropdownOpen(false);
      setIsRecurrenceTypeDropdownOpen(false);
      setIsIntervalDropdownOpen(false);
      setShowCalendarPopover(false);
      
      // Foco automático após animação de transição
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTransaction]);

  if (!isOpen) return null;

  // Formatar centavos para exibição (R$ 0,00 ou $0.00)
  const getFormattedValue = () => {
    const numericValue = parseInt(inputValue || "0", 10);
    const floatValue = numericValue / 100;
    return floatValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (rawVal.length <= 9) {
      // Limitar a 9 dígitos
      setInputValue(rawVal);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount_cents = parseInt(inputValue || "0", 10);
    if (amount_cents <= 0) return;

    // Buscar a conta correspondente
    const matchedAccount = accounts.find((acc) => acc.id === selectedAccountId);
    if (!selectedCategory || !matchedAccount) return;

    // Converte e valida a data inserida
    const isoDate = toISODate(dateInputVal);
    const isValid = isoDate && !isNaN(new Date(isoDate).getTime());
    const finalDate = isValid ? isoDate : new Date().toISOString().split("T")[0];

    const payload = {
      amount_cents,
      category_id: selectedCategory,
      account_id: matchedAccount.id,
      description: description.trim() || filteredCategories.find(c => c.id === selectedCategory)?.name || "",
      date: finalDate,
      recurrence_type: recurrenceType,
      installments_total: recurrenceType === "installment" ? installmentsTotal : undefined,
      interval: recurrenceType !== "single" ? interval : undefined,
      cleared: isCleared,
      entity_id: selectedEntityId,
      notes: notes.trim(),
    };

    if (editingTransaction && (editingTransaction.recurrence_type === "fixed" || editingTransaction.recurrence_type === "installment")) {
      setPendingSaveData(payload);
      return;
    }

    onSave(payload, "single");
    onClose();
  };

  const handleScopeSelection = (scope: "single" | "future" | "all") => {
    if (pendingSaveData) {
      onSave(pendingSaveData, scope);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md p-0 md:p-6">
        <motion.div
          initial={isDesktop ? { opacity: 0, scale: 0.95, y: 10 } : { y: "100%" }}
          animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
          exit={isDesktop ? { opacity: 0, scale: 0.95, y: 10 } : { y: "100%" }}
          transition={
            isDesktop
              ? { duration: 0.2, ease: "easeOut" }
              : { type: "spring", stiffness: 300, damping: 30 }
          }
          className={`w-full max-w-md md:max-w-2xl bg-[#09090b]/80 border border-white/10 rounded-t-[32px] md:rounded-[32px] flex flex-col overflow-hidden md:overflow-visible shadow-[0_30px_70px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl relative`}
          style={isDesktop ? {} : { height: visibleHeight ? `${visibleHeight}px` : "100dvh" }}
        >
          {/* Subtle top indicator glow based on type */}
          <div className={`absolute top-0 left-10 right-10 h-0.5 blur-sm rounded-full pointer-events-none -z-10 ${
            type === "income" ? "bg-blue-500/20" : "bg-red-500/20"
          }`} />

          {/* Cabeçalho sem título */}
          <div className="flex justify-end px-6 pt-6 pb-2">
            <button
              type="button"
              onClick={() => {
                if (pendingSaveData) {
                  setPendingSaveData(null); // Go back to form
                } else {
                  onClose();
                }
              }}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-full active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {pendingSaveData ? (
            <div className="flex-1 flex flex-col justify-center p-6 space-y-6">
              <div className="text-center space-y-2 mb-4">
                <h3 className="text-xl font-bold text-white tracking-tight">Como aplicar a edição?</h3>
                <p className="text-sm text-zinc-400">Esta é uma transação recorrente.</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => handleScopeSelection("single")}
                  className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <span className="font-bold text-white group-hover:text-blue-400 transition-colors">Apenas este mês</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Os outros lançamentos não serão alterados</span>
                </button>
                <button
                  onClick={() => handleScopeSelection("future")}
                  className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <span className="font-bold text-white group-hover:text-amber-400 transition-colors">Este e os futuros</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Lançamentos passados continuam iguais</span>
                </button>
                <button
                  onClick={() => handleScopeSelection("all")}
                  className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <span className="font-bold text-white group-hover:text-rose-400 transition-colors">Todos os lançamentos</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Atualiza todo o histórico desta transação</span>
                </button>
              </div>
            </div>
          ) : (
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col justify-between p-6 overflow-y-auto md:overflow-y-visible"
          >
            <div className="space-y-6">
              {/* Valor do Lançamento */}
              <div className="text-center py-6 mb-2">
                <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${type === "income" ? "text-blue-500/70" : "text-red-500/70"}`}>
                  {type === "income" ? "Valor da Entrada" : "Valor da Saída"}
                </span>
                <div className="flex items-center justify-center gap-4 mt-3 px-6 relative z-10">
                  {/* Espaçador para balancear visualmente o botão da direita */}
                  <div className="w-10 h-10 shrink-0 hidden md:block" />

                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={getFormattedValue()}
                    onChange={handleInputChange}
                    className={`text-center font-black tracking-tighter bg-transparent border-none outline-none focus:outline-none focus:ring-0 flex-1 min-w-0 ${
                      type === "income" ? "text-blue-400" : "text-red-400"
                    }`}
                    style={{ fontSize: "clamp(2.5rem, 8vw, 4.5rem)", lineHeight: 1 }}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setIsCleared(!isCleared)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all active:scale-90 shrink-0 cursor-pointer ${
                      isCleared
                        ? "bg-blue-500/10 border-blue-500/25 text-blue-400 shadow-[0_4px_15px_rgba(59,130,246,0.1)]"
                        : "bg-red-500/10 border-red-500/25 text-red-400 shadow-[0_4px_15px_rgba(239,68,68,0.1)]"
                    }`}
                    title={isCleared ? "Pago" : "Não Pago"}
                  >
                    {isCleared ? (
                      <ThumbsUp className="w-4.5 h-4.5" />
                    ) : (
                      <ThumbsDown className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
                {recurrenceType === "installment" && installmentsTotal > 1 && (
                  <div className="mt-2 text-center animate-in fade-in slide-in-from-top-1">
                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500 bg-black/40 px-3 py-1 rounded-full border border-white/5 inline-block">
                      {installmentsTotal}x de {(Math.round(parseInt(inputValue || "0", 10) / installmentsTotal) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                )}
              </div>

              {/* Descrição do Lançamento */}
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-550 block mb-2">
                  Descrição
                </span>
                <input
                  type="text"
                  placeholder="Ex: Almoço de domingo"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full bg-[#050507]/60 border border-zinc-900 focus:border-zinc-800 focus:bg-[#050507]/90 rounded-2xl py-3.5 px-4 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-600 shadow-inner`}
                />
              </div>

              {/* Detalhes / Subdivisões */}
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-550 block mb-2">
                  Detalhes (Opcional)
                </span>
                <textarea
                  placeholder="Itens, lista ou observações..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full bg-[#050507]/60 border border-zinc-900 focus:border-zinc-800 focus:bg-[#050507]/90 rounded-2xl py-3.5 px-4 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-600 shadow-inner min-h-[80px] resize-y`}
                />
              </div>

              {/* Data do Lançamento */}
              <div className="relative">
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-550 block mb-2">
                  Data
                </span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={dateInputVal}
                    onChange={handleDateChange}
                    className={`w-full bg-[#050507]/60 border border-zinc-900 focus:border-zinc-800 focus:bg-[#050507]/90 rounded-2xl py-3.5 pl-4 pr-12 text-xs text-zinc-200 outline-none transition-all placeholder:text-zinc-600 shadow-inner`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCalendarPopover(!showCalendarPopover)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-zinc-500 hover:text-zinc-350 hover:bg-white/5 active:scale-95 transition-all cursor-pointer ${
                      showCalendarPopover
                        ? type === "income"
                          ? "text-blue-400 bg-blue-500/5 border border-blue-500/10"
                          : "text-red-400 bg-red-500/5 border border-red-500/10"
                        : ""
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>

                {showCalendarPopover && (
                  <div
                    ref={calendarRef}
                    className="absolute z-30 left-0 right-0 mt-2 p-5 bg-[#09090b]/98 border border-zinc-800 rounded-[24px] shadow-[0_30px_70px_rgba(0,0,0,0.95)] backdrop-blur-3xl animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    {/* Month Selector Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-2 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-zinc-250 hover:bg-zinc-900 hover:border-zinc-850 active:scale-90 transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.18em] select-none">
                        {MONTH_NAMES[currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear()}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-2 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-zinc-250 hover:bg-zinc-900 hover:border-zinc-850 active:scale-90 transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Weekdays Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2.5 text-center select-none">
                      {WEEKDAY_NAMES.map((name, i) => (
                        <span key={i} className="text-[9px] font-black uppercase text-zinc-650 tracking-wider">
                          {name}
                        </span>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((dayObj, i) => {
                        const selected = isDaySelected(dayObj);
                        const today = isDayToday(dayObj);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectDay(dayObj)}
                            className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all relative cursor-pointer ${
                              selected
                                ? type === "income"
                                  ? "bg-blue-600 text-white font-black shadow-lg shadow-blue-500/20"
                                  : "bg-red-600 text-white font-black shadow-lg shadow-red-500/20"
                                : dayObj.isCurrentMonth
                                ? "text-zinc-300 hover:bg-white/[0.04] hover:text-white font-bold"
                                : "text-zinc-650 hover:bg-white/[0.02] hover:text-zinc-400"
                            }`}
                          >
                            <span>{dayObj.day}</span>
                            {today && !selected && (
                              <span className={`absolute bottom-1.5 w-1 h-1 rounded-full ${type === "income" ? "bg-blue-400" : "bg-red-400"}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Categorias - Dropdown Customizado */}
              <div className="relative">
                <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-550 block mb-2">
                  Categoria
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleCategoryDropdown}
                    className="w-full bg-[#050507]/60 border border-zinc-900 rounded-2xl py-3.5 px-4 pr-10 text-xs text-zinc-200 outline-none flex items-center justify-between font-bold active:scale-[0.99] transition-all text-left cursor-pointer shadow-inner"
                  >
                    <span>
                      {categories.find((c) => c.id === selectedCategory)?.name || "Selecione..."}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute z-20 left-0 right-0 mt-2 bg-[#09090b]/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-3xl p-1 animate-in fade-in slide-in-from-top-1 duration-150 relative">
                        <div className="max-h-52 overflow-y-auto divide-y divide-zinc-900/30">
                        {filteredCategories.map((cat) => {
                          const isSelected = selectedCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(cat.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left py-3 px-4 text-xs font-bold transition-all flex items-center justify-between rounded-xl cursor-pointer ${
                                isSelected
                                  ? type === "income"
                                    ? "bg-blue-600/10 text-blue-400"
                                    : "bg-red-600/10 text-red-400"
                                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                              }`}
                            >
                              <span>{cat.name}</span>
                              {isSelected && (
                                <span className={`w-1.5 h-1.5 rounded-full ${type === "income" ? "bg-blue-400" : "bg-red-400"}`} />
                              )}
                            </button>
                          );
                        })}
                        
                        {/* Criar Nova Categoria Inline */}
                        {onAddCategory && (
                          <div className="p-2 mt-1">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Nova categoria..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (newCategoryName.trim()) {
                                      onAddCategory({
                                        name: newCategoryName.trim(),
                                        type: type,
                                        color: type === "income" ? "#3b82f6" : "#ef4444",
                                        icon: "Tag"
                                      });
                                      setNewCategoryName("");
                                    }
                                  }
                                }}
                                className="flex-1 bg-[#050507]/60 border border-zinc-900 focus:border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none shadow-inner"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (newCategoryName.trim()) {
                                    onAddCategory({
                                      name: newCategoryName.trim(),
                                      type: type,
                                      color: type === "income" ? "#3b82f6" : "#ef4444",
                                      icon: "Tag"
                                    });
                                    setNewCategoryName("");
                                  }
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                  type === "income" ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30" : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                                }`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    </>
                  )}
                </div>
              </div>

              {/* Grid de Método/Tipo e Pertencimento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dropdown 1: Conta / Cartão */}
                <div className="relative">
                  <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-550 block mb-2">
                    Conta / Cartão
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={toggleAccountDropdown}
                      className="w-full bg-[#050507]/60 border border-zinc-900 rounded-2xl py-3.5 px-4 pr-10 text-xs text-zinc-200 outline-none flex items-center justify-between font-bold active:scale-[0.99] transition-all text-left cursor-pointer shadow-inner"
                    >
                      <span>
                        {accounts.find((acc) => acc.id === selectedAccountId)?.name || "Selecione..."}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                          isAccountDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isAccountDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsAccountDropdownOpen(false)} />
                        <div className="absolute z-20 left-0 right-0 mt-2 bg-[#09090b]/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-3xl p-1 animate-in fade-in slide-in-from-top-1 duration-150 relative">
                          <div className="max-h-52 overflow-y-auto divide-y divide-zinc-900/30">
                          {accounts.map((acc) => {
                            const isSelected = selectedAccountId === acc.id;
                            const owner = entities.find((e) => e.id === acc.entity_id)?.name;
                            const label = owner ? `${acc.name} (${owner})` : acc.name;
                            return (
                              <button
                                key={acc.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAccountId(acc.id);
                                  setIsAccountDropdownOpen(false);
                                }}
                                className={`w-full text-left py-3 px-4 text-xs font-bold transition-all flex items-center justify-between rounded-xl cursor-pointer ${
                                  isSelected
                                    ? type === "income"
                                      ? "bg-blue-600/10 text-blue-400"
                                      : "bg-red-600/10 text-red-400"
                                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                                }`}
                              >
                                <span>{label}</span>
                                {isSelected && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${type === "income" ? "bg-blue-400" : "bg-red-400"}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Dropdown 2: A quem pertence */}
                <div className="relative">
                  <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-550 block mb-2">
                    A quem pertence
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={toggleEntityDropdown}
                      className="w-full bg-[#050507]/60 border border-zinc-900 rounded-2xl py-3.5 px-4 pr-10 text-xs text-zinc-200 outline-none flex items-center justify-between font-bold active:scale-[0.99] transition-all text-left cursor-pointer shadow-inner"
                    >
                      <span>
                        {entities.find((e) => e.id === selectedEntityId)?.name || "Selecione..."}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                          isEntityDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isEntityDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsEntityDropdownOpen(false)} />
                        <div className="absolute z-20 left-0 right-0 mt-2 bg-[#09090b]/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-3xl p-1 animate-in fade-in slide-in-from-top-1 duration-150 relative">
                          <div className="max-h-52 overflow-y-auto divide-y divide-zinc-900/30">
                          {entities.map((ent) => {
                            const isSelected = selectedEntityId === ent.id;
                            return (
                              <button
                                key={ent.id}
                                type="button"
                                onClick={() => {
                                  setSelectedEntityId(ent.id);
                                  setIsEntityDropdownOpen(false);
                                }}
                                className={`w-full text-left py-3 px-4 text-xs font-bold transition-all flex items-center justify-between rounded-xl cursor-pointer ${
                                  isSelected
                                    ? type === "income"
                                      ? "bg-blue-600/10 text-blue-400"
                                      : "bg-red-600/10 text-red-400"
                                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                                }`}
                              >
                                <span>{ent.name}</span>
                                {isSelected && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${type === "income" ? "bg-blue-400" : "bg-red-400"}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Repetição / Frequência */}
              <div className="pt-2">
                <div className={recurrenceType === "single" ? "w-full" : recurrenceType === "fixed" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 md:grid-cols-3 gap-6"}>
                  {/* Dropdown: Tipo de Repetição */}
                  <div className="relative">
                    <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-550 block mb-2">
                      Repetição
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={toggleRecurrenceTypeDropdown}
                        className="w-full bg-[#050507]/60 border border-zinc-900 rounded-2xl py-3.5 px-4 pr-10 text-xs text-zinc-200 outline-none flex items-center justify-between font-bold active:scale-[0.99] transition-all text-left cursor-pointer shadow-inner"
                      >
                        <span>
                          {recurrenceType === "single"
                            ? "Único / Avulso"
                            : recurrenceType === "fixed"
                            ? "Fixo (Recorrente)"
                            : "Parcelado"}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                            isRecurrenceTypeDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isRecurrenceTypeDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsRecurrenceTypeDropdownOpen(false)} />
                          <div className="absolute z-20 left-0 right-0 mt-2 bg-[#09090b]/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-3xl p-1 animate-in fade-in slide-in-from-top-1 duration-150 relative">
                            <div className="divide-y divide-zinc-900/30 p-0.5">
                            {([
                              { type: "single", label: "Único / Avulso" },
                              { type: "fixed", label: "Fixo (Recorrente)" },
                              { type: "installment", label: "Parcelado" },
                            ] as const).map((opt) => {
                              const isSelected = recurrenceType === opt.type;
                              return (
                                <button
                                  key={opt.type}
                                  type="button"
                                  onClick={() => {
                                    setRecurrenceType(opt.type);
                                    setIsRecurrenceTypeDropdownOpen(false);
                                  }}
                                  className={`w-full text-left py-3 px-4 text-xs font-bold transition-all flex items-center justify-between rounded-xl cursor-pointer ${
                                    isSelected
                                      ? type === "income"
                                        ? "bg-blue-600/10 text-blue-400"
                                        : "bg-red-600/10 text-red-400"
                                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {isSelected && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${type === "income" ? "bg-blue-400" : "bg-red-400"}`} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dropdown: Intervalo (se fixo ou parcelado) */}
                  {recurrenceType !== "single" && (
                    <div className="relative">
                      <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-550 block mb-2">
                        Intervalo
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={toggleIntervalDropdown}
                          className="w-full bg-[#050507]/60 border border-zinc-900 rounded-2xl py-3.5 px-4 pr-10 text-xs text-zinc-200 outline-none flex items-center justify-between font-bold active:scale-[0.99] transition-all text-left cursor-pointer shadow-inner"
                        >
                          <span>
                            {interval === "weekly"
                              ? "Semanal"
                              : interval === "yearly"
                              ? "Anual"
                              : "Mensal"}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                              isIntervalDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isIntervalDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsIntervalDropdownOpen(false)} />
                            <div className="absolute z-20 left-0 right-0 mt-2 bg-[#09090b]/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-3xl p-1 animate-in fade-in slide-in-from-top-1 duration-150 relative">
                              <div className="divide-y divide-zinc-900/30 p-0.5">
                              {([
                                { type: "weekly", label: "Semanal" },
                                { type: "monthly", label: "Mensal" },
                                { type: "yearly", label: "Anual" },
                              ] as const).map((opt) => {
                                const isSelected = interval === opt.type;
                                return (
                                  <button
                                    key={opt.type}
                                    type="button"
                                    onClick={() => {
                                      setInterval(opt.type);
                                      setIsIntervalDropdownOpen(false);
                                    }}
                                    className={`w-full text-left py-3 px-4 text-xs font-bold transition-all flex items-center justify-between rounded-xl cursor-pointer ${
                                      isSelected
                                        ? type === "income"
                                          ? "bg-blue-600/10 text-blue-400"
                                          : "bg-red-600/10 text-red-400"
                                        : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    {isSelected && (
                                      <span className={`w-1.5 h-1.5 rounded-full ${type === "income" ? "bg-blue-400" : "bg-red-400"}`} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Input: Número de Parcelas (se parcelado) */}
                  {recurrenceType === "installment" && (
                    <div className="relative">
                      <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-550 block mb-2">
                        Parcelas
                      </label>
                      <div className="w-full bg-[#050507]/60 border border-zinc-900 rounded-2xl flex items-center justify-between overflow-hidden shadow-inner">
                        <button
                          type="button"
                          onClick={() => setInstallmentsTotal(Math.max(2, installmentsTotal - 1))}
                          className={`px-4.5 py-3.5 text-zinc-400 ${type === "income" ? "hover:text-blue-300 hover:bg-blue-950/20" : "hover:text-red-300 hover:bg-red-950/20"} transition-all font-black text-base cursor-pointer select-none`}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="2"
                          max="120"
                          value={installmentsTotal}
                          onChange={(e) => setInstallmentsTotal(Math.max(2, parseInt(e.target.value, 10) || 2))}
                          className="bg-transparent border-none text-center text-xs font-bold text-zinc-205 outline-none w-16 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setInstallmentsTotal(Math.min(120, installmentsTotal + 1))}
                          className={`px-4.5 py-3.5 text-zinc-400 ${type === "income" ? "hover:text-blue-300 hover:bg-blue-950/20" : "hover:text-red-300 hover:bg-red-950/20"} transition-all font-black text-base cursor-pointer select-none`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Confirmar */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={parseInt(inputValue || "0", 10) <= 0}
                className={`w-full py-4 rounded-2xl text-white font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
                  type === "income"
                    ? "bg-blue-600 hover:bg-blue-500 shadow-[0_8px_25px_rgba(59,130,246,0.25)]"
                    : "bg-red-600 hover:bg-red-500 shadow-[0_8px_25px_rgba(239,68,68,0.25)]"
                }`}
              >
                <Check className="w-4 h-4" />
                {editingTransaction ? "Salvar Alterações" : "Salvar Lançamento"}
              </button>
            </div>
          </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
