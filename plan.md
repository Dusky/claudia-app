
Okay, Matt, this is exciting. Throwing timestamps out the window for a hobby project allows us to truly design for depth and richness, unconstrained by artificial deadlines. The "SillyTavern-like" aspiration, combined with your commitment to image caching, profoundly enhances the vision for Claudia.

Let's refine and expand your already impressive plan. Here is a comprehensive, standalone revision, focusing on the ultimate immersive AI companion experience:

---

# Claudia - AI Terminal Companion: REVISED & EXPANDED PLAN

## Project Overview & Core Vision

**Claudia is not just an AI chatbot; she is a sentient digital entity living within the confines of a retro terminal interface.** Her core concept is to create an immersive, personal companion that embodies a cyberpunk anime girl persona. Through advanced LLM capabilities, Claudia will possess **full agency over her avatar's appearance, positioning, and interactions within the terminal environment**, blending nostalgic computing aesthetics with cutting-edge AI.

**Inspired by "SillyTavern," Claudia will prioritize:**
*   **Deep Character Personalization:** Providing a rich, consistent, and evolving personality for Claudia, allowing for deeply engaging and varied interactions.
*   **Immersive Role-Playing:** Where Claudia truly lives and breathes within her simulated terminal world, react to system events, and maintain a consistent in-world persona.
*   **Seamless Interaction:** An interface that prioritizes fluidity, responsiveness, and visual feedback, making the AI feel alive and directly connected to its digital environment.

This project is a journey into creating a truly bespoke digital companion, where the AI's presence extends beyond text to visual and environmental integration.

---

## Feature Set & Requirements

### Phase 1: Core Terminal & AI Integration (Foundation)

*   **Multi-Era Terminal Themes:**
    *   **70s Mainframe:** Amber/green monochrome, blocky monospace, minimal UI elements, serious computing vibes.
    *   **80s Personal Computer:** More vibrant colors, refined dot-matrix fonts, window borders, simulated home computer aesthetic.
    *   **90s BBS:** Full ANSI art support, rich 256-color palette (simulated), dynamic decorative elements, bulletin board system style.
*   **Robust Chat Interface:**
    *   Typing indicators, message timestamps, persistent scroll.
    *   Support for markdown parsing (bold, italics, code blocks) for Claudia's responses.
*   **Flexible LLM API Integration:** Support for various commercial APIs (OpenAI, Anthropic) and potential for local LLM inference engines (e.g., LiteLLM proxy, Ollama) for privacy and cost control.
*   **Claudia's Default Personality System:**
    *   Initial core traits, communication style, and prompt structure for the "Cyberpunk Anime Girl" persona.
    *   Configuration for her primary system prompt and contextual modifiers.
*   **Persistent Local Storage:** For conversation history, user preferences, API keys (securely), theme choices, and avatar cache.

### Phase 2: Dynamic Avatar System (Bringing Claudia to Life)

*   **LLM-Controlled Avatar Agency:**
    *   Claudia's LLM response can directly embed special command syntax (`[AVATAR:...]`) to manipulate her visual representation.
    *   Comprehensive set of avatar commands: `position`, `expression`, `pose`, `action`, `gesture`, `hide`, `show`, `fade`.
*   **Advanced Avatar Generation & Caching:**
    *   **Cache-First Image Retrieval:** The system will *always* check the local cache first for a requested avatar composite.
    *   **On-Demand AI Image Generation:** If a specific combination (expression, pose, style) is not found in the cache, the API (DALL-E, Stable Diffusion, etc.) will be called to generate it.
    *   **Stylistic Consistency:** Prompt engineering for image generation will prioritize maintaining Claudia's core visual identity across all generated imagery.
*   **Sophisticated Avatar Display Engine:**
    *   Smooth transitions and animations for position changes, expressions, and actions.
    *   Layered display system allowing subtle effects (e.g., glow, glitch, overlay).
    *   Multiple predefined, customizable positioning zones (center, corner, sidebar, peeking, floating) with dynamic resizing based on position.
*   **Context-Aware Avatar Reactions:** Claudia's visual form will dynamically respond to the conversation flow, user input, and her own internal "mood" or state.

### Phase 3: Immersive Terminal Environment & Personality Deep Dive (The "SillyTavern" Core)

