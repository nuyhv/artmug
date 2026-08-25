// ============================================================
// Artmug 통합 페이지 기능
//
// 작가 데이터는 data.js에서 관리합니다.
//
// URL:
//
// ?type=live2d-ld
// ?type=live2d-sd-detail
// ?type=live2d-sd-simple
//
// type이 없거나 존재하지 않는 값이면
// "샘플 준비중입니다."만 가운데 표시합니다.
// ============================================================

// ============================================================
// URL 파라미터
// ============================================================

const urlParams = new URLSearchParams(window.location.search);

const requestedType = urlParams.get("type");

// ============================================================
// 타입 확인
// ============================================================

const hasValidType =
  requestedType && Object.prototype.hasOwnProperty.call(categoryData, requestedType);

const currentType = hasValidType ? requestedType : null;

const currentCategory = hasValidType ? categoryData[currentType] : null;

// ============================================================
// 페이지 헤더 적용
// ============================================================

function renderPageHeader() {
  const eyebrow = document.getElementById("page-eyebrow");

  const title = document.getElementById("page-title");

  if (!eyebrow || !title) {
    return;
  }

  if (!currentCategory) {
    eyebrow.textContent = "";
    title.textContent = "";
    document.title = "샘플 준비중";
    return;
  }

  eyebrow.textContent = currentCategory.eyebrow;

  title.textContent = currentCategory.title;

  document.title = `${currentCategory.title} · ${currentType}`;
}

// ============================================================
// 모바일 / 터치 환경
// ============================================================

const isTouchDevice =
  window.matchMedia("(hover: none)").matches || window.matchMedia("(pointer: coarse)").matches;

// ============================================================
// 모바일 화면 여부
// ============================================================

function isMobileViewport() {
  return window.matchMedia("(max-width: 640px)").matches;
}

// ============================================================
// 현재 페이지 Origin
// ============================================================

const pageOrigin = window.location.origin;

// ============================================================
// iframe 높이 자동 전달
//
// 이 페이지가 iframe 내부에서 실행될 경우
// 실제 문서 높이를 부모 페이지로 전달합니다.
//
// ============================================================

let iframeResizeFrame = null;

function getDocumentHeight() {
  const html = document.documentElement;

  const body = document.body;

  if (!html && !body) {
    return 0;
  }

  const htmlHeight = html
    ? Math.max(html.scrollHeight || 0, html.offsetHeight || 0, html.clientHeight || 0)
    : 0;

  const bodyHeight = body
    ? Math.max(body.scrollHeight || 0, body.offsetHeight || 0, body.clientHeight || 0)
    : 0;

  return Math.max(htmlHeight, bodyHeight);
}

function sendResizeMessage() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.parent === window) {
    return;
  }

  const height = getDocumentHeight();

  if (!Number.isFinite(height) || height <= 0) {
    return;
  }

  const roundedHeight = Math.ceil(height);

  window.parent.postMessage(
    {
      type: "resize",
      height: roundedHeight,
    },
    "*",
  );
}

function notifyParentResize() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.parent === window) {
    return;
  }

  if (iframeResizeFrame !== null) {
    cancelAnimationFrame(iframeResizeFrame);
  }

  iframeResizeFrame = requestAnimationFrame(() => {
    iframeResizeFrame = null;

    sendResizeMessage();
  });
}

// ============================================================
// iframe ResizeObserver
// ============================================================

