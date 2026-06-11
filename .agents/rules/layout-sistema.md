---
trigger: always_on
---

# Diretrizes de Design & Controles Customizados Premium

*   **PROIBIDO usar `<select>` e `<option>` nativos do HTML:** Toda caixa de seleção ou dropdown do sistema deve ser implementado de forma 100% customizada (ex: usando botão de gatilho com ícone `ChevronDown` e menus absolutos flutuantes estilizados). É expressamente proibido usar elementos de seleção nativos do navegador que invoquem os pop-ups de sistema operacional.
*   **PROIBIDO usar inputs ou diálogos nativos sem estilo:** Não utilize caixas de diálogo nativas (ex: `alert()`, `confirm()`, `prompt()`) ou inputs nativos como `<input type="date">` ou `<input type="color">` sem estilização do tema. Controles de data, cor ou modais de alerta devem ser componentes customizados do React integrados ao design.
*   **Consistência com OLED Premium Dark Mode:** Todos os elementos de formulário, inputs de texto e seletores devem herdar a estética OLED de fundo preto puro (`#000000` / `#09090b`), bordas discretas (`border-zinc-800` / `border-zinc-900`), cantos arredondados generosos (`rounded-2xl` / `rounded-3xl`) e efeito translúcido glassmorphic (`backdrop-blur-xl`), banindo qualquer visual padrão de navegador ou OS.
