import { createContext, useContext, useState } from "react";
import { authLogin, authRegister } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("ff_token"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ff_user"));
    } catch {
      return null;
    }
  });

  function persist(data) {
    localStorage.setItem("ff_token", data.token);
    localStorage.setItem("ff_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  async function register(payload) {
    const data = await authRegister(payload);
    persist(data);
  }

  async function login(payload) {
    const data = await authLogin(payload);
    persist(data);
  }

  function logout() {
    localStorage.removeItem("ff_token");
    localStorage.removeItem("ff_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