function setupIframeResizeObserver() {
  // ----------------------------------------------------------
  // 최초 즉시 전달
  // ----------------------------------------------------------

  notifyParentResize();

  // ----------------------------------------------------------
  // 레이아웃 계산 직후 여러 번 전달
  //
  // 부모 페이지의 message listener가 iframe보다 늦게
  // 등록되는 경우를 대비합니다.
  // ----------------------------------------------------------

  requestAnimationFrame(() => {
    notifyParentResize();

    requestAnimationFrame(() => {
      notifyParentResize();

      requestAnimationFrame(() => {
        notifyParentResize();
      });
    });
  });

  // ----------------------------------------------------------
  // 초기 로딩 재전송
  // ----------------------------------------------------------

  const initialResizeDelays = [50, 100, 200, 300, 500, 700, 1000, 1500, 2000];

  initialResizeDelays.forEach((delay) => {
    setTimeout(() => {
      notifyParentResize();
    }, delay);
  });

  // ----------------------------------------------------------
  // ResizeObserver
  // ----------------------------------------------------------

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      notifyParentResize();
    });

    if (document.documentElement) {
      resizeObserver.observe(document.documentElement);
    }

    if (document.body) {
      resizeObserver.observe(document.body);
    }
  }

  // ----------------------------------------------------------
  // MutationObserver
  //
  // 작가 카드가 동적으로 생성되거나
  // YouTube 플레이어가 DOM을 변경하는 경우 감지
  // ----------------------------------------------------------

  if (typeof MutationObserver !== "undefined") {
    const mutationObserver = new MutationObserver(() => {
      notifyParentResize();
    });

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  // ----------------------------------------------------------
  // 브라우저 크기 변경
  // ----------------------------------------------------------

  window.addEventListener("resize", () => {
    notifyParentResize();
  });

  // ----------------------------------------------------------
  // 페이지 전체 로딩 완료
  // ----------------------------------------------------------

  window.addEventListener("load", () => {
    notifyParentResize();

    setTimeout(() => {
      notifyParentResize();
    }, 100);

    setTimeout(() => {
      notifyParentResize();
    }, 300);

    setTimeout(() => {
      notifyParentResize();
    }, 500);
  });

  // ----------------------------------------------------------
  // 폰트 로딩 완료
  // ----------------------------------------------------------

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(() => {
      notifyParentResize();
    });
  }
}

// ============================================================
// YouTube IFrame API
// ============================================================

let youtubeApiPromise = null;

function loadYoutubeApi() {
  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve) => {
    if (window.YT && typeof window.YT.Player === "function") {
      resolve(window.YT);
      return;
    }

    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") {
        previousCallback();
      }

      resolve(window.YT);

      notifyParentResize();
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!existingScript) {
      const script = document.createElement("script");

      script.src = "https://www.youtube.com/iframe_api";

      script.async = true;

      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

// ============================================================
// YouTube URL → Video ID
// ============================================================

function getYoutubeVideoId(url) {
  if (!url || typeof url !== "string") {
    return "";
  }

  try {
    const parsed = new URL(url);

    const hostname = parsed.hostname.toLowerCase();

    if (hostname === "www.youtube.com" || hostname === "youtube.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v") || "";
      }

      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
      }

      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
      }
    }

    if (hostname === "youtu.be") {
      return parsed.pathname.replace(/^\/+/, "").split("/")[0] || "";
    }
  } catch {
    return "";
  }

  return "";
}

// ============================================================
// YouTube 썸네일 URL
// ============================================================

function getYoutubeThumbnailUrl(videoId) {
  if (!videoId) {
    return "";
  }

  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

// ============================================================
// 텍스트 요소 생성
// ============================================================

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);

  element.className = className;

  element.textContent = text ?? "";

  return element;
}

// ============================================================
// YouTube 모달 상태
// ============================================================

let activeModal = null;
let activeModalPlayer = null;
let activeModalKeydownHandler = null;

// ============================================================
// YouTube 모달 닫기
// ============================================================

function closeYoutubeModal() {
  if (!activeModal) {
    return;
  }

  if (activeModalPlayer && typeof activeModalPlayer.destroy === "function") {
    try {
      activeModalPlayer.destroy();
    } catch {
      // 이미 제거된 경우 무시
    }
  }

  activeModalPlayer = null;

  if (activeModalKeydownHandler) {
    document.removeEventListener("keydown", activeModalKeydownHandler);

    activeModalKeydownHandler = null;
  }

  activeModal.remove();

  activeModal = null;

  notifyParentResize();
}

// ============================================================
// YouTube 모달 열기
// ============================================================

