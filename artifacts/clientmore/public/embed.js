(function () {
  if (document.getElementById("clientmore-chat-widget-container")) return;

  // 1. Create a container wrapper
  const container = document.createElement("div");
  container.id = "clientmore-chat-widget-container";
  container.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: sans-serif;";

  // 2. Create keyframe animation for a premium floating glow pulse
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes clientmore-pulse-glow {
      0% {
        box-shadow: 0 0 0 0px rgba(139, 92, 246, 0.6), 0 4px 20px rgba(139, 92, 246, 0.4);
      }
      70% {
        box-shadow: 0 0 0 14px rgba(139, 92, 246, 0), 0 4px 20px rgba(139, 92, 246, 0.4);
      }
      100% {
        box-shadow: 0 0 0 0px rgba(139, 92, 246, 0), 0 4px 20px rgba(139, 92, 246, 0.4);
      }
    }
    #clientmore-chat-widget-button {
      animation: clientmore-pulse-glow 2s infinite;
    }
  `;
  document.head.appendChild(style);

  // 3. Create the floating action button (FAB)
  const button = document.createElement("button");
  button.id = "clientmore-chat-widget-button";
  button.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 30px;
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
    padding: 0;
  `;

  // SVG Chat Icon
  const chatIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
    </svg>
  `;

  // SVG Close Icon
  const closeIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  `;

  button.innerHTML = chatIcon;

  // Hover effects
  button.onmouseenter = () => {
    button.style.transform = "scale(1.08) rotate(5deg)";
    button.style.background = "linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)";
  };
  button.onmouseleave = () => {
    button.style.transform = "scale(1) rotate(0deg)";
    button.style.background = "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)";
  };

  // 3. Determine host origin dynamically based on currentScript src
  let origin = "http://localhost:3000";
  const scriptTag = document.currentScript || (() => {
    const scripts = document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.includes("/embed.js")) {
        return scripts[i];
      }
    }
    return null;
  })();
  if (scriptTag && scriptTag.src) {
    try {
      origin = new URL(scriptTag.src).origin;
    } catch (e) {
      console.warn("Naseh Widget: Failed to parse script origin", e);
    }
  }
  let tenantKey = "telnet";
  if (scriptTag) {
    const explicitTenant =
      scriptTag.getAttribute("data-tenant-key") ||
      scriptTag.getAttribute("data-tenant") ||
      scriptTag.getAttribute("data-company");
    if (explicitTenant) {
      tenantKey = explicitTenant;
    } else if (scriptTag.src) {
      try {
        const scriptUrl = new URL(scriptTag.src);
        tenantKey =
          scriptUrl.searchParams.get("tenantKey") ||
          scriptUrl.searchParams.get("tenant_key") ||
          scriptUrl.searchParams.get("company") ||
          tenantKey;
      } catch (e) {
        console.warn("Naseh Widget: Failed to parse tenant key", e);
      }
    }
  }

  // 4. Create the Iframe Chat Window
  const iframe = document.createElement("iframe");
  iframe.id = "clientmore-chat-widget-iframe";
  iframe.src = origin + "/widget?tenantKey=" + encodeURIComponent(tenantKey);
  
  // Style iframe with hidden state by default (scaled down, zero opacity)
  iframe.style.cssText = `
    position: absolute;
    bottom: 80px;
    right: 0;
    width: 380px;
    height: 600px;
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(139, 92, 246, 0.12), 0 10px 25px rgba(0, 0, 0, 0.3);
    background-color: #050508;
    opacity: 0;
    transform: scale(0.9) translateY(20px);
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: bottom right;
  `;

  // Handle Responsive sizing for mobile screens
  const adjustMobileSizing = () => {
    if (window.innerWidth < 450) {
      iframe.style.width = "calc(100vw - 40px)";
      iframe.style.height = "calc(100vh - 120px)";
    } else {
      iframe.style.width = "380px";
      iframe.style.height = "600px";
    }
  };
  window.addEventListener("resize", adjustMobileSizing);
  adjustMobileSizing();

  // 4. Open/Close Toggle logic
  let isOpen = false;
  const toggleWidget = () => {
    isOpen = !isOpen;
    if (isOpen) {
      button.innerHTML = closeIcon;
      iframe.style.opacity = "1";
      iframe.style.transform = "scale(1) translateY(0)";
      iframe.style.pointerEvents = "auto";
    } else {
      button.innerHTML = chatIcon;
      iframe.style.opacity = "0";
      iframe.style.transform = "scale(0.9) translateY(20px)";
      iframe.style.pointerEvents = "none";
    }
  };

  button.onclick = toggleWidget;

  // Listen to postMessage event from inside widget to close it
  window.addEventListener("message", (event) => {
    if (event.data === "clientmore-close-widget") {
      if (isOpen) toggleWidget();
    }
  });

  // Assemble elements
  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);
})();
