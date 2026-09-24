import { create } from 'zustand';
import { User, Language } from '../lib/types';
import i18n from '../lib/i18n';

interface AuthState {
  user: User | null;
  token: string | null;
  language: Language;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
}

const savedUser = sessionStorage.getItem('floodops_user');
const savedToken = sessionStorage.getItem('floodops_token');
const savedLang = (localStorage.getItem('floodops_lang') as Language) || 'en';

export const useAuthStore = create<AuthState>((set) => ({
  user: savedUser ? JSON.parse(savedUser) : {
    id: 'u_citizen_demo',
    name: 'Kavya Nair (Demo)',
    role: 'public',
    district: 'Alappuzha',
    language: savedLang
  },
  token: savedToken || 'demo_token_citizen',
  language: savedLang,
  setAuth: (user, token) => {
    sessionStorage.setItem('floodops_user', JSON.stringify(user));
    sessionStorage.setItem('floodops_token', token);
    set({ user, token, language: user.language });
    i18n.changeLanguage(user.language);
  },
  logout: () => {
    sessionStorage.removeItem('floodops_user');
    sessionStorage.removeItem('floodops_token');
    set({ user: null, token: null });
  },
  setLanguage: (lang) => {
    localStorage.setItem('floodops_lang', lang);
    i18n.changeLanguage(lang);
    set((state) => ({
      language: lang,
      user: state.user ? { ...state.user, language: lang } : null
    }));
  }
}));
