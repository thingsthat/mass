import { onMounted, ref, watch } from 'vue';

const STORAGE_KEY = 'theme';

type Theme = 'light' | 'dark';

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return null;
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function getInitialIsDark(): boolean {
  const stored = getStoredTheme();
  if (stored !== null) {
    return stored === 'dark';
  }
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return true;
  }
  return getSystemPrefersDark();
}

export function useThemeToggle() {
  const isDark = ref(getInitialIsDark());
  applyTheme(isDark.value ? 'dark' : 'light');

  function initTheme() {
    const stored = getStoredTheme();
    if (stored !== null) {
      isDark.value = stored === 'dark';
    } else {
      isDark.value = getSystemPrefersDark();
    }
    applyTheme(isDark.value ? 'dark' : 'light');
  }

  function toggleTheme() {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    isDark.value = !isDark.value;
    const theme: Theme = isDark.value ? 'dark' : 'light';
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('theme-switching');
      });
    });
  }

  watch(isDark, dark => {
    applyTheme(dark ? 'dark' : 'light');
  });

  onMounted(() => {
    initTheme();
  });

  return { isDark, toggleTheme };
}
