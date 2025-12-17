import { useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PluggyConnectWidgetProps {
  onSuccess: (itemId: string) => void;
  onError?: (error: Error) => void;
}

declare global {
  interface Window {
    PluggyConnect: any;
  }
}

export function PluggyConnectWidget({ onSuccess, onError }: PluggyConnectWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Load Pluggy Connect SDK
    if (document.getElementById('pluggy-connect-script')) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'pluggy-connect-script';
    script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.0.2/pluggy-connect.js';
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Pluggy Connect SDK');
      toast.error('Erro ao carregar widget de conexão bancária');
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount to avoid reloading
    };
  }, []);

  const openPluggyConnect = useCallback(async () => {
    if (!isScriptLoaded || !window.PluggyConnect) {
      toast.error('Widget ainda não carregado, tente novamente');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado');
        return;
      }

      // Get connect token from Edge Function
      const response = await supabase.functions.invoke('pluggy', {
        body: { action: 'create_connect_token' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { accessToken } = response.data;

      // Open Pluggy Connect Widget
      const pluggyConnect = new window.PluggyConnect({
        connectToken: accessToken,
        includeSandbox: true, // For testing
        onSuccess: async (data: { item: { id: string } }) => {
          console.log('Pluggy Connect success:', data);
          toast.success('Banco conectado com sucesso!');
          onSuccess(data.item.id);
        },
        onError: (error: Error) => {
          console.error('Pluggy Connect error:', error);
          toast.error('Erro ao conectar banco');
          onError?.(error);
        },
        onClose: () => {
          console.log('Pluggy Connect closed');
          setIsLoading(false);
        },
      });

      pluggyConnect.init();
    } catch (error) {
      console.error('Error opening Pluggy Connect:', error);
      toast.error('Erro ao iniciar conexão bancária');
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [isScriptLoaded, onSuccess, onError]);

  return (
    <Button
      onClick={openPluggyConnect}
      disabled={isLoading || !isScriptLoaded}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LinkIcon className="h-4 w-4" />
      )}
      {isLoading ? 'Conectando...' : 'Conectar Banco'}
    </Button>
  );
}
