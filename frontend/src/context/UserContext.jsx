import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "../api/settingsApi";
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);



const fetchUser = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const data = await getCurrentUser();
    setUser(data);

  } catch (err) {
    console.error("User fetch failed:", err);
    localStorage.removeItem("token");
    setUser(null);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, fetchUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);