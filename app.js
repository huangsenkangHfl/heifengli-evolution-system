const API_BASE = "https://aihot.virxact.com/api/public/items";
const CACHE_KEY = "heifengli:evolution:v1:items";
const CACHE_TIME_KEY = "heifengli:evolution:v1:updatedAt";
const MAX_CACHE_DAYS = 7;

const FILTERS = {
  AIGC: ["aigc", "生成式", "生成式 ai", "内容生成", "创作"],
  "视频生成": ["video", "视频生成", "sora", "runway", "pika", "veo", "可灵", "hailuo", "wan"],
  "图像生成": ["image", "图像生成", "图片生成", "midjourney", "stable diffusion", "flux", "photoshop"],
  Codex: ["codex", "代码助手", "编程助手", "code agent", "coding agent"],
  Agent: ["agent", "智能体", "agents", "workflow", "自动化", "mcp"],
  OpenAI: ["openai", "chatgpt", "gpt", "sam altman"],
  Claude: ["claude", "anthropic"],
  Gemini: ["gemini", "google deepmind", "google"],
  "求职 / 职业趋势": ["招聘", "求职", "岗位", "职业", "裁员", "人才", "就业", "career", "job"]
};

const CATEGORY_LABELS = {
  "ai-models": "模型发布",
  "ai-products": "产品发布",
  industry: "行业动态",
  paper: "论文研究",
  tip: "技巧观点"
};

const SAMPLE_ITEMS = [
  {
    id: "sample-agent-router",
    title: "Wayfinder Router：在本地和托管大模型之间进行查询路由",
    summary: "示例数据：一个本地路由工具，可根据提示词结构选择本地或云端模型，适合关注 Agent、成本控制和自动化工作流的人。",
    source: "AI HOT 示例缓存",
    publishedAt: new Date().toISOString(),
    category: "ai-products",
    url: "https://aihot.virxact.com",
    permalink: "https://aihot.virxact.com",
    score: 75,
    selected: true
  }
];

const state = {
  items: [],
  activeFilter: "all",
  usingFallback: false
};

const cardsEl = document.querySelector("#cards");
const template = document.querySelector("#cardTemplate");
const countText = document.querySelector("#countText");
const cacheText = document.querySelector("#cacheText");
const updatedText = document.querySelector("#updatedText");
const corsNotice = document.querySelector("#corsNotice");
const emptyState = document.querySelector("#emptyState");
const refreshButton = document.querySelector("#refreshButton");

document.addEventListener("DOMContentLoaded", () => {
  setupFilters();
  refreshButton.addEventListener("click", () => loadData({ force: true }));
  loadData();
});

async function loadData({ force = false } = {}) {
  setStatus("读取中");
  hideNotice();

  const cachedItems = readCache();
  if (cachedItems.length && !force) {
    state.items = cachedItems;
    state.usingFallback = false;
    setStatus("本地缓存");
    render();
  }

  try {
    const freshItems = await fetchAihotItems();
    state.items = normalizeItems(freshItems);
    state.usingFallback = false;
    writeCache(state.items);
    setStatus("已更新");
    render();
  } catch (error) {
    const cached = cachedItems.length ? cachedItems : readCache();
    if (cached.length) {
      state.items = cached;
      state.usingFallback = true;
      setStatus("离线缓存");
      showCorsNotice(error, "已显示最近一次缓存的数据。");
      render();
      return;
    }

    state.items = normalizeItems(SAMPLE_ITEMS);
    state.usingFallback = true;
    setStatus("示例数据");
    showCorsNotice(error, "当前没有可用缓存，先显示一条示例数据。");
    render();
  }
}

