# 🧊 Universal Mesh Engine PRO

Uma ferramenta poderosa e leve baseada em WebGL (Three.js) para visualização, manipulação e edição de arquivos de malha (.mesh / .rbxm / .obj). Projetada com uma interface moderna inspirada em softwares profissionais como **Roblox Studio** e **Blender**.

---

### 🌐 Preview ao Vivo
> **Status do Sistema:** 🟢 Online / 🛠️ Manutenção (verificar `manutencao.html`)  
> **Acesse agora:** [https://kauericardo159-hub.github.io/View-Model/](https://kauericardo159-hub.github.io/View-Model/)

---

## ✨ Funcionalidades

### 🔍 Modo Visualizador (View Model)
- **Renderização de Alta Performance:** Suporte para mapeamento de tons ACES Filmic.
- **Inspeção de Topologia:** Alternância rápida para modo **Wireframe**.
- **Rotação Precisa:** Sistema de eixos (X, Y, Z) com graus configuráveis.

### 🛠️ Modo Edição (Novo!)
- **Multi-instância:** Carregue quantos arquivos quiser na mesma cena.
- **Hierarchy (Lista de Objetos):** Selecione, renomeie ou delete peças individualmente.
- **Gizmos de Transformação:** Mova, gire e dimensione objetos usando eixos visuais (estilo Roblox Studio).
- **Sistema de Snap:** Controle a velocidade e o "passo" do movimento (Incremento).
- **Mesclagem:** Junte múltiplos arquivos em um único modelo final.

### 🔄 Conversão e Exportação
- Suporte nativo para exportar em formatos padrão da indústria: **OBJ** e **GLTF**.

---

## 📸 Screenshots do Projeto

<p align="center">
  <img src="screenshots/preview.png" width="400" alt="Visualizador Principal">
  <img src="screenshots/preview2.png" width="400" alt="Modo Edição Pro">
</p>

---

## 🛠️ Tecnologias Utilizadas

* [Three.js](https://threejs.org/) - Engine 3D para Web.
* [JavaScript ES6+](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript) - Lógica principal e Workers para processamento pesado.
* [HTML5/CSS3](https://developer.mozilla.org/pt-BR/docs/Web/CSS) - UI responsiva com Glassmorphism.

---

## 🚀 Como Usar o Modo Edição

1. **Entrar:** No menu principal, clique em **MODO EDIÇÃO 🛠️**.
2. **Importar:** Use o botão de upload para adicionar várias peças ao cenário.
3. **Selecionar:** Clique diretamente no objeto 3D ou use a lista na lateral esquerda.
4. **Transformar:** - Tecla **G**: Mover
   - Tecla **R**: Girar
   - Tecla **S**: Escalar (Tamanho)
5. **Configurar Snap:** Ajuste o "Passo" para definir a precisão do movimento.
6. **Juntar:** Digite o nome do projeto e clique em **JUNTAR (OBJ)** para baixar tudo unificado.

---

## 📦 Instalação Local

1. Clone o repositório:
   ```bash
   git clone [https://github.com/kauericardo159-hub/View-Model.git](https://github.com/kauericardo159-hub/View-Model.git)
