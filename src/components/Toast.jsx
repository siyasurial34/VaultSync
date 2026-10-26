import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [t, setT] = useState({ msg: '', kind: '', show: false });
  const timer = useRef(null);

  const toast = useCallback((msg, kind) => {
    setT({ msg: msg, kind: kind || '', show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT((prev) => ({ ...prev, show: false })), 2600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={'toast ' + (t.show ? 'show ' : '') + t.kind} role="status">{t.msg}</div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
