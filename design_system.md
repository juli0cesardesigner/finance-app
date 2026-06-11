# Design System: PWA Minimalista Premium (Dark Mode)

Este documento define a especificação abstrata de **Design System** para a criação de Progressive Web Apps (PWAs) minimalistas voltados a dispositivos móveis. As definições a seguir estabelecem padrões de identidade visual, comportamento de interface e arquitetura de componentes genéricos, sem vínculos com domínios específicos de negócios.

---

## 💻 Diretrizes Gerais & Filosofia

O sistema é construído sobre a filosofia de **minimalismo funcional e imersão**. Ele foi projetado focando exclusivamente em dispositivos móveis (Mobile-First), eliminando ruídos visuais tradicionais da web para mimetizar a experiência de um aplicativo nativo.

*   **Aparência Nativa (Apple-Style):** Cantos arredondados acentuados, tipografia moderna e limpa, efeito de glassmorfismo e micro-interações táteis responsivas ao toque.
*   **Foco Visual:** Uso de fundo preto puro (`#000000`) para maximizar o contraste com elementos em primeiro plano e otimizar o consumo energético em telas OLED.
*   **Formulários em Tela Cheia:** Modais de entrada e edição de dados utilizam transições verticais (slide up) que ocupam a área total útil do viewport, otimizando o espaço físico para o teclado virtual.

---

## 🎨 Cores & Efeitos Visuais

A paleta é centrada em um tom escuro profundo, utilizando acentos de cor sutis apenas para denotar interações principais ou feedbacks específicos.

### 🔴 Paleta de Cores (CSS Variables)

```css
:root {
  /* Fundo e Texto Principal */
  --bg-primary: #000000;
  --bg-secondary: #09090b; /* Elemento neutro secundário */
  --text-primary: #f4f4f5; /* Texto principal de alto contraste */
  --text-secondary: #a1a1aa; /* Texto de apoio e legendas */
  --text-muted: #52525b; /* Textos desativados ou de menor relevância */

  /* Cores de Ação (Brand & Accent Colors) */
  --accent: #3b82f6; /* Cor de destaque para interações primárias, focos e seleção */
  --accent-hover: #2563eb;
  --accent-dim: rgba(59, 130, 246, 0.1); /* Destaque com opacidade reduzida */
  --accent-border: rgba(59, 130, 246, 0.3);

  /* Elementos de Interface (Glassmorphism) */
  --card-bg: rgba(28, 28, 30, 0.8); /* Fundo translúcido para cartões e modais */
  --card-border: rgba(255, 255, 255, 0.1);
  --border-dashed: rgba(255, 255, 255, 0.05);

  /* Estados de Alerta / Destrutivos */
  --destructive: #ef4444; /* Cor para indicar exclusão, erro ou perigo */
  --destructive-dim: rgba(239, 68, 68, 0.1);
}
```

### ✨ Efeitos de Luz & Profundidade

Filtros de luz difusa em segundo plano quebram a monotonia do fundo escuro:

1.  **Ponto de Luz Primário (Superior Esquerdo):** Círculo de luz difusa na cor de destaque.
    *   `fixed top-[-10%] -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10`
2.  **Ponto de Luz Secundário (Inferior Direito):** Círculo de luz difusa em tonalidade complementar (ex: roxo/magenta).
    *   `fixed bottom-[-5%] -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[150px] pointer-events-none -z-10`

### 🌫️ Glassmorfismo

Todas as superfícies interativas que se sobrepõem ao fundo devem usar:
*   `bg-card-bg backdrop-blur-2xl border border-card-border`

---

## 🔤 Tipografia & Hierarquia Visual

O sistema emprega fontes geométricas sem serifa (sans-serif) para manter o visual limpo e contemporâneo.

