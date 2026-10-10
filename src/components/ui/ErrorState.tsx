import { ACCENT_COLOR, MUTED_ICON } from "@/config/source";
import type { AppError } from "@/types";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";

interface ErrorStateProps {
  onRetry: () => void;
  /** The real settled error; the subtitle explains its actual cause */
  error?: AppError | null;
  title?: string;
}

const SUBTITLES: Record<AppError["type"], string> = {
  NETWORK_ERROR: "No se pudo conectar con el sitio. Revisa tu conexión e inténtalo de nuevo.",
  AUTH_ERROR: "El sitio está verificando la conexión. Reintenta en unos segundos.",
  TIMEOUT: "El sitio tardó demasiado en responder. Inténtalo de nuevo en un momento.",
  VIDEO_ERROR: "El servidor de video no respondió. Inténtalo de nuevo en unos minutos.",
  PARSER_ERROR: "El sitio devolvió un contenido inesperado. Puede ser un cambio del sitio o un fallo temporal.",
  UNKNOWN: "El sitio está tardando más de lo normal en responder. Inténtalo de nuevo en un momento.",
};

export function ErrorState({ onRetry, error, title = "Error al cargar" }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center bg-black px-5">
      <Feather name="alert-circle" size={48} color={MUTED_ICON} />
      <Text className="mt-2 text-lg font-bold text-neutral-500">
        {title}
      </Text>
      <Text className="mt-2 max-w-[300px] text-center text-sm text-neutral-600">
        {SUBTITLES[error?.type ?? "UNKNOWN"]}
      </Text>
      <AnimatedPressable className="mt-4 flex-row items-center px-6 py-3 rounded-xl bg-purple-500/15" onPress={onRetry}>
        <Feather name="refresh-cw" size={16} color={ACCENT_COLOR} />
        <Text className="ml-2 text-xs font-semibold tracking-wide text-purple-500">
          Reintentar
        </Text>
      </AnimatedPressable>
    </View>
  );
}
