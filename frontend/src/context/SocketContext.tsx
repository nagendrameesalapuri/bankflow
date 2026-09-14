import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getAccessToken } from '../services/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import type { Account, Notification, Transaction } from '../types/api';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    // An empty/unset VITE_SOCKET_URL (as used behind the nginx reverse proxy
    // in Docker) means "connect to the page's own origin".
    const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('notification:new', (notification: Notification) => {
      showToast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'WARNING' ? 'warning' : notification.type === 'SECURITY' ? 'error' : 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // Real-time sync: a transfer/payment made in one tab or device updates
    // every other open BankFlow session for the same user instantly.
    socket.on('account:updated', (account: Account) => {
      queryClient.setQueryData<Account[]>(['accounts'], (old) =>
        old ? old.map((a) => (a.id === account.id ? account : a)) : old,
      );
      queryClient.invalidateQueries({ queryKey: ['accounts', account.id] });
    });

    socket.on('transaction:created', (_transaction: Transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    });

    socketRef.current = socket;
    forceRender((n) => n + 1);

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  return <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
