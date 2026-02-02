"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase, Diaria } from "@/lib/supabase";

const SALDO_MENSAL = 60000;

export default function Home() {
  const [diarias, setDiarias] = useState<Diaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoMilitar, setNovoMilitar] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [filtroMilitar, setFiltroMilitar] = useState("");
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroValorMax, setFiltroValorMax] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editMilitar, setEditMilitar] = useState("");
  const [editValor, setEditValor] = useState("");

  // Carregar diárias
  useEffect(() => {
    carregarDiarias();
  }, []);

  async function carregarDiarias() {
    setLoading(true);
    const { data, error } = await supabase
      .from("diarias")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar:", error);
    } else {
      setDiarias(data || []);
    }
    setLoading(false);
  }

  // Inserir nova diária
  async function inserirDiaria(e: React.FormEvent) {
    e.preventDefault();
    if (!novoMilitar.trim() || !novoValor) return;

    const { error } = await supabase.from("diarias").insert({
      militar_nome: novoMilitar.toUpperCase().trim(),
      valor: parseFloat(novoValor),
    });

    if (error) {
      alert("Erro ao inserir: " + error.message);
    } else {
      setNovoMilitar("");
      setNovoValor("");
      carregarDiarias();
    }
  }

  // Excluir diária
  async function excluirDiaria(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta diária?")) return;

    const { error } = await supabase.from("diarias").delete().eq("id", id);

    if (error) {
      alert("Erro ao excluir: " + error.message);
    } else {
      carregarDiarias();
    }
  }

  // Iniciar edição
  function iniciarEdicao(diaria: Diaria) {
    setEditandoId(diaria.id);
    setEditMilitar(diaria.militar_nome);
    setEditValor(diaria.valor.toString());
  }

  // Salvar edição
  async function salvarEdicao(id: string) {
    const { error } = await supabase
      .from("diarias")
      .update({
        militar_nome: editMilitar.toUpperCase().trim(),
        valor: parseFloat(editValor),
      })
      .eq("id", id);

    if (error) {
      alert("Erro ao atualizar: " + error.message);
    } else {
      setEditandoId(null);
      carregarDiarias();
    }
  }

  // Cancelar edição
  function cancelarEdicao() {
    setEditandoId(null);
    setEditMilitar("");
    setEditValor("");
  }

  // Diárias filtradas
  const diariasFiltradas = useMemo(() => {
    return diarias.filter((d) => {
      const matchNome = d.militar_nome
        .toLowerCase()
        .includes(filtroMilitar.toLowerCase());
      const matchValorMin = filtroValorMin
        ? d.valor >= parseFloat(filtroValorMin)
        : true;
      const matchValorMax = filtroValorMax
        ? d.valor <= parseFloat(filtroValorMax)
        : true;
      return matchNome && matchValorMin && matchValorMax;
    });
  }, [diarias, filtroMilitar, filtroValorMin, filtroValorMax]);

  // Total gasto
  const totalGasto = useMemo(() => {
    return diarias.reduce((acc, d) => acc + Number(d.valor), 0);
  }, [diarias]);

  // Saldo disponível
  const saldoDisponivel = SALDO_MENSAL - totalGasto;

  // Resumo por militar
  const resumoPorMilitar = useMemo(() => {
    const resumo: Record<string, { quantidade: number; total: number }> = {};
    
    diariasFiltradas.forEach((d) => {
      if (!resumo[d.militar_nome]) {
        resumo[d.militar_nome] = { quantidade: 0, total: 0 };
      }
      resumo[d.militar_nome].quantidade += 1;
      resumo[d.militar_nome].total += Number(d.valor);
    });

    return Object.entries(resumo)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.total - a.total);
  }, [diariasFiltradas]);

  // Formatar valor em reais
  function formatarReais(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // Formatar data
  function formatarData(data: string) {
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-red-500 mb-2">
            🏛️ CONTROLE DE DIÁRIAS
          </h1>
          <p className="text-red-300/70">Sistema de Controle do Quartel</p>
        </header>

        {/* Card Saldo */}
        <div className="bg-[#2d0a0a] border-2 border-red-800 rounded-xl p-6 mb-6 text-center">
          <p className="text-red-300/70 text-sm mb-1">SALDO DISPONÍVEL</p>
          <p
            className={`text-4xl font-bold ${
              saldoDisponivel >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {formatarReais(saldoDisponivel)}
          </p>
          <p className="text-red-300/50 text-sm mt-2">
            de {formatarReais(SALDO_MENSAL)} | Gasto: {formatarReais(totalGasto)}
          </p>
          <div className="mt-3 bg-red-950 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all ${
                saldoDisponivel >= 0 ? "bg-green-600" : "bg-red-600"
              }`}
              style={{
                width: `${Math.min((totalGasto / SALDO_MENSAL) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Formulário Nova Diária */}
        <form
          onSubmit={inserirDiaria}
          className="bg-[#2d0a0a] border border-red-800 rounded-xl p-4 mb-6"
        >
          <h2 className="text-lg font-semibold text-red-400 mb-3">
            ➕ Nova Diária
          </h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Nome do Militar"
              value={novoMilitar}
              onChange={(e) => setNovoMilitar(e.target.value)}
              className="flex-1 bg-[#450a0a] border border-red-800 rounded-lg px-4 py-2 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <input
              type="number"
              placeholder="Valor (R$)"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              step="0.01"
              min="0"
              className="w-full md:w-40 bg-[#450a0a] border border-red-800 rounded-lg px-4 py-2 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button
              type="submit"
              className="bg-red-700 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Inserir
            </button>
          </div>
        </form>

        {/* Filtros */}
        <div className="bg-[#2d0a0a] border border-red-800 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold text-red-400 mb-3">
            🔍 Filtros
          </h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Buscar militar..."
              value={filtroMilitar}
              onChange={(e) => setFiltroMilitar(e.target.value)}
              className="flex-1 bg-[#450a0a] border border-red-800 rounded-lg px-4 py-2 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <input
              type="number"
              placeholder="Valor mín."
              value={filtroValorMin}
              onChange={(e) => setFiltroValorMin(e.target.value)}
              step="0.01"
              className="w-full md:w-32 bg-[#450a0a] border border-red-800 rounded-lg px-4 py-2 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <input
              type="number"
              placeholder="Valor máx."
              value={filtroValorMax}
              onChange={(e) => setFiltroValorMax(e.target.value)}
              step="0.01"
              className="w-full md:w-32 bg-[#450a0a] border border-red-800 rounded-lg px-4 py-2 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            {(filtroMilitar || filtroValorMin || filtroValorMax) && (
              <button
                onClick={() => {
                  setFiltroMilitar("");
                  setFiltroValorMin("");
                  setFiltroValorMax("");
                }}
                className="bg-red-900 hover:bg-red-800 text-red-300 px-4 py-2 rounded-lg transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Resumo por Militar */}
        {resumoPorMilitar.length > 0 && (
          <div className="bg-[#2d0a0a] border border-red-800 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold text-red-400 mb-3">
              📊 Resumo por Militar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {resumoPorMilitar.map((r) => (
                <div
                  key={r.nome}
                  className="bg-[#450a0a] border border-red-900 rounded-lg p-3"
                >
                  <p className="font-semibold text-red-200">{r.nome}</p>
                  <p className="text-red-400 text-sm">
                    {r.quantidade} diária{r.quantidade > 1 ? "s" : ""} •{" "}
                    {formatarReais(r.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabela de Registros */}
        <div className="bg-[#2d0a0a] border border-red-800 rounded-xl overflow-hidden">
          <h2 className="text-lg font-semibold text-red-400 p-4 border-b border-red-800">
            📋 Registros ({diariasFiltradas.length})
          </h2>

          {loading ? (
            <div className="p-8 text-center text-red-400">Carregando...</div>
          ) : diariasFiltradas.length === 0 ? (
            <div className="p-8 text-center text-red-400/70">
              {diarias.length === 0
                ? "Nenhuma diária registrada."
                : "Nenhum resultado encontrado com os filtros aplicados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#450a0a]">
                  <tr>
                    <th className="text-left px-4 py-3 text-red-300 font-semibold">
                      Militar
                    </th>
                    <th className="text-left px-4 py-3 text-red-300 font-semibold">
                      Valor
                    </th>
                    <th className="text-left px-4 py-3 text-red-300 font-semibold">
                      Data
                    </th>
                    <th className="text-center px-4 py-3 text-red-300 font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {diariasFiltradas.map((d) => (
                    <tr
                      key={d.id}
                      className="border-t border-red-900/50 hover:bg-red-950/30 transition-colors"
                    >
                      {editandoId === d.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editMilitar}
                              onChange={(e) => setEditMilitar(e.target.value)}
                              className="w-full bg-[#450a0a] border border-red-700 rounded px-2 py-1 text-red-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={editValor}
                              onChange={(e) => setEditValor(e.target.value)}
                              step="0.01"
                              className="w-24 bg-[#450a0a] border border-red-700 rounded px-2 py-1 text-red-100"
                            />
                          </td>
                          <td className="px-4 py-3 text-red-300/70">
                            {formatarData(d.created_at)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => salvarEdicao(d.id)}
                              className="text-green-500 hover:text-green-400 mr-2"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelarEdicao}
                              className="text-red-500 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-red-100 font-medium">
                            {d.militar_nome}
                          </td>
                          <td className="px-4 py-3 text-red-200">
                            {formatarReais(Number(d.valor))}
                          </td>
                          <td className="px-4 py-3 text-red-300/70">
                            {formatarData(d.created_at)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => iniciarEdicao(d)}
                              className="text-yellow-500 hover:text-yellow-400 mr-3"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => excluirDiaria(d.id)}
                              className="text-red-500 hover:text-red-400"
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 text-red-400/50 text-sm">
          Sistema de Controle de Diárias • {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
