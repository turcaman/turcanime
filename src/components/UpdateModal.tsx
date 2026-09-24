import { ACCENT_COLOR } from "@/config/source";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useUpdateStore, grantInstallPermissionAndDownload } from "@/stores/updateStore";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

function formatSize(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export function UpdateModal() {
  const phase = useUpdateStore((s) => s.phase);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const progress = useUpdateStore((s) => s.progress);
  const errorMessage = useUpdateStore((s) => s.errorMessage);
  const closeUpdate = useUpdateStore((s) => s.closeUpdate);
  const confirmUpdate = useUpdateStore((s) => s.confirmUpdate);
  const beginDownload = useUpdateStore((s) => s.beginDownload);
  const cancelDownload = useUpdateStore((s) => s.cancelDownload);
  const resumeAfterPermission = useUpdateStore((s) => s.resumeAfterPermission);
  const insets = useSafeAreaInsets();

  // After granting permission in system settings, resume automatically.
  // resumeAfterPermission is armed only when the settings screen is actually
  // opened, so an unrelated app switch while this modal is up never starts a
  // download without permission
  const resumeOnReturn = useRef(false);
  useEffect(() => {
    resumeOnReturn.current = resumeAfterPermission;
    if (!resumeAfterPermission) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !resumeOnReturn.current) return;
      resumeOnReturn.current = false;
      useUpdateStore.setState({ resumeAfterPermission: false });
      void beginDownload();
    });
    return () => sub.remove();
  }, [resumeAfterPermission, beginDownload]);

  if (phase === "idle" || phase === "ready") return null;

  // Download and install are not dismissable from the backdrop or the X
  const canDismiss = phase === "confirm" || phase === "permission" || phase === "error";
  const onClose = () => {
    if (canDismiss) closeUpdate();
  };

  let body: React.ReactNode = null;
  let actions: React.ReactNode = null;

  if (phase === "confirm") {
    body = (
      <Text className="text-neutral-400 text-sm leading-5">
        {`Versión ${updateAvailable} disponible.`}
      </Text>
    );
    actions = (
      <View className="flex-row">
        <AnimatedPressable onPress={onClose} className="flex-1 py-4 items-center">
          <Text className="text-sm text-neutral-300">Cancelar</Text>
        </AnimatedPressable>
        <View className="w-px bg-neutral-800" />
        <AnimatedPressable onPress={() => void confirmUpdate()} className="flex-1 py-4 items-center">
          <Text className="text-sm text-purple-400 font-medium">Actualizar</Text>
        </AnimatedPressable>
      </View>
    );
  } else if (phase === "permission") {
    body = (
      <>
        <Text className="text-neutral-400 text-sm leading-5">
          Para instalar actualizaciones, permití que Turcanime instale aplicaciones en los ajustes del sistema.
        </Text>
        <Text className="text-neutral-500 text-xs mt-2">
          Al volver, la descarga continúa sola.
        </Text>
      </>
    );
    actions = (
      <View className="flex-row">
        <AnimatedPressable onPress={onClose} className="flex-1 py-4 items-center">
          <Text className="text-sm text-neutral-300">Cancelar</Text>
        </AnimatedPressable>
        <View className="w-px bg-neutral-800" />
        <AnimatedPressable
          onPress={() => void grantInstallPermissionAndDownload()}
          className="flex-1 py-4 items-center"
        >
          <Text className="text-sm text-purple-400 font-medium">Abrir ajustes</Text>
        </AnimatedPressable>
      </View>
    );
  } else if (phase === "downloading") {
    const pct =
      progress.totalBytes != null && progress.totalBytes > 0
        ? Math.min(1, progress.receivedBytes / progress.totalBytes)
        : null;
    body = (
      <>
        <View className="h-1 bg-neutral-800 rounded-full overflow-hidden mt-1">
          <View
            className="h-full"
            style={{ width: `${(pct ?? 0.03) * 100}%`, backgroundColor: ACCENT_COLOR }}
          />
        </View>
        <Text className="text-neutral-500 text-xs mt-2">
          {pct != null
            ? `${Math.round(pct * 100)}% · ${formatSize(progress.receivedBytes)}`
            : `${formatSize(progress.receivedBytes)} descargados`}
        </Text>
      </>
    );
    actions = (
      <AnimatedPressable onPress={cancelDownload} className="py-4 items-center">
        <Text className="text-sm text-neutral-300">Cancelar</Text>
      </AnimatedPressable>
    );
  } else if (phase === "installing") {
    body = (
      <Text className="text-neutral-400 text-sm leading-5">Abriendo el instalador del sistema…</Text>
    );
  } else {
    body = (
      <Text className="text-neutral-400 text-sm leading-5" numberOfLines={4}>
        {errorMessage ?? "Ocurrió un error inesperado."}
      </Text>
    );
    actions = (
      <View className="flex-row">
        <AnimatedPressable onPress={onClose} className="flex-1 py-4 items-center">
          <Text className="text-sm text-neutral-300">Cerrar</Text>
        </AnimatedPressable>
        <View className="w-px bg-neutral-800" />
        <AnimatedPressable onPress={() => void beginDownload()} className="flex-1 py-4 items-center">
          <Text className="text-sm text-purple-400 font-medium">Reintentar</Text>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      className="absolute inset-0 bg-black/80 justify-end"
      style={{ elevation: 50 }}
    >
      <Pressable className="absolute inset-0" onPress={onClose} disabled={!canDismiss} />
      <View className="bg-neutral-900 rounded-t-xl px-5 pt-5" style={{ paddingBottom: insets.bottom + (actions != null ? 0 : 20) }}>
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white text-xl font-bold">
            {phase === "confirm" && "Actualizar"}
            {phase === "permission" && "Permiso necesario"}
            {phase === "downloading" && "Descargando"}
            {phase === "installing" && "Preparando instalación"}
            {phase === "error" && "No se pudo actualizar"}
          </Text>
          {canDismiss && (
            <Feather name="x" size={20} color="#a3a3a3" onPress={onClose} />
          )}
        </View>
        {body}
        {actions != null ? (
          <View className="mt-5 -mx-5 border-t border-neutral-800">
            {actions}
          </View>
        ) : (
          <View className="h-5" />
        )}
      </View>
    </Animated.View>
  );
}
