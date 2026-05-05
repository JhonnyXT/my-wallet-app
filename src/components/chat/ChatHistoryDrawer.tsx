import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import Animated from "react-native-reanimated";
import type { AnimatedStyle } from "react-native-reanimated";
import type { ViewStyle } from "react-native";
import { X, Plus, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import type { ChatSessionRow } from "@/src/db/chatDb";
import type { ChatGroupedItem } from "@/src/types/chat";
import { DRAWER_W, BLUE_CHAT } from "@/src/components/chat/chatConstants";
import { formatTime } from "@/src/utils/chatHelpers";

// ─── Estilos dinámicos ────────────────────────────────────────────────────────

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.28)",
    },
    panel: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: DRAWER_W,
      backgroundColor: t.surface,
      paddingHorizontal: 22,
      shadowColor: "#000",
      shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 20,
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    panelTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: t.text,
      letterSpacing: 2.5,
      textTransform: "uppercase",
    },
    groupLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: t.textSub,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 6,
      marginTop: 12,
    },
    sessionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
      marginBottom: 2,
    },
    sessionRowActive: { backgroundColor: t.inputBg },
    sessionBody: { flex: 1 },
    sessionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: t.textSub,
      marginBottom: 2,
    },
    sessionTitleActive: { color: t.text, fontWeight: "700" },
    sessionTitleInput: {
      fontSize: 14,
      fontWeight: "600",
      color: t.text,
      borderBottomWidth: 1.5,
      borderBottomColor: BLUE_CHAT,
      paddingVertical: 2,
      marginBottom: 2,
    },
    sessionTime: { fontSize: 11, color: t.textSub, fontWeight: "500" },
    deleteBtn: {
      padding: 6,
      marginLeft: 8,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    emptyText: {
      fontSize: 13,
      color: t.textSub,
      textAlign: "center",
      lineHeight: 20,
    },
    newChatBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: t.text,
      borderRadius: 999,
      paddingVertical: 16,
      marginTop: 12,
    },
    newChatText: {
      fontSize: 14,
      fontWeight: "700",
      color: t.bg,
      letterSpacing: 0.2,
    },
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  sessions: ChatSessionRow[];
  activeSessionId: number | null;
  insetsTop: number;
  insetsBottom: number;
  drawerStyle: AnimatedStyle<ViewStyle>;
  renamingId: number | null;
  renameText: string;
  onClose: () => void;
  onLoadSession: (id: number) => void;
  onNewChat: () => void;
  onDelete: (id: number) => void;
  onStartRename: (id: number, title: string) => void;
  onRenameTextChange: (text: string) => void;
  onCommitRename: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ChatHistoryDrawer({
  visible,
  sessions,
  activeSessionId,
  insetsTop,
  insetsBottom,
  drawerStyle,
  renamingId,
  renameText,
  onClose,
  onLoadSession,
  onNewChat,
  onDelete,
  onStartRename,
  onRenameTextChange,
  onCommitRename,
}: Props) {
  const theme = useTheme();
  const d = useMemo(() => buildStyles(theme), [theme]);

  // ── Construye lista agrupada por "HOY / AYER / ANTES" ────────────────────
  const drawerItems = useMemo<ChatGroupedItem[]>(() => {
    const items: ChatGroupedItem[] = [];
    const seen = new Set<string>();
    for (const session of sessions) {
      // Importamos getGroup inline para no crear dependencia circular
      const dt = new Date(session.updated_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      let group: string;
      if (dt.toDateString() === today.toDateString()) group = "HOY";
      else if (dt.toDateString() === yesterday.toDateString()) group = "AYER";
      else group = "ANTES";

      if (!seen.has(group)) {
        seen.add(group);
        items.push({ type: "header", label: group });
      }
      items.push({ type: "session", session });
    }
    return items;
  }, [sessions]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Fondo oscuro */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={d.backdrop} />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View
        style={[
          d.panel,
          {
            paddingTop: insetsTop + 20,
            paddingBottom: insetsBottom + 16,
          },
          drawerStyle,
        ]}
      >
        {/* Cabecera del panel */}
        <View style={d.panelHeader}>
          <Text style={d.panelTitle}>HISTORIAL</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={20} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Lista de sesiones */}
        {drawerItems.length === 0 ? (
          <View style={d.emptyWrap}>
            <Text style={d.emptyText}>
              Aún no hay conversaciones guardadas.{"\n"}Empieza una nueva
              para verla aquí.
            </Text>
          </View>
        ) : (
          <FlatList
            data={drawerItems}
            keyExtractor={(item, idx) =>
              item.type === "header"
                ? `hdr-${item.label}`
                : `s-${item.session.id}-${idx}`
            }
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            renderItem={({ item }) => {
              if (item.type === "header") {
                return <Text style={d.groupLabel}>{item.label}</Text>;
              }

              const { session } = item;
              const isActive = session.id === activeSessionId;
              const isRenaming = renamingId === session.id;

              return (
                <TouchableOpacity
                  onPress={() => onLoadSession(session.id)}
                  onLongPress={async () => {
                    await Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium
                    );
                    onStartRename(session.id, session.title);
                  }}
                  activeOpacity={0.7}
                  style={[d.sessionRow, isActive && d.sessionRowActive]}
                >
                  <View style={d.sessionBody}>
                    {isRenaming ? (
                      <TextInput
                        value={renameText}
                        onChangeText={onRenameTextChange}
                        onBlur={onCommitRename}
                        onSubmitEditing={onCommitRename}
                        autoFocus
                        returnKeyType="done"
                        style={d.sessionTitleInput}
                      />
                    ) : (
                      <Text
                        style={[
                          d.sessionTitle,
                          isActive && d.sessionTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {session.title}
                      </Text>
                    )}
                    <Text style={d.sessionTime}>
                      {formatTime(session.updated_at)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => onDelete(session.id)}
                    hitSlop={8}
                    style={d.deleteBtn}
                  >
                    <Trash2 size={14} color={theme.textSub} strokeWidth={1.8} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Nueva conversación */}
        <TouchableOpacity
          style={d.newChatBtn}
          onPress={onNewChat}
          activeOpacity={0.88}
        >
          <Plus size={16} color={theme.bg} strokeWidth={2.5} />
          <Text style={d.newChatText}>Nueva conversación</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}