function openYoutubeModal(videoId, artistName, previewPlayer) {
  if (!videoId) {
    return;
  }

  if (isMobileViewport()) {
    return;
  }

  const artmugWindow = document.querySelector(".artmug-window");

  if (!artmugWindow) {
    return;
  }

  closeYoutubeModal();

  if (previewPlayer && typeof previewPlayer.pauseVideo === "function") {
    try {
      previewPlayer.pauseVideo();
    } catch {
      // 무시
    }
  }

  const modal = document.createElement("div");

  modal.className = "youtube-modal";

  modal.setAttribute("role", "dialog");

  modal.setAttribute("aria-modal", "true");

  modal.setAttribute("aria-label", `${artistName} YouTube 영상`);

  const backdrop = document.createElement("div");

  backdrop.className = "youtube-modal-backdrop";

  const content = document.createElement("div");

  content.className = "youtube-modal-content";

  content.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const closeButton = document.createElement("button");

  closeButton.type = "button";

  closeButton.className = "youtube-modal-close";

  closeButton.setAttribute("aria-label", "영상 닫기");

  closeButton.innerHTML = `
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  `;

  closeButton.addEventListener("click", closeYoutubeModal);

  const title = document.createElement("div");

  title.className = "youtube-modal-title";

  title.textContent = artistName || "YouTube";

  const playerWrapper = document.createElement("div");

  playerWrapper.className = "youtube-modal-player";

  const playerContainer = document.createElement("div");

  playerContainer.className = "youtube-modal-player-container";

  playerWrapper.appendChild(playerContainer);

  content.append(closeButton, title, playerWrapper);

  modal.append(backdrop, content);

  artmugWindow.appendChild(modal);

  activeModal = modal;

  backdrop.addEventListener("click", closeYoutubeModal);

  activeModalKeydownHandler = (event) => {
    if (event.key === "Escape" && activeModal === modal) {
      closeYoutubeModal();
    }
  };

  document.addEventListener("keydown", activeModalKeydownHandler);

  notifyParentResize();

  void loadYoutubeApi().then(() => {
    if (activeModal !== modal || !window.YT || typeof window.YT.Player !== "function") {
      return;
    }

    activeModalPlayer = new window.YT.Player(playerContainer, {
      videoId,

      playerVars: {
        autoplay: 1,
        controls: 1,
        disablekb: 0,
        fs: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        origin: pageOrigin,
      },

      events: {
        onReady(event) {
          event.target.playVideo();

          notifyParentResize();
        },

        onError(event) {
          console.error(`[YouTube Modal] ${artistName} 재생 오류:`, event.data);

          closeYoutubeModal();
        },
      },
    });
  });
}

// ============================================================
// 작가 카드 생성
// ============================================================

