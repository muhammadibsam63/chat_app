import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface LiveEvent {
  id: string;
  event: string;
  label: string;
  at: number;
}

interface RealtimeValue {
  connected: boolean;
  pulse: number;
  events: LiveEvent[];
  dismiss: (id: string) => void;
}

const RealtimeContext = createContext<RealtimeValue>({
  connected: false,
  pulse: 0,
  events: [],
  dismiss: () => undefined,
});

const LABELS: Record<string, string> = {
  'contact:new': 'New contact message received',
  'contact:updated': 'Contact message updated',
  'notification:new': 'New notification',
  'project:created': 'Project created',
  'project:updated': 'Project updated',
  'project:deleted': 'Project deleted',
  'media:created': 'Media asset uploaded',
  'media:deleted': 'Media asset deleted',
  'settings:updated': 'Site settings updated',
  'resume:updated': 'Resume updated',
  'admin:presence': 'Admin presence changed',
};

const EVENTS = Object.keys(LABELS);

/**
 * Authenticated Socket.IO connection for the console. The session cookie is
 * validated server-side on the handshake; the client only reacts to events.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: string) => {
    setEvents((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const socket = io({ withCredentials: true, transports: ['websocket', 'polling'] });

    const push = (event: string) => {
      const item: LiveEvent = {
        id: `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        event,
        label: LABELS[event] ?? event,
        at: Date.now(),
      };
      setEvents((current) => [item, ...current].slice(0, 4));
      setPulse((value) => value + 1);
      const timer = window.setTimeout(() => {
        setEvents((current) => current.filter((entry) => entry.id !== item.id));
      }, 7000);
      timers.current.push(timer);
    };

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    const handlers = EVENTS.map((event) => {
      const handler = () => push(event);
      socket.on(event, handler);
      return { event, handler };
    });

    return () => {
      for (const entry of handlers) socket.off(entry.event, entry.handler);
      socket.disconnect();
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current = [];
    };
  }, [user]);

  return (
    <RealtimeContext.Provider value={{ connected, pulse, events, dismiss }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeValue {
  return useContext(RealtimeContext);
}