async function fetchAihotItems() {
  const since = new Date(Date.now() - MAX_CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(API_BASE);
  url.searchParams.set("mode", "selected");
  url.searchParams.set("since", since);
  url.searchParams.set("take", "100");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`公开接口返回异常：${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

function normalizeItems(items) {
  const cutoff = Date.now() - MAX_CACHE_DAYS * 24 * 60 * 60 * 1000;
  return items
    .map((item) => {
      const text = itemText(item);
      const tags = detectTags(text);
      return {
        id: item.id || item.url || makeId(item),
        title: item.title || item.title_en || "未命名资讯",
        summary: item.summary || "暂无摘要，请打开原文查看。",
        source: item.source || "未知来源",
        publishedAt: item.publishedAt || new Date().toISOString(),
        category: item.category || "industry",
        url: item.url || item.permalink || "https://aihot.virxact.com",
        permalink: item.permalink || item.url || "https://aihot.virxact.com",
        score: Number(item.score || 0),
        selected: Boolean(item.selected),
        tags,
        usefulness: usefulnessLevel(text, item.score || 0, tags)
      };
    })
    .filter((item) => {
      const time = Date.parse(item.publishedAt);
      return Number.isNaN(time) || time >= cutoff;
    })
    .sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
}

function itemText(item) {
  return [item.title, item.title_en, item.summary, item.source, item.category].join(" ").toLowerCase();
}

function detectTags(text) {
  return Object.entries(FILTERS)
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword.toLowerCase())))
    .map(([label]) => label);
}

function usefulnessLevel(text, score, tags) {
  const highSignals = ["openai", "claude", "anthropic", "codex", "agent", "智能体", "视频生成", "aigc"];
  const mediumSignals = ["gemini", "图像生成", "模型", "产品", "求职", "岗位", "职业"];
  if (Number(score) >= 80 || highSignals.some((keyword) => text.includes(keyword)) || tags.includes("Codex")) {
    return "高";
  }
  if (Number(score) >= 60 || mediumSignals.some((keyword) => text.includes(keyword)) || tags.length >= 1) {
    return "中";
  }
  return "低";
}

function setupFilters() {
  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.activeFilter = button.dataset.filter;
      render();
    });
  });
}

function render() {
  const filtered = filteredItems();
  countText.textContent = String(filtered.length);
  updatedText.textContent = buildUpdatedText();
  cardsEl.innerHTML = "";

  filtered.forEach((item) => cardsEl.appendChild(renderCard(item)));
  emptyState.classList.toggle("hidden", filtered.length > 0);
}

function filteredItems() {
  if (state.activeFilter === "all") {
    return state.items;
  }
  return state.items.filter((item) => item.tags.includes(state.activeFilter));
}

function renderCard(item) {
  const node = template.content.cloneNode(true);
  node.querySelector("h3").textContent = item.title;
  node.querySelector(".summary").textContent = clampText(item.summary, 150);
  node.querySelector(".category").textContent = CATEGORY_LABELS[item.category] || "行业动态";
  node.querySelector(".time").textContent = formatTime(item.publishedAt);
  node.querySelector(".source").textContent = `来源：${item.source}`;

  const usefulness = node.querySelector(".usefulness");
  usefulness.textContent = `对我是否有用：${item.usefulness}`;
  usefulness.classList.add(item.usefulness === "高" ? "high" : item.usefulness === "中" ? "medium" : "low");

  const tagRow = node.querySelector(".tag-row");
  const tags = item.tags.length ? item.tags : ["未命中重点标签"];
  tags.slice(0, 4).forEach((tag) => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag";
    tagEl.textContent = tag;
    tagRow.appendChild(tagEl);
  });

  const link = node.querySelector(".source-link");
  link.href = item.url;
  link.textContent = "查看原文";
  return node;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return normalizeItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeCache(items) {
  const freshItems = normalizeItems(items);
  localStorage.setItem(CACHE_KEY, JSON.stringify(freshItems));
  localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
}

function setStatus(text) {
  cacheText.textContent = text;
}

function buildUpdatedText() {
  const updatedAt = localStorage.getItem(CACHE_TIME_KEY);
  if (state.usingFallback && state.items.length) {
    return "当前使用缓存或示例数据。";
  }
  if (!updatedAt) {
    return "数据来自公开接口。";
  }
  return `上次更新：${formatTime(updatedAt)}`;
}

function showCorsNotice(error, fallbackText) {
  corsNotice.classList.remove("hidden");
  corsNotice.textContent =
    `数据源读取失败。常见原因是 CORS（跨域限制）：浏览器不允许这个网页直接读取公开接口。${fallbackText} 备用方案：部署一个很小的后端代理，或用定时脚本把接口数据保存成本项目里的 data.json。原始错误：${error.message}`;
}

function hideNotice() {
  corsNotice.classList.add("hidden");
  corsNotice.textContent = "";
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours >= 0 && diffHours < 1) return "刚刚";
  if (diffHours < 24) return `${diffHours} 小时前`;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function clampText(text, length) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= length) return normalized;
  return `${normalized.slice(0, length).replace(/[，。；、\s]+$/, "")}。`;
}

function makeId(item) {
  const text = [item.title, item.url, item.publishedAt].join("|");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return `local-${hash.toString(16)}`;
}
