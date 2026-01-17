import { useEffect, useState } from 'react';

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
};

type ToastActionElement = React.ReactElement;

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: ToastActionElement;
  duration?: number;
};

interface ToasterToast extends Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: ToastActionElement;
}

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000;

type ToasterState = {
  toasts: ToasterToast[];
};

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const;

let count = 0;

function generateId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type Action =
  | {
      type: typeof actionTypes.ADD_TOAST;
      toast: ToasterToast;
    }
  | {
      type: typeof actionTypes.UPDATE_TOAST;
      toast: Partial<ToasterToast>;
    }
  | {
      type: typeof actionTypes.DISMISS_TOAST;
      toastId?: string;
    }
  | {
      type: typeof actionTypes.REMOVE_TOAST;
      toastId?: string;
    };

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function useToast() {
  const [state, setState] = useState<ToasterState>({
    toasts: [],
  });

  function toast(props: ToastProps) {
    const id = generateId();

    const update = (props: ToastProps) => {
      setState(prevState => ({
        ...prevState,
        toasts: prevState.toasts.map(t => (t.id === id ? { ...t, ...props } : t)),
      }));
    };

    const dismiss = () => {
      setState(prevState => ({
        ...prevState,
        toasts: prevState.toasts.filter(t => t.id !== id),
      }));
    };

    setState(prevState => {
      const newToast = {
        id,
        ...props,
        duration: props.duration || 5000, // Default duration
      };

      return {
        ...prevState,
        toasts: [...prevState.toasts, newToast].slice(-TOAST_LIMIT),
      };
    });

    // Auto-dismiss toast after duration
    if (props.duration !== Infinity) {
      const timeout = setTimeout(() => {
        dismiss();
      }, props.duration || 5000);

      toastTimeouts.set(id, timeout);
    }

    return {
      id,
      update,
      dismiss,
    };
  }

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      for (const timeout of toastTimeouts.values()) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return {
    toast,
    dismiss: (toastId?: string) => {
      setState(prevState => ({
        ...prevState,
        toasts: prevState.toasts.filter(t => t.id !== toastId),
      }));
    },
    toasts: state.toasts,
  };
}

export { useToast };
