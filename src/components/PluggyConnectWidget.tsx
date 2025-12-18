import { useEffect, useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Link as LinkIcon, AlertCircle, RefreshCw } from 'lucide-react';
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

const PLUGGY_SDK_URL = 'https://cdn.pluggy.ai/pluggy-connect/v2.1.0/pluggy-connect.js';
const MAX_RETRIES = 3;

export function PluggyConnectWidget({ onSuccess, onError }: PluggyConnectWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const pluggyInstanceRef = useRef<any>(null);

  const loadScript = useCallback(() => {
    console.log('[PluggyConnect] Attempting to load SDK...');
    setScriptError(null);

    // Check if already loaded
    if (window.PluggyConnect) {
      console.log('[PluggyConnect] SDK already available in window');
      setIsScriptLoaded(true);
      return;
    }

    // Remove existing script if any
    const existingScript = document.getElementById('pluggy-connect-script');
    if (existingScript) {
      console.log('[PluggyConnect] Removing existing script');
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'pluggy-connect-script';
    script.src = PLUGGY_SDK_URL;
    script.async = true;
    
    script.onload = () => {
      console.log('[PluggyConnect] SDK script loaded successfully');
      // Small delay to ensure the SDK is fully initialized
      setTimeout(() => {
        if (window.PluggyConnect) {
          console.log('[PluggyConnect] PluggyConnect is available');
          setIsScriptLoaded(true);
          setScriptError(null);
        } else {
          console.error('[PluggyConnect] Script loaded but PluggyConnect not found');
          setScriptError('SDK carregado mas não inicializado');
        }
      }, 100);
    };
    
    script.onerror = (error) => {
      console.error('[PluggyConnect] Failed to load SDK:', error);
      setScriptError('Falha ao carregar o SDK do Pluggy');
      setIsScriptLoaded(false);
    };
    
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    loadScript();
    
    return () => {
      // Cleanup pluggy instance if exists
      if (pluggyInstanceRef.current) {
        try {
          pluggyInstanceRef.current.destroy?.();
        } catch (e) {
          console.log('[PluggyConnect] Cleanup error (non-critical):', e);
        }
      }
    };
  }, [loadScript]);

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      loadScript();
    } else {
      toast.error('Número máximo de tentativas atingido. Recarregue a página.');
    }
  };

  const openPluggyConnect = useCallback(async () => {
    console.log('[PluggyConnect] Button clicked, checking SDK status...');
    console.log('[PluggyConnect] isScriptLoaded:', isScriptLoaded);
    console.log('[PluggyConnect] window.PluggyConnect:', !!window.PluggyConnect);

    if (!isScriptLoaded || !window.PluggyConnect) {
      console.error('[PluggyConnect] SDK not ready');
      toast.error('Widget ainda não carregado. Clique em "Tentar novamente".');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[PluggyConnect] Getting auth session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('[PluggyConnect] No session found');
        toast.error('Você precisa estar logado');
        setIsLoading(false);
        return;
      }

      console.log('[PluggyConnect] Requesting connect token from Edge Function...');
      const response = await supabase.functions.invoke('pluggy', {
        body: { action: 'create_connect_token' },
      });

      console.log('[PluggyConnect] Edge Function response:', response);

      if (response.error) {
        console.error('[PluggyConnect] Edge Function error:', response.error);
        throw new Error(response.error.message || 'Erro ao obter token');
      }

      if (!response.data?.accessToken) {
        console.error('[PluggyConnect] No accessToken in response:', response.data);
        throw new Error('Token de acesso não recebido');
      }

      const { accessToken } = response.data;
      console.log('[PluggyConnect] Got access token, opening widget...');

      // Open Pluggy Connect Widget
      pluggyInstanceRef.current = new window.PluggyConnect({
        connectToken: accessToken,
        includeSandbox: true, // For testing - remove in production
        onSuccess: async (data: { item: { id: string } }) => {
          console.log('[PluggyConnect] Widget success:', data);
          toast.success('Banco conectado com sucesso!');
          onSuccess(data.item.id);
          setIsLoading(false);
        },
        onError: (error: Error) => {
          console.error('[PluggyConnect] Widget error:', error);
          toast.error('Erro ao conectar banco: ' + (error.message || 'Erro desconhecido'));
          onError?.(error);
          setIsLoading(false);
        },
        onClose: () => {
          console.log('[PluggyConnect] Widget closed');
          setIsLoading(false);
        },
        onEvent: (event: any) => {
          console.log('[PluggyConnect] Widget event:', event);
        },
      });

      pluggyInstanceRef.current.init();
      console.log('[PluggyConnect] Widget initialized');
    } catch (error) {
      console.error('[PluggyConnect] Error opening widget:', error);
      toast.error('Erro ao iniciar conexão: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      onError?.(error as Error);
      setIsLoading(false);
    }
  }, [isScriptLoaded, onSuccess, onError]);

  if (scriptError) {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={handleRetry}
          variant="outline"
          className="gap-2"
          disabled={retryCount >= MAX_RETRIES}
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
        <span className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {scriptError}
        </span>
      </div>
    );
  }

  return (
    <Button
      onClick={openPluggyConnect}
      disabled={isLoading || !isScriptLoaded}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : !isScriptLoaded ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LinkIcon className="h-4 w-4" />
      )}
      {isLoading ? 'Conectando...' : !isScriptLoaded ? 'Carregando...' : 'Conectar Banco'}
    </Button>
  );
}
