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
    <div class="login-card">
      <div class="login-brand">
        <span class="login-brand-mark">KM</span>
        <div>
          <strong>昆明公交旅游路线</strong>
          <small>数据管理平台</small>
        </div>
      </div>
      <h2>管理员登录</h2>
      <p class="login-subtitle"><span class="streaming-text">{{ loginSubtitle }}</span></p>
      <form @submit.prevent="handleLogin">
        <label>
          用户名
          <input
            v-model="username"
            type="text"
            placeholder="请输入管理员用户名"
            autocomplete="username"
            :disabled="busy"
          />
        </label>
        <label>
          密码
          <div class="password-wrap">
            <input
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
        </label>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button class="primary-btn login-submit" :disabled="busy">
          {{ busy ? '登录中...' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.05), transparent 60%),
    radial-gradient(ellipse at 80% 70%, rgba(99,102,241,0.03), transparent 50%),
    var(--bg-base);
}
.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-elevated);
  border: none;
  border-radius: 24px;
  padding: 40px 36px;
  box-shadow: var(--shadow-elevated);
}
.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}
.login-brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--accent-gradient);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  border-radius: 14px;
  box-shadow: 0 0 24px var(--accent-glow);
}
.login-brand strong {
  display: block;
  font-size: 16px;
  color: var(--foreground);
}
.login-brand small {
  font-size: 12px;
  color: var(--foreground-muted);
}
.login-card h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 10px;
  letter-spacing: -0.02em;
}
.login-subtitle {
  text-align: center;
  font-size: 14px;
  color: var(--foreground-muted);
  margin-bottom: 24px;
  min-height: 1.5em;
}
.login-card label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--foreground-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 14px;
}
.login-card input {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 12px 16px;
  font-size: 14px;
  background: var(--surface);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  color: var(--foreground);
  outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.login-card input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.password-wrap {
  position: relative;
}
.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
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
  color: #ef4444;
  font-size: 13px;
  margin-bottom: 12px;
}
.login-submit {
  width: 100%;
  padding: 13px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 4px;
  background: var(--accent-gradient);
  border-radius: 12px;
  box-shadow: var(--shadow-btn-primary);
  transition: all 0.25s var(--ease-expo);
}
.login-submit:hover:not(:disabled) {
  box-shadow: var(--shadow-btn-primary-hover), 0 0 30px rgba(59,130,246,0.25);
  transform: translateY(-2px);
}
</style>