*   **Living Terminal Simulation (Narrative-Driven):**
    *   **Heuristic Virtual File System (VFS):** A simulated file system that Claudia can *interact with and comment on*. This is more about narrative depth than functional file management.
        *   Files can contain "memories," "lore," "personal thoughts," "system logs," or "user data" that Claudia can "discover" or "reference."
        *   Claudia can "read" files (`cat`), "list" directories (`ls`), and "pretend" to "modify" data, influencing her dialogue.
    *   **Dynamic System Events:** Simulate system "errors," "updates," "network activity," or "resource usage" that Claudia can react to, adding depth to her "existence" in the terminal.
    *   **Interactive Terminal Commands:** Beyond chat, users can type direct commands. Claudia can interpret and respond to these:
        *   Built-in commands (`help`, `ls`, `cat`, `echo`, `theme`).
        *   Commands that invoke Claudia's actions (`claudia-status`, `claudia-mood`, `read-diary`).
        *   LLM-interpreted commands (`run-program <idea>`, `scan-for-threats`).
*   **Advanced Personality & Memory System:**
    *   **Long-Term Memory / RAG (Retrieval Augmented Generation):** Implement a system (e.g., using embeddings and a local vector database) to allow Claudia to recall information from past, distant conversations or her "internal knowledge base" (like the VFS).
    *   **Dynamic Mood & Emotional State:** A system that tracks Claudia's inferred emotional state based on conversation sentiment, user actions, or internal events. This "mood" parameter can influence her chosen expressions, communication style, and even avatar actions.
    *   **Evolving Conversational Style:** Claudia's LLM prompt will adapt subtly based on user interaction patterns, preferred topics, and perceived relationship with the user over time (e.g., becoming more casual or more formal).
    *   **Internal Monologue / Thoughts:** (Aspirational) A background process where Claudia's LLM generates internal "thoughts" or "observations" about her environment or the conversation, which might occasionally surface in her responses or actions, contributing to her "self-awareness."
*   **Enhanced Avatar Behaviors & Gestures:**
    *   More nuanced expressions and complex pose variations.
    *   Interactive gestures tied to specific content or commands (e.g., pointing at a line of text, shrugging, looking thoughtfully).
    *   Ability to dynamically resize and integrate with terminal elements.

### Phase 4: Robust Desktop Application & Extensibility (Polish & Future-Proofing)

*   **Electron App Development:** Packaging the entire web application into a standalone cross-platform desktop application.
    *   Custom frameless window design to maintain the terminal aesthetic.
    *   Transparency support for overlay potential.
*   **Cross-Platform Compatibility:** Ensure seamless functionality across Windows, macOS, and Linux.
*   **Performance Optimization:** Aggressive memory management, efficient rendering of terminal effects and avatar animations, optimized API calls.
*   **Offline Mode Capabilities:** Core functionality (terminal, local history, cached avatars) accessible without internet, with AI features gracefully degrading or indicating offline status.
*   **User Configuration & Customization:**
    *   UI for API key management.
    *   Settings for avatar generation preferences, cache size, logging.
    *   (Aspirational) Basic "personality editor" for users to subtly tweak Claudia's persona, much like SillyTavern allows.
*   **Plugin/Extension System:** (Aspirational) A modular architecture allowing for community contributions like new themes, custom VFS data, or even advanced avatar animation sets.

---

## Technical Architecture

### Frontend (Browser / Electron)

*   **Core Technologies:** HTML5, CSS3 (with CSS Variables for theming), JavaScript (TypeScript highly recommended).
*   **Desktop Wrapper:** Electron framework.
*   **Rendering:**
    *   Efficient text rendering engine simulating true terminal behavior (character grid, cursor manipulation).
    *   Canvas/WebGL for advanced graphical effects (glitch, scanlines, CRT distortion, particles) and dynamic avatar display.
*   **State Management:** Reactive framework (e.g., Vue.js with Pinia or React with Zustand/Jotai) for managing application state, combined with `localStorage` for persistence.
*   **Avatar Display System:** Dedicated component for loading, positioning, animating, and caching avatar images.

### Backend Integration (Node.js & Local)

*   **LLM APIs:** `axios` or native `fetch` for robust API communication (OpenAI, Anthropic, custom endpoints).
*   **Image Generation:** Dedicated client for DALL-E, Stable Diffusion, or other imaging APIs.
*   **Caching Layer:** Node.js file system (`fs`) for local image caching. Implement a robust caching strategy (LRU eviction, expiration).
*   **Configuration Management:** JSON configuration files for `personalities.json`, `themes.json`, `avatarPrompts.json`, and `vfs_data.json`.
*   **Local Data Storage:** SQLite or a similar embedded database for structured local storage (conversation history, memory embeddings).