function createArtistCard(artist) {
  const card = document.createElement("article");

  card.className = "artist-card";

  const video = document.createElement("div");

  video.className = "artist-video";

  const videoId = getYoutubeVideoId(artist.youtube);

  if (!videoId) {
    const message = document.createElement("div");

    message.className = "video-empty";

    message.textContent = "샘플 준비중입니다.";

    video.appendChild(message);
  } else {
    const thumbnail = document.createElement("img");

    thumbnail.className = "video-thumbnail";

    thumbnail.src = getYoutubeThumbnailUrl(videoId);

    thumbnail.alt = `${artist.name} YouTube 샘플 영상`;

    thumbnail.loading = "lazy";

    thumbnail.decoding = "async";

    thumbnail.draggable = false;

    thumbnail.addEventListener("error", () => {
      if (thumbnail.src.includes("/hqdefault.jpg")) {
        thumbnail.src = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
      }

      notifyParentResize();
    });

    thumbnail.addEventListener("load", () => {
      notifyParentResize();
    });

    video.appendChild(thumbnail);

    const playerContainer = document.createElement("div");

    playerContainer.className = "youtube-player";

    video.appendChild(playerContainer);

    const videoButton = document.createElement("button");

    videoButton.type = "button";

    videoButton.className = "video-click-target";

    videoButton.setAttribute("aria-label", `${artist.name} YouTube 영상 크게 보기`);

    video.appendChild(videoButton);

    let player = null;
    let playerReady = false;
    let isCardHovered = false;
    let previewUnavailable = false;

    const setPlayingState = (playing) => {
      if (playing) {
        card.classList.add("is-playing");
      } else {
        card.classList.remove("is-playing");
      }

      notifyParentResize();
    };

    const setPreviewUnavailable = () => {
      previewUnavailable = true;

      isCardHovered = false;

      card.classList.remove("is-hovered");

      card.classList.remove("is-playing");

      card.classList.add("preview-unavailable");

      if (player && playerReady) {
        try {
          player.pauseVideo();
        } catch {
          // 무시
        }
      }

      notifyParentResize();
    };

    videoButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (previewUnavailable) {
        const youtubeUrl = typeof artist.youtube === "string" ? artist.youtube.trim() : "";

        if (youtubeUrl) {
          window.open(youtubeUrl, "_blank", "noopener,noreferrer");
        }

        return;
      }

      if (isMobileViewport()) {
        const youtubeUrl = typeof artist.youtube === "string" ? artist.youtube.trim() : "";

        if (youtubeUrl) {
          window.open(youtubeUrl, "_blank", "noopener,noreferrer");
        }

        return;
      }

      openYoutubeModal(videoId, artist.name, player);
    });

    const createPlayer = async () => {
      if (player || !videoId || previewUnavailable) {
        return;
      }

      await loadYoutubeApi();

      if (previewUnavailable || !window.YT || typeof window.YT.Player !== "function") {
        return;
      }

      player = new window.YT.Player(playerContainer, {
        videoId,

        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: pageOrigin,
        },

        events: {
          onReady(event) {
            playerReady = true;

            event.target.mute();

            if (isCardHovered && !isTouchDevice && !previewUnavailable) {
              event.target.playVideo();
            }

            notifyParentResize();
          },

          onStateChange(event) {
            if (!window.YT || !window.YT.PlayerState) {
              return;
            }

            if (event.data === window.YT.PlayerState.PLAYING) {
              setPlayingState(true);
            }

            if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.ENDED
            ) {
              setPlayingState(false);
            }
          },

          onError(event) {
            console.error(`[YouTube Preview] ${artist.name} 오류 코드:`, event.data);

            setPreviewUnavailable();
          },
        },
      });
    };

    card.addEventListener("mouseenter", () => {
      if (isTouchDevice || previewUnavailable) {
        return;
      }

      isCardHovered = true;

      card.classList.add("is-hovered");

      void createPlayer();

      if (player && playerReady) {
        player.mute();
        player.playVideo();
      }
    });

    card.addEventListener("mouseleave", () => {
      if (isTouchDevice || previewUnavailable) {
        return;
      }

      isCardHovered = false;

      card.classList.remove("is-hovered");

      setPlayingState(false);

      if (player && playerReady) {
        player.pauseVideo();
      }
    });
  }

  const body = document.createElement("div");

  body.className = "artist-body";

  const name = createTextElement("h2", "artist-name", artist.name || "작가");

  const actions = document.createElement("div");

  actions.className = "artist-actions";

  const link = document.createElement("a");

  link.className = "artist-link";

  link.textContent = "작가 페이지 바로가기";

  link.href = artist.pageUrl || "#";

  link.target = "_blank";

  link.rel = "noopener noreferrer";

  actions.appendChild(link);

  body.append(name, actions);

  card.append(video, body);

  return card;
}

// ============================================================
// 작가 카드 가져오기
// ============================================================

function getArtistCards() {
  const grid = document.getElementById("artist-grid");

  if (!grid) {
    return [];
  }

  return Array.from(grid.children).filter((element) => element.classList.contains("artist-card"));
}

// ============================================================
// 인디케이터 상태
// ============================================================

let indicatorScrollFrame = null;

// ============================================================
// 인디케이터 업데이트
// ============================================================

function updateArtistDots() {
  const grid = document.getElementById("artist-grid");

  const dots = document.getElementById("artist-dots");

  if (!grid || !dots) {
    return;
  }

  const cards = getArtistCards();

  const dotButtons = Array.from(dots.querySelectorAll(".artist-dot"));

  if (!isMobileViewport() || cards.length <= 1) {
    dots.classList.remove("is-visible");

    notifyParentResize();

    return;
  }

  dots.classList.add("is-visible");

  const scrollLeft = grid.scrollLeft;

  let currentIndex = 0;

  let closestDistance = Infinity;

  cards.forEach((card, index) => {
    const distance = Math.abs(card.offsetLeft - scrollLeft);

    if (distance < closestDistance) {
      closestDistance = distance;

      currentIndex = index;
    }
  });

  dotButtons.forEach((dot, index) => {
    const active = index === currentIndex;

    dot.classList.toggle("is-active", active);

    dot.setAttribute("aria-current", active ? "true" : "false");
  });
}

