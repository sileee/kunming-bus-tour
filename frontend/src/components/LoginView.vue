<script setup lang="ts">
import { ref } from 'vue';
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
  background: radial-gradient(ellipse at 50% 30%, rgba(94,106,210,0.08), transparent 60%),
              radial-gradient(ellipse at 80% 70%, rgba(20,184,166,0.05), transparent 50%);
}
.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 16px 48px rgba(0,0,0,0.25);
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
  width: 44px;
  height: 44px;
  background: var(--color-accent);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  border-radius: 12px;
  box-shadow: 0 0 20px var(--color-accent-glow-weak);
}
.login-brand strong {
  display: block;
  font-size: 16px;
  color: var(--color-foreground);
}
.login-brand small {
  font-size: 12px;
  color: var(--color-muted);
}
.login-card h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 20px;
  letter-spacing: -0.02em;
}
.login-card label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 14px;
}
.login-card input {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 10px 14px;
  font-size: 14px;
  background: var(--color-elevated);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-foreground);
  outline: none;
  transition: border-color 0.2s ease;
}
.login-card input:focus {
  border-color: var(--color-accent);
}
.password-wrap {
  position: relative;
}
.password-toggle {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 10px;
}
.login-error {
  color: var(--color-danger);
  font-size: 13px;
  margin-bottom: 12px;
}
.login-submit {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 4px;
}
.login-hint {
  text-align: center;
  margin-top: 18px;
  font-size: 12px;
  color: var(--color-subtle);
  line-height: 1.6;
}
</style>