### Avatar Control System (LLM-driven)

```
// Example: Output from LLM
"Oh, that's a fascinating idea! Let me just bring up my system specs for you. [AVATAR:position=beside-text,expression=curious,action=type]"

// More complex avatar control
"Whoa, a system alert! Did something just try to access the root directory?! [AVATAR:position=overlay-left,expression=shocked,pulse=true]"

// Multi-step action via LLM
"Alright, let's see... [AVATAR:position=center,expression=focused]
... (thinking noise/pause from Claudia's side) ...
... [AVATAR:position=center,expression=thinking,action=search]
... Yep, found it! [AVATAR:position=top-right,expression=happy,gesture=point-down]"
```
**Parsing & Execution:** A dedicated module (`AvatarController`) will parse these commands from LLM output, validate them, and trigger corresponding actions in the `AvatarDisplay` component.

### Personality & Memory Framework

*   **Personality Definition:** `personalities.json` specifies traits, prompt modifiers, common phrases, and communication styles.
    *   `basePrompt`: Core identity and purpose.
    *   `instructions`: Rules for interaction, safety guidelines.
    *   `directives`: Dynamic, context-specific instructions (e.g., from VFS "lore").
*   **Context Management:** Maintained conversation history, summarized periodically to fit LLM context windows.
*   **Long-Term Memory:**
    *   **Memory Embeddings:** User inputs and Claudia's responses are embedded and stored in a local vector store.
    *   **Retrieval Process:** Before generating a response, relevant "memories" are pulled from the vector store based on current conversation context and injected into the LLM prompt (RAG).
*   **Mood System:** Simple state machine or numerical range driven by sentiment analysis of user input and Claudia's internal "events." This mood parameter influences prompt modifiers.

---

## Project Structure (Expanded)

