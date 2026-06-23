<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { api, setAuthToken } from '../api';

const emit = defineEmits<{
  loginSuccess: [token: string, username: string];
}>();

const username = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');
const showPassword = ref(false);

async function handleLogin() {
  error.value = '';
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码';
    return;
  }
  busy.value = true;
  try {
    const result = await api.login(username.value, password.value);
    setAuthToken(result.token);
    emit('loginSuccess', result.token, result.username);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败';
  } finally {
    busy.value = false;
  }
}

/* ── Streaming subtitle typewriter ── */
const loginSubtitle = ref('');
const fullLoginSubtitle = '智慧公交 · 数据驱动决策';
const subIdx = ref(0);
let subTimer = 0;

onMounted(() => {
  subTimer = window.setInterval(() => {
    if (subIdx.value < fullLoginSubtitle.length) {
      subIdx.value += 1;
      loginSubtitle.value = fullLoginSubtitle.slice(0, subIdx.value);
    } else {
      window.clearInterval(subTimer);
    }
  }, 50);
});

onUnmounted(() => {
  window.clearInterval(subTimer);
});
</script>

<template>
  <div class="login-overlay">
    <div class="login-glow login-glow-one"></div>
    <div class="login-glow login-glow-two"></div>

    <main class="login-shell">
      <section class="login-visual" aria-label="昆明智慧公交数据平台">
        <div class="visual-grid"></div>
        <svg class="network-map" viewBox="0 0 720 720" aria-hidden="true">
          <defs>
            <linearGradient id="routePrimary" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#7dd3fc" />
              <stop offset="1" stop-color="#818cf8" />
            </linearGradient>
            <linearGradient id="routeWarm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#34d399" />
              <stop offset="1" stop-color="#fbbf24" />
            </linearGradient>
          </defs>
          <path class="city-line muted" d="M-30 142 C130 204 202 82 354 142 S580 246 758 126" />
          <path class="city-line muted" d="M42 628 C146 488 208 560 308 432 S520 264 750 314" />
          <path class="city-line main" d="M-20 510 C124 468 138 316 270 330 S390 502 502 444 S570 230 748 196" />
          <path class="city-line warm" d="M68 80 C182 170 136 290 250 374 S476 318 544 422 S610 588 734 646" />
          <g class="network-stations">
            <circle cx="84" cy="482" r="7" /><circle cx="178" cy="402" r="7" />
            <circle cx="270" cy="330" r="10" class="hub" /><circle cx="374" cy="432" r="7" />
            <circle cx="502" cy="444" r="10" class="hub" /><circle cx="566" cy="344" r="7" />
            <circle cx="648" cy="240" r="7" /><circle cx="164" cy="226" r="7" class="warm-dot" />
            <circle cx="250" cy="374" r="7" class="warm-dot" /><circle cx="544" cy="422" r="7" class="warm-dot" />
            <circle cx="630" cy="560" r="10" class="hub warm-dot" />
          </g>
        </svg>

        <div class="visual-content">
          <div class="login-brand login-brand-inverse">
            <span class="login-brand-mark">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17V7.8A2.8 2.8 0 0 1 7.8 5h8.4A2.8 2.8 0 0 1 19 7.8V17M7 17h10M8 9h8M8 13h8M7 19v-2m10 2v-2" /></svg>
            </span>
            <div>
              <strong>昆明公交旅游路线</strong>
              <small>KUNMING SMART TRANSIT</small>
            </div>
          </div>

          <div class="visual-copy">
            <span class="visual-kicker"><i></i> 城市交通数据中枢</span>
            <h1>让每一条路线<br />都清晰可见</h1>
            <p><span class="streaming-text">{{ loginSubtitle }}</span></p>
          </div>

          <div class="system-pulse">
            <div><span class="pulse-dot"></span><strong>系统运行正常</strong></div>
            <span>数据链路已加密</span>
            <span>实时采集在线</span>
          </div>
        </div>
      </section>

      <section class="login-card">
        <div class="mobile-brand login-brand">
          <span class="login-brand-mark">KM</span>
          <div><strong>昆明公交旅游路线</strong><small>数据管理平台</small></div>
        </div>

        <div class="login-heading">
          <span>ADMIN PORTAL</span>
          <h2>欢迎回来</h2>
          <p>请使用管理员账户登录数据管理平台</p>
        </div>

        <form @submit.prevent="handleLogin">
          <label for="admin-username">用户名</label>
          <div class="input-shell">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></svg>
            <input id="admin-username" v-model="username" type="text" placeholder="请输入管理员用户名"
              autocomplete="username" :disabled="busy" autofocus />
          </div>

          <label for="admin-password">密码</label>
          <div class="input-shell password-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v11H5V10Zm7 4v3" /></svg>
            <input
              id="admin-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
              :disabled="busy"
            />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
          </div>

        <p v-if="error" class="login-error" role="alert">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3v.01M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /></svg>
          {{ error }}
        </p>
        <button class="primary-btn login-submit" :disabled="busy">
          <span>{{ busy ? '正在验证...' : '进入管理平台' }}</span>
          <svg v-if="!busy" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </form>

        <div class="login-security">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4" /></svg>
          <span>安全登录 · 传输数据受加密保护</span>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.login-overlay {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: clamp(20px, 4vw, 56px);
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.86), rgba(241,245,249,0.68)),
    var(--bg-base, #f1f5f9);
}
.login-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: .34;
  background-image: radial-gradient(rgba(100,116,139,.32) .7px, transparent .7px);
  background-size: 22px 22px;
  mask-image: linear-gradient(to bottom, #000, transparent 72%);
}
.login-glow { position: absolute; border-radius: 50%; filter: blur(2px); pointer-events: none; }
.login-glow-one { width: 520px; height: 520px; left: -180px; top: -220px; background: rgba(59,130,246,.10); }
.login-glow-two { width: 460px; height: 460px; right: -160px; bottom: -220px; background: rgba(99,102,241,.10); }
.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(390px, .82fr);
  width: 100%;
  max-width: 1120px;
  min-height: min(720px, calc(100vh - 80px));
  overflow: hidden;
  border: 1px solid rgba(148,163,184,.24);
  border-radius: 30px;
  background: var(--bg-elevated, #fff);
  box-shadow: 0 34px 90px rgba(15,23,42,.14), 0 4px 14px rgba(15,23,42,.05);
}
.login-visual {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 48px;
  color: white;
  background:
    radial-gradient(circle at 75% 24%, rgba(56,189,248,.26), transparent 30%),
    linear-gradient(145deg, #0b1932 0%, #122b52 54%, #172554 100%);
}
.visual-grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: .2;
  background-image: linear-gradient(rgba(125,211,252,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,.16) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at center, black, transparent 76%);
}
.network-map { position: absolute; inset: 3% -9% auto auto; z-index: -1; width: 105%; height: 94%; opacity: .72; }
.city-line { fill: none; stroke-linecap: round; stroke-width: 3; }
.city-line.muted { stroke: rgba(148,163,184,.13); stroke-width: 20; }
.city-line.main { stroke: url(#routePrimary); filter: drop-shadow(0 0 9px rgba(56,189,248,.42)); }
.city-line.warm { stroke: url(#routeWarm); stroke-width: 2.5; opacity: .74; }
.network-stations circle { fill: #e0f2fe; stroke: rgba(14,165,233,.36); stroke-width: 9; }
.network-stations .hub { fill: #fff; stroke-width: 14; filter: drop-shadow(0 0 8px #38bdf8); }
.network-stations .warm-dot { stroke: rgba(52,211,153,.32); }
.visual-content { display: flex; flex-direction: column; height: 100%; }
.login-brand {
  display: flex;
  align-items: center;
  gap: 13px;
}
.login-brand-mark {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  background: var(--accent-gradient);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  border-radius: 13px;
  box-shadow: 0 8px 24px rgba(59,130,246,.3);
}
.login-brand-mark svg { width: 25px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.login-brand strong { display: block; color: var(--foreground); font-size: 15px; font-weight: 700; }
.login-brand small { display: block; margin-top: 2px; color: var(--foreground-muted); font-size: 10px; letter-spacing: .12em; }
.login-brand-inverse strong { color: #fff; }
.login-brand-inverse small { color: rgba(224,242,254,.55); }
.login-brand-inverse .login-brand-mark { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); box-shadow: inset 0 1px 0 rgba(255,255,255,.12); }
.visual-copy { margin-top: auto; margin-bottom: auto; padding-bottom: 20px; }
.visual-kicker { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 20px; color: #bae6fd; font-size: 12px; font-weight: 600; letter-spacing: .12em; }
.visual-kicker i { width: 25px; height: 1px; background: #38bdf8; box-shadow: 0 0 8px #38bdf8; }
.visual-copy h1 { margin: 0; color: #fff; font-size: clamp(40px, 4vw, 58px); line-height: 1.15; letter-spacing: -.055em; text-shadow: 0 8px 40px rgba(2,6,23,.3); }
.visual-copy p { min-height: 24px; margin: 22px 0 0; color: rgba(224,242,254,.68); font-size: 15px; letter-spacing: .04em; }
.system-pulse { display: flex; flex-wrap: wrap; gap: 10px 18px; padding-top: 20px; border-top: 1px solid rgba(186,230,253,.13); color: rgba(224,242,254,.46); font-size: 10px; letter-spacing: .06em; }
.system-pulse div { display: flex; align-items: center; gap: 8px; margin-right: auto; color: #dbeafe; }
.system-pulse strong { font-size: 11px; font-weight: 600; }
.pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 5px rgba(52,211,153,.1), 0 0 12px #34d399; animation: statusPulse 2s ease-in-out infinite; }
.login-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(42px, 5vw, 72px);
  background: var(--bg-elevated, #fff);
}
.mobile-brand { display: none; }
.login-heading { margin-bottom: 34px; }
.login-heading > span { color: var(--accent, #3b82f6); font-size: 10px; font-weight: 800; letter-spacing: .18em; }
.login-heading h2 { margin: 10px 0 8px; color: var(--foreground); font-size: 30px; font-weight: 750; letter-spacing: -.04em; }
.login-heading p { margin: 0; color: var(--foreground-muted); font-size: 13px; }
.login-card label {
  display: block;
  margin: 0 0 8px;
  color: var(--foreground);
  font-size: 12px;
  font-weight: 650;
}
.input-shell {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 20px;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  background: var(--surface);
  transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
}
.input-shell:focus-within { border-color: var(--accent); background: var(--bg-elevated); box-shadow: 0 0 0 4px var(--accent-soft); }
.input-shell > svg { flex: 0 0 auto; width: 18px; margin-left: 15px; fill: none; stroke: var(--foreground-muted); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.input-shell:focus-within > svg { stroke: var(--accent); }
.login-card input {
  min-width: 0;
  width: 100%;
  padding: 14px 14px 14px 11px;
  font-size: 14px;
  background: transparent;
  border: 0;
  color: var(--foreground);
  outline: none;
}
.login-card input::placeholder { color: #94a3b8; }
.password-toggle {
  flex: 0 0 auto;
  margin-right: 8px;
  padding: 6px 9px;
  background: none;
  border: none;
  color: var(--foreground-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
}
.password-toggle:hover {
  background: var(--surface-hover);
}
.login-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: -6px 0 14px;
  padding: 10px 12px;
  border: 1px solid rgba(239,68,68,.18);
  border-radius: 10px;
  background: rgba(239,68,68,.06);
  color: #ef4444;
  font-size: 12px;
}
.login-error svg { width: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.login-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 50px;
  margin-top: 5px;
  border: 0;
  background: var(--accent-gradient);
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-btn-primary);
  transition: all 0.25s var(--ease-expo);
}
.login-submit svg { width: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform .2s ease; }
.login-submit:hover:not(:disabled) {
  box-shadow: var(--shadow-btn-primary-hover), 0 0 30px rgba(59,130,246,0.25);
  transform: translateY(-2px);
}
.login-submit:hover:not(:disabled) svg { transform: translateX(3px); }
.login-submit:disabled { opacity: .62; cursor: wait; }
.login-security { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 24px; color: var(--foreground-muted); font-size: 10px; }
.login-security svg { width: 14px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
:global([data-theme="dark"]) .login-overlay { background: radial-gradient(circle at 50% 20%, rgba(30,64,175,.12), transparent 45%), #050914; }
:global([data-theme="dark"]) .login-shell { border-color: rgba(148,163,184,.13); box-shadow: 0 34px 100px rgba(0,0,0,.42); }
:global([data-theme="dark"]) .login-card { background: #0c1424; }
:global([data-theme="dark"]) .input-shell { background: rgba(15,23,42,.72); }
:global([data-theme="dark"]) .input-shell:focus-within { background: rgba(15,23,42,.96); }
@keyframes statusPulse { 50% { opacity: .55; transform: scale(.86); } }
@media (max-width: 860px) {
  .login-overlay { padding: 18px; }
  .login-shell { display: block; max-width: 480px; min-height: 0; border-radius: 24px; }
  .login-visual { display: none; }
  .login-card { padding: 42px 32px 34px; }
  .mobile-brand { display: flex; margin-bottom: 42px; }
}
@media (max-width: 480px) {
  .login-overlay { align-items: stretch; padding: 0; }
  .login-shell { min-height: 100vh; border: 0; border-radius: 0; }
  .login-card { min-height: 100vh; padding: 34px 24px; }
}
@media (prefers-reduced-motion: reduce) {
  .pulse-dot { animation: none; }
  .login-submit { transition: none; }
}
</style>
