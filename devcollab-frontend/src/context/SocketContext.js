"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/api";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Get the JWT token from local storage
    const token = localStorage.getItem("devcollab_access_token");

    if (!token) return;

    // Remove /api/v1 from API_BASE_URL to get the root URL for socket connection
    const socketUrl = API_BASE_URL.replace("/api/v1", "");

    const newSocket = io(socketUrl, {
      auth: {
        token
      },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    newSocket.on("new_notification", ({ notification }) => {
      // Show toast
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, notification }]);

      // Auto dismiss after 5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [user]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
      
      {/* Live Toasts Container */}
      <div style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 9999,
        pointerEvents: "none"
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: "auto",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "12px 16px",
              minWidth: "300px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.25)",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              animation: "slideInRight 0.3s ease-out forwards",
              color: "#f8fafc"
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#60a5fa", marginBottom: "4px" }}>
                {toast.notification.title}
              </div>
              <div style={{ fontSize: "14px", lineHeight: "1.4" }}>
                {toast.notification.message}
              </div>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "0",
                fontSize: "16px"
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </SocketContext.Provider>
  );
};