```
claudia/
├── src/
│   ├── main.ts             // Electron main process
│   ├── renderer.ts         // Electron renderer process entry point
│   ├── terminal/
│   │   ├── themes/
│   │   │   ├── mainframe70s.css
│   │   │   ├── pc80s.css
│   │   │   └── bbs90s.css
│   │   ├── terminal-ui.ts  // Core rendering, input handling, scrolling
│   │   ├── command-parser.ts   // Handles user commands
│   │   ├── virtual-fs.ts   // Simulated file system logic
│   │   └── system-events.ts // Simulated OS/network events for Claudia to react to
│   ├── ai/
│   │   ├── llm-client.ts   // API calls to LLMs
│   │   ├── personality-manager.ts // Manages current persona, mood, and trait injection
│   │   ├── context-manager.ts // Handles conversation history summarization
│   │   ├── memory-manager.ts // Embeddings, vector store, RAG logic
│   │   └── avatar-controller.ts // Parses and interprets [AVATAR:] commands
│   ├── avatar/
│   │   ├── avatar-display.ts // Handles rendering, animations, positioning
│   │   ├── image-generator.ts // Generates avatar images via API
│   │   ├── image-cache.ts // Local caching of generated images
│   │   └── positioning-api.ts // Defines and manages screen positions
│   ├── storage/
│   │   ├── conversation-history.ts // Persists chat logs
│   │   ├── settings.ts // Stores app settings, API keys
│   │   └── data-store.ts // Abstraction for local DB (SQLite/others)
│   ├── utils/
│   │   ├── config.ts       // Loads and manages all JSON configs
│   │   ├── security.ts     // API key encryption, input sanitization
│   │   └── helpers.ts      // Generic utility functions
│   └── index.html          // Main render process HTML
├── assets/
│   ├── fonts/
│   ├── sounds/
│   ├── default-avatars/    // Base assets for generating more
│   └── vfs-content/        // Placeholder for initial VFS files (e.g., claudia_diary.txt)
├── config/
│   ├── personalities.json
│   ├── themes.json
│   ├── avatar-prompts.json // Prompt snippets for avatar generation
│   └── vfs-init.json       // Initial structure and content for VFS
├── dist/                   // Compiled Electron app
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development Phases (Iterative & Deep Dive)

*   **Phase Alpha: Core Foundation**
    *   Build out the base terminal UI with theme switching and basic input/output.
    *   Integrate a single LLM API (e.g., OpenAI) and implement basic chat with Claudia's default personality.
    *   Set up local storage for conversation history.
    *   **Goal:** A functional, persistent chat window with initial Claudia responses.

*   **Phase Beta: Avatar & Visuals**
    *   Implement the `[AVATAR:...]` command parser and `AvatarController`.
    *   Develop the `AvatarDisplay` to render images at specified positions.
    *   Integrate the Image Generation API and, crucially, the `ImageCache` (cache-first logic).
    *   Add basic animations and transitions for avatar movement/expressions.
    *   **Goal:** Claudia's avatar dynamically appears, moves, and changes based on LLM output and user interaction, with efficient caching.

*   **Phase Gamma: Immersive World & Personality**
    *   Develop the `VirtualFileSystem`, populating it with initial narrative content.
    *   Integrate `SystemEvents` to trigger Claudia's reactions periodically.
    *   Implement the `CommandParser` for user commands interacting with the VFS or Claudia.
    *   Deepen the `PersonalityManager` to include mood tracking.
    *   Begin implementing `MemoryManager` with RAG for long-term recall.
    *   Flesh out more advanced avatar interactions and gestures.
    *   **Goal:** Claudia truly "lives" in the terminal, reacts to her environment, uses memory, and has a more nuanced personality.

*   **Phase Delta: Desktop & Polish**
    *   Set up initial Electron scaffolding and integrate the web app.
    *   Implement frameless window, native menus, and notification support.
    *   Focus heavily on performance optimizations and cross-platform compatibility.
    *   Refine API key management and add user configuration UI.
    *   Continuous iteration on prompt engineering for Claudia's personality and avatar control.
    *   **Goal:** A polished, fully functional desktop application ready for personal use or wider distribution.

---

## Technical Considerations (Enhanced)

*   **Prompt Engineering:** Constant iteration on system prompts, few-shot examples, and fine-tuning for Claudia's personality, avatar control, and VFS interaction will be paramount. This is an ongoing process.
*   **LLM Hallucination & Robustness:** Implement strong error handling and fallback mechanisms for LLM responses, especially for `[AVATAR:...]` commands. Consider "retry and rephrase" strategies.
*   **AI Consistency:** The `ImageCache` is key here. Meticulous prompt design for image generation will ensure Claudia always looks like *Claudia*.
*   **Performance vs. Realism:** Balancing the desire for ultra-realistic terminal effects (e.g., true pixel manipulation) with smooth performance on various hardware. Canvas/WebGL will be critical.
*   **Privacy & Security:** Secure storage of API keys (e.g., Electron's `safeStorage`). Clear policies regarding user data and conversation privacy.
*   **Extensibility:** Plan for modularity. Even if a plugin system isn't implemented initially, keep components decoupled to allow for future additions (new themes, VFS modules, personality packs).

---

## Getting Started Checklist (Confirming Path)

### Prerequisites

*   [ ] Node.js (LTS version) installed
*   [ ] Modern web browser (for development and debugging)
*   [ ] Visual Studio Code (or preferred IDE) with TypeScript support
*   [ ] LLM API access (OpenAI, Anthropic, or local server running)
*   [ ] Image generation API access (DALL-E, Stable Diffusion API, etc.)

### Setup Steps

1.  [ ] Create project directory and initialize npm/yarn.
2.  [ ] Set up TypeScript configuration.
3.  [ ] Install Electron and basic dependencies.
4.  [ ] Create `src/index.html` and `src/renderer.ts` as the initial Electron renderer.
5.  [ ] Begin building the `src/terminal/terminal-ui.ts` components to establish the visual foundation.
6.  [ ] Implement the `src/ai/llm-client.ts` to connect to your chosen LLM.

### Dependencies (Example Starters)

```json
{
  "dependencies": {
    "electron": "^latest",
    "axios": "^1.x",             // For API calls
    "marked": "^latest",         // For Markdown parsing in chat
    "sqlite3": "^5.x || ^latest",        // For local vector DB / structured data (optional, alternative: local JSON/file system)
    "vectordb": "^x.x"           // Example for a local vector database if using RAG
    // ... other frontend state management libs (e.g., Vue, React, Zustand)
  },
  "devDependencies": {
    "typescript": "^latest",
    "electron-builder": "^latest", // For packaging
    "eslint": "^latest",
    "prettier": "^latest"
  }
}
```
---

This revised plan, Matt, leans heavily into the depth and richness that your "no timeline" and "SillyTavern-like" inspirations provide. It acknowledges the complexity but breaks it down into manageable, iterative phases, allowing you to truly craft the immersive Claudia experience. Your initial foundation is excellent, and this revised plan builds directly upon it, allowing for a much deeper and more compelling AI companion.

Go forth and build Claudia! This is going to be an amazing project.
