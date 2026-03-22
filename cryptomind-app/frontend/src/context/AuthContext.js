import React, { createContext, useContext, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    try {
      const { data } = await authAPI.login({ email, password });
      return data;
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const { data } = await authAPI.verifyOTP(email, otp);
      if (data.success) {
        localStorage.setItem('cm_token', data.token);
        setUser(data.user);
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  };

  const register = async (formData) => {
    try {
      const { data } = await authAPI.register(formData);
      if (data.success) {
        localStorage.setItem('cm_token', data.token);
        setUser(data.user);
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  };

  const logout = () => {
    localStorage.removeItem('cm_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyOTP, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);