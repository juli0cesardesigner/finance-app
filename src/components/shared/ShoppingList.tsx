"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Trash2, X, EyeOff, Eye, Pencil, ChevronDown, ChevronUp, Minus, ShoppingBag } from "lucide-react";

type Item = {
  id: string;
  user_id: string;
  name: string;
  quantity: string;
  is_completed: boolean;
  is_hidden: boolean;
};

export default function ShoppingList() {
  const [items, setItems] = useState<Item[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Accordion state for completed items
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  
  // States for alternatives in Add Modal
  const [addAlternatives, setAddAlternatives] = useState<string[]>([""]);

  // States for editing
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemQuantity, setEditItemQuantity] = useState(1);
  const [editAlternatives, setEditAlternatives] = useState<string[]>([""]);

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Hook inteligente para detectar o espaço livre (acima do teclado)
  const [visibleHeight, setVisibleHeight] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleViewportChange() {
      if (window.visualViewport) {
        setVisibleHeight(window.visualViewport.height);
      }
    }

    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    handleViewportChange();

    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    async function init() {
      try {
        // Try to obtain existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
        } else {
          // No session – leave userId undefined; UI will handle login flow
          setUserId(null);
        }
      } catch (err) {
        console.error("Auth init failed", err);
      } finally {
        fetchItems();
      }
    }
    
    init();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("items_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => {
              if (prev.some((i) => i.id === payload.new.id)) return prev;
              
              const tempIndex = prev.findIndex(
                (i) => i.id.startsWith("temp-") && i.name === payload.new.name
              );
              
              if (tempIndex >= 0) {
                const newItems = [...prev];
                newItems[tempIndex] = payload.new as Item;
                return newItems;
              }
              
              return [payload.new as Item, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((i) => (i.id === payload.new.id ? (payload.new as Item) : i))
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) =>
              prev.filter((i) => i.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);



  async function fetchItems() {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error fetching items", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim() || !userId) return;

    let finalName = newItemName.trim();
    const validAlts = addAlternatives.filter(a => a.trim() !== "");
    if (validAlts.length > 0) {
      finalName = `${finalName} / ${validAlts.join(" / ")}`;
    }

    const newItem = {
      user_id: userId,
      name: finalName,
      quantity: newItemQuantity.toString(),
      is_completed: false,
      is_hidden: false,
    };

    // Optimistic UI update
    const tempId = "temp-" + Date.now().toString();
    setItems((prev) => [{ ...newItem, id: tempId } as Item, ...prev]);
    setNewItemName("");
    setNewItemQuantity(1);
    setAddAlternatives([""]);
    setIsAddModalOpen(false);

    const { data, error } = await supabase
      .from("items")
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error("Error adding item", error);
      fetchItems(); // revert on error
    } else if (data) {
      setItems((prev) => prev.map((item) => (item.id === tempId ? data : item)));
    }
  }

  async function toggleComplete(item: Item) {
    const newStatus = !item.is_completed;
    
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_completed: newStatus } : i))
    );

    const { error } = await supabase
      .from("items")
      .update({ is_completed: newStatus })
      .eq("id", item.id);

    if (error) {
      console.error("Error updating item", error);
      fetchItems(); // revert on error
    }
  }

  async function hideItem(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_hidden: true } : i))
    );

    const { error } = await supabase
      .from("items")
      .update({ is_hidden: true })
      .eq("id", id);

    if (error) {
      console.error("Error hiding item", error);
      fetchItems(); // revert on error
    }
  }

  async function unhideItem(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_hidden: false } : i))
    );

    const { error } = await supabase
      .from("items")
      .update({ is_hidden: false })
      .eq("id", id);

    if (error) {
      console.error("Error unhiding item", error);
      fetchItems(); // revert on error
    }
  }

  async function deleteItem(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setItems((prev) => prev.filter((i) => i.id !== id));

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting item", error);
      fetchItems();
    }
  }

  function openEditModal(item: Item, e: React.MouseEvent) {
    e.stopPropagation();
    const parsed = parseItemName(item.name);
    setEditingItem(item);
    setEditItemName(parsed.main);
    
    // Convert quantity to number, default to 1 if not a valid number
    const qty = parseInt(item.quantity);
    setEditItemQuantity(isNaN(qty) ? 1 : qty);
    
    if (parsed.alternatives.length > 0) {
      setEditAlternatives(parsed.alternatives);
    } else {
      setEditAlternatives([""]);
    }
    
    setTimeout(() => editInputRef.current?.focus(), 100);
  }

  async function handleEditItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem || !editItemName.trim()) return;

    let finalName = editItemName.trim();
    const validAlts = editAlternatives.filter(a => a.trim() !== "");
    if (validAlts.length > 0) {
      finalName = `${finalName} / ${validAlts.join(" / ")}`;
    }

    const updatedItem = {
      ...editingItem,
      name: finalName,
      quantity: editItemQuantity.toString(),
    };

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === editingItem.id ? updatedItem : i))
    );
    setEditingItem(null);

    const { error } = await supabase
      .from("items")
      .update({
        name: updatedItem.name,
        quantity: updatedItem.quantity,
      })
      .eq("id", editingItem.id);

    if (error) {
      console.error("Error updating item", error);
      fetchItems();
    }
  }

  const activeItems = items.filter((i) => !i.is_completed && !i.is_hidden);
  const completedItems = items.filter((i) => i.is_completed && !i.is_hidden);
  const hiddenItems = items.filter((i) => i.is_hidden);

  // Helper to parse alternatives from name
  function parseItemName(name: string) {
    const parts = name.split(/\s+\/\s+|\s+ou\s+/i);
    return {
      main: parts[0],
      alternatives: parts.slice(1)
    };
  }

  const isFormOpen = isAddModalOpen || !!editingItem;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col h-full min-h-full relative px-4 pt-12 pb-[calc(8rem+env(safe-area-inset-bottom))] overflow-y-auto overflow-x-hidden no-scrollbar">
      {/* Main Interface Wrapper - Oculta quando o formulário está aberto */}
      <AnimatePresence mode="wait">
        {!isFormOpen && (
          <motion.div
            key="main-list"
            initial={{ opacity: 1, filter: "blur(0px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(20px)", scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col w-full"
          >
            {/* Header Simplificado */}
            <header className="mb-12 text-center">
              <h1 className="text-zinc-400 text-sm font-black uppercase tracking-[0.3em]">
                Lista de Compras
              </h1>
            </header>

            {/* Main List Area */}
            <div className="flex-1 space-y-10">
              
              {/* Active Items */}
              <section className="space-y-4">
                <div className="grid gap-3">
                  <AnimatePresence mode="popLayout">
                    {activeItems.map((item) => (
                      <motion.div
                        layout
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative group"
                      >
                        <div className="bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 rounded-[22px] p-4 shadow-2xl flex items-center justify-between transition-all active:scale-[0.98] active:bg-[#2c2c2e]/90">
                          <div 
                            className="flex items-center gap-4 flex-1 cursor-pointer"
                            onClick={() => toggleComplete(item)}
                          >
                            {/* Apple Style Checkbox */}
                            <div className="w-7 h-7 rounded-full border-2 border-blue-500/50 flex items-center justify-center transition-all hover:border-blue-500 hover:bg-blue-500/10">
                              <div className="w-3 h-3 rounded-full bg-blue-500 opacity-0 group-hover:opacity-20 transition-opacity" />
                            </div>
                            
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-lg font-semibold tracking-tight leading-tight text-white truncate">
                                {parseItemName(item.name).main}
                              </span>
                              {parseItemName(item.name).alternatives.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter bg-zinc-800/50 px-1.5 py-0.5 rounded-md flex-shrink-0">ou</span>
                                  <span className="text-zinc-400 text-xs font-medium truncate italic">{parseItemName(item.name).alternatives.join(", ")}</span>
                                </div>
                              )}
                              {item.quantity && parseInt(item.quantity) > 1 && (
                                <span className="text-blue-400/80 text-[10px] font-bold mt-1 uppercase tracking-widest">{item.quantity} unidades</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => openEditModal(item, e)}
                              className="p-2 text-zinc-500 hover:text-blue-400 transition-colors focus:outline-none"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button 
                              onClick={(e) => hideItem(item.id, e)}
                              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                              title="Ocultar"
                            >
                              <EyeOff size={18} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {activeItems.length === 0 && items.filter(i => !i.is_hidden).length === 0 && (
                    <div className="text-center py-20">
                      <div className="bg-zinc-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                          <Plus className="text-zinc-600" size={30} />
                      </div>
                      <p className="text-zinc-500 text-sm font-medium">Sua lista está vazia</p>
                    </div>
                  )}
                  {activeItems.length === 0 && completedItems.length > 0 && (
                    <div className="text-center py-10">
                      <p className="text-zinc-500 text-sm font-medium italic">Tudo comprado! 🎉</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Completed Items Accordion */}
              {completedItems.length > 0 && (
                <section className="space-y-4">
                  <button 
                    onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                    className="w-full flex items-center justify-between px-2 group focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Comprados</h2>
                      <span className="bg-zinc-900 text-zinc-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-white/5">
                        {completedItems.length}
                      </span>
                    </div>
                    <div className={`text-zinc-600 transition-transform duration-500 ${isCompletedOpen ? 'rotate-180' : ''}`}>
                      <ChevronDown size={18} />
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isCompletedOpen && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden grid gap-2"
                      >
                        {completedItems.map((item) => (
                          <motion.div
                            layout
                            key={item.id}
                            onClick={() => toggleComplete(item)}
                            className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center justify-between opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-80 cursor-pointer"
                          >
                            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                <Check size={14} className="text-blue-400" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-base font-medium text-zinc-400 line-through decoration-blue-500/30 truncate">
                                  {parseItemName(item.name).main}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-600 text-xs font-bold tabular-nums">{item.quantity}x</span>
                              <button 
                                onClick={(e) => hideItem(item.id, e)}
                                className="p-1 text-zinc-600 hover:text-zinc-400"
                              >
                                <EyeOff size={16} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}

              {/* Hidden Items Section */}
              {hiddenItems.length > 0 && (
                <section className="space-y-4 pt-4 border-t border-white/5">
                  <h2 className="text-zinc-600 font-bold text-[10px] uppercase tracking-[0.2em] px-2">Ocultos / Lixeira</h2>
                  <div className="grid gap-2">
                    {hiddenItems.map((item) => (
                      <div key={item.id} className="bg-zinc-900/10 border border-dashed border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium text-zinc-600 truncate">{item.name}</span>
                          <span className="text-zinc-700 text-[10px] font-bold">{item.quantity}x</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => unhideItem(item.id, e)}
                            className="p-2 text-zinc-600 hover:text-blue-500"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={(e) => deleteItem(item.id, e)}
                            className="p-2 text-zinc-600 hover:text-red-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apple Style FAB - Apenas na tela principal */}
      <AnimatePresence>
        {!isFormOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute bottom-10 left-0 right-0 px-6 flex justify-center pointer-events-none z-[70]"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsAddModalOpen(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="pointer-events-auto bg-blue-500 text-white w-16 h-16 rounded-full shadow-[0_20px_50px_rgba(59,130,246,0.4)] border border-white/20 flex items-center justify-center relative overflow-hidden group transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus size={32} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Glass Gradient Fade */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[40vh] pointer-events-none z-40"
        style={{
          background: "linear-gradient(to top, #000 0%, #000 20%, transparent 100%)",
          backdropFilter: "blur(8px)",
          maskImage: "linear-gradient(to top, black 20%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, black 20%, transparent 100%)"
        }}
      />

      {/* Add Item Form (Full Screen) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-black flex flex-col px-6 pt-12 pb-8 overflow-y-auto no-scrollbar"
            style={{ 
              height: visibleHeight > 0 ? `${visibleHeight}px` : '100dvh',
            }}
          >
            <div 
              className="flex flex-col flex-1"
              style={{
                scale: visibleHeight < 600 ? 0.9 : 1,
                transformOrigin: 'top center',
                transition: 'scale 0.3s ease-out'
              }}
            >
              <div className="flex justify-between items-center mb-10 flex-shrink-0">
                <div className="w-10" /> {/* Spacer */}
                <h2 className="text-xl font-bold tracking-tight text-white">Adicionar</h2>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={24} className="text-zinc-400" />
                </button>
              </div>
              
              <form onSubmit={handleAddItem} className="flex flex-col flex-1">
                <div className={`space-y-6 flex-1 ${visibleHeight < 500 ? 'gap-2' : ''}`}>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">O que comprar?</label>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Ex: Maçã"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className={`w-full bg-white/5 border border-white/5 rounded-2xl px-5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-zinc-600 font-medium ${visibleHeight < 500 ? 'py-3 text-lg' : 'py-5 text-xl'}`}
                    />
                  </div>
                  
                  {/* Alternatives */}
                  <div className="space-y-3">
                    {addAlternatives.map((alt, idx) => {
                      const isVisible = idx === 0 || addAlternatives[idx - 1].trim() !== "";
                      if (!isVisible) return null;

                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={idx} 
                          className="flex gap-3 items-center"
                        >
                          <span className="text-[10px] text-zinc-600 font-black uppercase w-6 text-center">ou</span>
                          <input
                            type="text"
                            placeholder="Outra opção..."
                            value={alt}
                            onChange={(e) => {
                              const newAlts = [...addAlternatives];
                              newAlts[idx] = e.target.value;
                              if (e.target.value.trim() !== "" && idx === addAlternatives.length - 1) {
                                newAlts.push("");
                              }
                              setAddAlternatives(newAlts);
                            }}
                            className={`flex-1 bg-transparent border rounded-2xl px-5 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-base ${
                              alt.trim() === "" 
                                ? "border-dashed border-white/5 text-zinc-600" 
                                : "border-solid border-white/10 text-white"
                            } ${visibleHeight < 500 ? 'py-3' : 'py-4'}`}
                          />
                          {alt.trim() !== "" && (
                            <button 
                              type="button"
                              onClick={() => setAddAlternatives(addAlternatives.filter((_, i) => i !== idx))}
                              className="p-2 text-zinc-600 hover:text-red-400"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col items-center pt-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Quantidade</label>
                    <div className={`flex items-center bg-white/5 border border-white/5 rounded-[32px] px-6 py-2 shadow-inner ${visibleHeight < 500 ? 'gap-6' : 'gap-10'}`}>
                      <button
                        type="button"
                        onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                        className={`text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all active:scale-90 ${visibleHeight < 500 ? 'p-2' : 'p-4'}`}
                      >
                        <Minus size={visibleHeight < 500 ? 22 : 28} />
                      </button>
                      <span className={`font-bold min-w-[2ch] text-center text-white tabular-nums ${visibleHeight < 500 ? 'text-2xl' : 'text-4xl'}`}>
                        {newItemQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                        className={`text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all active:scale-90 ${visibleHeight < 500 ? 'p-2' : 'p-4'}`}
                      >
                        <Plus size={visibleHeight < 500 ? 22 : 28} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className={`mt-auto ${visibleHeight < 500 ? 'pt-4' : 'pt-8'}`}>
                  <button
                    type="submit"
                    disabled={!newItemName.trim()}
                    className={`w-full bg-blue-500 hover:bg-blue-600 text-white rounded-[24px] font-bold disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98] shadow-[0_20px_40px_rgba(59,130,246,0.3)] ${visibleHeight < 500 ? 'py-4 text-lg' : 'py-5 text-xl'}`}
                  >
                    Adicionar à Lista
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Item Form (Full Screen) */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-black flex flex-col px-6 pt-12 pb-8 overflow-y-auto no-scrollbar"
            style={{ 
              height: visibleHeight > 0 ? `${visibleHeight}px` : '100dvh',
            }}
          >
            <div 
              className="flex flex-col flex-1"
              style={{
                scale: visibleHeight < 600 ? 0.9 : 1,
                transformOrigin: 'top center',
                transition: 'scale 0.3s ease-out'
              }}
            >
              <div className="flex justify-between items-center mb-10 flex-shrink-0">
                <div className="w-10" /> {/* Spacer */}
                <h2 className="text-xl font-bold tracking-tight text-white">Editar</h2>
                <button 
                  onClick={() => setEditingItem(null)}
                  className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={24} className="text-zinc-400" />
                </button>
              </div>
              
              <form onSubmit={handleEditItem} className="flex flex-col flex-1">
                <div className={`space-y-6 flex-1 ${visibleHeight < 500 ? 'gap-2' : ''}`}>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Nome do item</label>
                    <input
                      ref={editInputRef}
                      type="text"
                      placeholder="Ex: Maçã"
                      value={editItemName}
                      onChange={(e) => setEditItemName(e.target.value)}
                      className={`w-full bg-white/5 border border-white/5 rounded-2xl px-5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-zinc-600 font-medium ${visibleHeight < 500 ? 'py-3 text-lg' : 'py-5 text-xl'}`}
                    />
                  </div>

                  {/* Edit Alternatives */}
                  <div className="space-y-3">
                    {editAlternatives.map((alt, idx) => {
                      const isVisible = idx === 0 || editAlternatives[idx - 1].trim() !== "";
                      if (!isVisible) return null;

                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={idx} 
                          className="flex gap-3 items-center"
                        >
                          <span className="text-[10px] text-zinc-600 font-black uppercase w-6 text-center">ou</span>
                          <input
                            type="text"
                            placeholder="Outra opção..."
                            value={alt}
                            onChange={(e) => {
                              const newAlts = [...editAlternatives];
                              newAlts[idx] = e.target.value;
                              if (e.target.value.trim() !== "" && idx === editAlternatives.length - 1) {
                                newAlts.push("");
                              }
                              setEditAlternatives(newAlts);
                            }}
                            className={`flex-1 bg-transparent border rounded-2xl px-5 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-base ${
                              alt.trim() === "" 
                                ? "border-dashed border-white/5 text-zinc-600" 
                                : "border-solid border-white/10 text-white"
                            } ${visibleHeight < 500 ? 'py-3' : 'py-4'}`}
                          />
                          {alt.trim() !== "" && (
                            <button 
                              type="button"
                              onClick={() => setEditAlternatives(editAlternatives.filter((_, i) => i !== idx))}
                              className="p-2 text-zinc-600 hover:text-red-400"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col items-center pt-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Quantidade</label>
                    <div className={`flex items-center bg-white/5 border border-white/5 rounded-[32px] px-6 py-2 shadow-inner ${visibleHeight < 500 ? 'gap-6' : 'gap-10'}`}>
                      <button
                        type="button"
                        onClick={() => setEditItemQuantity(Math.max(1, editItemQuantity - 1))}
                        className={`text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all active:scale-90 ${visibleHeight < 500 ? 'p-2' : 'p-4'}`}
                      >
                        <Minus size={visibleHeight < 500 ? 22 : 28} />
                      </button>
                      <span className={`font-bold min-w-[2ch] text-center text-white tabular-nums ${visibleHeight < 500 ? 'text-2xl' : 'text-4xl'}`}>
                        {editItemQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditItemQuantity(editItemQuantity + 1)}
                        className={`text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all active:scale-90 ${visibleHeight < 500 ? 'p-2' : 'p-4'}`}
                      >
                        <Plus size={visibleHeight < 500 ? 22 : 28} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className={`mt-auto ${visibleHeight < 500 ? 'pt-4' : 'pt-8'}`}>
                  <button
                    type="submit"
                    disabled={!editItemName.trim()}
                    className={`w-full bg-blue-500 hover:bg-blue-600 text-white rounded-[24px] font-bold disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98] shadow-[0_20px_40px_rgba(59,130,246,0.3)] ${visibleHeight < 500 ? 'py-4 text-lg' : 'py-5 text-xl'}`}
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