| Nível | Estilos CSS / Tailwind | Propósito | Padrão Visual |
| :--- | :--- | :--- | :--- |
| **Título Principal** | `text-sm font-black uppercase tracking-[0.3em] text-zinc-400` | Título da view principal | Caixa alta, espaçamento largo, tom neutro |
| **Subtítulo / Seção** | `font-bold text-xs uppercase tracking-widest text-zinc-500` | Agrupadores e divisórias | Caixa alta, tamanho reduzido, tom médio |
| **Texto de Cartão** | `text-lg font-semibold tracking-tight text-white` | Informação principal do elemento | Médio-grande, seminegrito, alto contraste |
| **Texto Secundário** | `text-zinc-400 text-xs font-medium italic` | Informação complementar ou opcional | Tamanho pequeno, tom neutro, estilo itálico |
| **Badge Separador** | `text-[9px] font-black uppercase bg-zinc-800/50 px-1.5 py-0.5 rounded-md` | Indicador de alternativas | Caixa alta, encapsulado, tamanho micro |
| **Badge de Métrica** | `text-[10px] font-bold uppercase tracking-widest text-accent` | Contadores ou quantidades | Cor de destaque, espaçado |

---

## 📱 Layout & Comportamento PWA (Anti-Scroll & Safe Area)

O layout deve ser totalmente responsivo aos limites físicos e interativos de telas móveis.

### 1. Prevenção de Rolagem do Navegador
Ocultamos barras de rolagem nativas para emular a janela de um aplicativo independente:

```css
* {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
*::-webkit-scrollbar {
  display: none;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  overflow-x: hidden;
  overscroll-behavior-y: contain; /* Bloqueia o recarregamento por arrasto para cima no topo */
  min-height: 100dvh;
  
  /* Ajuste de margens internas para áreas seguras do dispositivo */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 2. Sincronização com o Teclado Virtual (Visual Viewport API)
Captura dinâmica da altura real visível quando o teclado virtual é acionado, aplicando esta dimensão nos formulários em tela cheia para evitar o encobrimento dos botões de ação:

```typescript
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
```

---

## 🧩 Componentes Principais

### 1. Cartão de Elemento Interativo (Item Card)
Superfície com cantos arredondados contendo um seletor de estado (marcador de conclusão), texto de identificação e botões de ação rápida.

*   **Comportamento Visual:** Reação ao toque (`active:scale-[0.98]`).
*   **Layout:** Disposição horizontal em linha flexível.

### 2. Botão Flutuante de Ação Primária (Floating Action Button - FAB)
Posicionado de forma fixa e centralizada na base do dispositivo para garantir fácil alcance com o polegar.

*   **Comportamento Visual:** Sombra projetada acentuada na cor de destaque para dar sensação de flutuação sobre os demais elementos.

### 3. Máscara de Desfoque Base (Bottom Fade)
Uma camada sobreposta e fixa na parte inferior da tela, que esmaece os cartões ao rolar e cria um fundo legível para o FAB:

```tsx
<div 
  className="fixed bottom-0 left-0 right-0 h-[40vh] pointer-events-none z-40"
  style={{
    background: "linear-gradient(to top, var(--bg-primary) 0%, var(--bg-primary) 20%, transparent 100%)",
    backdropFilter: "blur(8px)",
    maskImage: "linear-gradient(to top, black 20%, transparent 100%)",
    WebkitMaskImage: "linear-gradient(to top, black 20%, transparent 100%)"
  }}
/>
```

### 4. Cabeçalho de Agrupamento Expansível (Accordion Header)
Cabeçalho simples para agrupar elementos secundários ou inativos, exibindo um contador numérico e uma seta indicadora de estado rotativa.

---

## 🎬 Especificações de Movimento (Animações)

Animações baseadas em princípios físicos (mola) fornecem a sensação de peso e naturalidade ao aplicativo.

### 1. Transição de Entrada e Saída de Listas
*   **Tipo:** Spring (Mola).
*   **Propriedades:** `stiffness: 500`, `damping: 30`.
*   **Comportamento:** O elemento surge com leve escala (`0.95` a `1.0`) acompanhado de opacidade gradual.

### 2. Transição de Abertura de Formulário
*   **Tipo:** Spring.
*   **Propriedades:** `stiffness: 200`, `damping: 25`.
*   **Comportamento:** O contêiner de entrada de dados surge de baixo para cima (`y: 100` a `y: 0`), enquanto a lista ao fundo sofre uma sutil redução de escala e aplicação de desfoque.

---

## ⚙️ Diretrizes para Configuração de PWA (Next.js)

Configurações essenciais no arquivo de layout para garantir o comportamento de aplicativo nativo instalado:

```typescript
export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Mescla a barra de status com o fundo do app
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Bloqueia o zoom duplo para interações mais responsivas
};
```