// ============================================================
// 인디케이터 생성
// ============================================================

function createArtistDots() {
  const grid = document.getElementById("artist-grid");

  const dots = document.getElementById("artist-dots");

  if (!grid || !dots) {
    return;
  }

  const cards = getArtistCards();

  dots.replaceChildren();

  if (cards.length <= 1) {
    dots.classList.remove("is-visible");

    notifyParentResize();

    return;
  }

  cards.forEach((card, index) => {
    const dot = document.createElement("button");

    dot.type = "button";

    dot.className = "artist-dot";

    dot.setAttribute("aria-label", `${index + 1}번 작가 보기`);

    dot.setAttribute("aria-current", index === 0 ? "true" : "false");

    dot.addEventListener("click", () => {
      if (!isMobileViewport()) {
        return;
      }

      grid.scrollTo({
        left: card.offsetLeft,
        behavior: "smooth",
      });
    });

    dots.appendChild(dot);
  });

  updateArtistDots();
}

// ============================================================
// 모바일 스크롤 초기화
// ============================================================

function resetArtistScroll() {
  const grid = document.getElementById("artist-grid");

  if (!grid || !isMobileViewport()) {
    return;
  }

  grid.scrollLeft = 0;

  requestAnimationFrame(() => {
    grid.scrollLeft = 0;

    updateArtistDots();

    notifyParentResize();
  });
}

// ============================================================
// 모바일 인디케이터 설정
// ============================================================

function setupArtistIndicator() {
  const grid = document.getElementById("artist-grid");

  const dots = document.getElementById("artist-dots");

  if (!grid || !dots) {
    return;
  }

  createArtistDots();

  resetArtistScroll();

  grid.addEventListener(
    "scroll",
    () => {
      if (indicatorScrollFrame !== null) {
        cancelAnimationFrame(indicatorScrollFrame);
      }

      indicatorScrollFrame = requestAnimationFrame(() => {
        updateArtistDots();

        indicatorScrollFrame = null;
      });
    },
    {
      passive: true,
    },
  );

  window.addEventListener("resize", () => {
    createArtistDots();

    if (isMobileViewport()) {
      resetArtistScroll();
    }

    notifyParentResize();
  });
}

// ============================================================
// 준비중 메시지 렌더링
// ============================================================

function renderPreparingMessage() {
  const grid = document.getElementById("artist-grid");

  if (!grid) {
    return;
  }

  grid.replaceChildren();

  const message = createTextElement("div", "empty-state", "준비중입니다.");

  grid.appendChild(message);

  const dots = document.getElementById("artist-dots");

  if (dots) {
    dots.replaceChildren();

    dots.classList.remove("is-visible");
  }

  notifyParentResize();
}

// ============================================================
// 작가 렌더링
// ============================================================

function renderArtists() {
  const grid = document.getElementById("artist-grid");

  if (!grid) {
    return;
  }

  // ==========================================================
  // 타입이 없거나 잘못된 경우
  // ==========================================================

  if (!currentCategory) {
    renderPreparingMessage();

    return;
  }

  grid.replaceChildren();

  const validArtists = Array.isArray(currentCategory.artists)
    ? currentCategory.artists.filter(
        (artist) => artist && typeof artist.name === "string" && artist.name.trim() !== "",
      )
    : [];

  // ==========================================================
  // 작가 데이터가 없는 경우
  // ==========================================================

  if (validArtists.length === 0) {
    renderPreparingMessage();

    return;
  }

  validArtists.forEach((artist) => {
    grid.appendChild(createArtistCard(artist));
  });

  // 카드가 실제로 DOM에 추가된 이후 높이 측정
  notifyParentResize();
}

// ============================================================
// 실행
// ============================================================

renderPageHeader();

renderArtists();

setupArtistIndicator();

setupIframeResizeObserver();

// ============================================================
// 최초 렌더링 이후 추가 높이 측정
// ============================================================

window.addEventListener("load", () => {
  notifyParentResize();

  requestAnimationFrame(() => {
    notifyParentResize();
  });
});
